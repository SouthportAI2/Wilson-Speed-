import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Mic, Search, Square, RefreshCw, Clock, Bot, Database, Terminal, AlertTriangle, CheckCircle, Volume2, HardDrive, Zap, Repeat, Settings2, Activity, ChevronRight, Circle } from 'lucide-react';
import { askAssistant } from '../services/gemini';
import { getSupabaseClient } from '../services/supabaseClient';
import { AudioLog } from '../types';

const CONFIG_KEY = 'southport_config';
const LOCAL_LOGS_KEY = 'southport_audio_cache_v3';
const SPLIT_INTERVAL_SECONDS = 300; // 5 minutes

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const AudioLogger: React.FC = () => {
  const [logs, setLogs] = useState<AudioLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<AudioLog | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isMonitoringMode, setIsMonitoringMode] = useState(false);
  const [duration, setDuration] = useState(0);
  const [syncStatus, setSyncStatus] = useState<string>('READY');
  const [isSyncing, setIsSyncing] = useState(false);

  const [assistant, setAssistant] = useState({
    query: '',
    response: '',
    isThinking: false,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const durationTimerRef = useRef<number | null>(null);
  
  const isMonitoringModeRef = useRef(isMonitoringMode);
  useEffect(() => {
    isMonitoringModeRef.current = isMonitoringMode;
  }, [isMonitoringMode]);

  const fetchLogs = useCallback(async () => {
    setIsSyncing(true);
    const supabase = getSupabaseClient();
    let cloudLogs: AudioLog[] = [];

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('audio_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30);

        if (!error && data) {
          cloudLogs = data.map(item => ({
            id: item.id.toString(),
            timestamp: new Date(item.created_at).toLocaleString(),
            customerName: item.customer_name || 'SHOP SESSION',
            vehicle: item.vehicle || 'SHOP FLOOR',
            duration: item.duration || 'CAPTURED',
            transcriptPreview: item.transcript || item.summary || 'PROCESSING...',
            tags: item.tags || ['CLOUD'],
          }));
        }
      } catch (err) {
        console.warn("Cloud connection limited.");
      }
    }

    const localData = localStorage.getItem(LOCAL_LOGS_KEY);
    const cachedLogs: AudioLog[] = localData ? JSON.parse(localData) : [];

    const combined = [...cachedLogs, ...cloudLogs];
    const unique = combined.reduce((acc, current) => {
      const x = acc.find(item => item.id === current.id);
      if (!x) {
        return acc.concat([current]);
      } else {
        return acc;
      }
    }, [] as AudioLog[]);

    setLogs(unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    setIsSyncing(false);
  }, []);

  const finalizeLog = async (audioBlob: Blob, monitoring: boolean, segmentDuration: number) => {
    const configData = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
    
    const tempId = `${monitoring ? 'MON-' : 'REC-'}${Date.now()}`;
    const newLog: AudioLog = {
      id: tempId,
      timestamp: new Date().toLocaleString(),
      customerName: monitoring ? 'MONITOR SEGMENT' : 'NEW INTAKE',
      vehicle: monitoring ? 'CONTINUOUS FEED' : 'SESSION CAPTURE',
      duration: formatTime(segmentDuration),
      transcriptPreview: monitoring ? 'CONTINUOUS MONITORING SEGMENT CAPTURED. ANALYZING...' : 'AUDIO CAPTURED LOCALLY. HANDING OFF TO N8N NODES...',
      tags: monitoring ? ['MONITOR', 'LOCAL'] : ['LOCAL'],
    };

    const existingCache = JSON.parse(localStorage.getItem(LOCAL_LOGS_KEY) || '[]');
    localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify([newLog, ...existingCache]));
    
    setLogs(prev => [newLog, ...prev]);

    if (configData.n8nWebhookAudio) {
      const formData = new FormData();
      formData.append('file', audioBlob, `${tempId}.webm`);
      formData.append('metadata', JSON.stringify({ 
        id: tempId, 
        timestamp: newLog.timestamp,
        is_monitor: monitoring 
      }));
      
      fetch(configData.n8nWebhookAudio, { method: 'POST', body: formData })
        .then(() => {
          setTimeout(() => fetchLogs(), 3000);
        })
        .catch(e => console.error("n8n Sync failed", e));
    }
  };

  const startRecording = useCallback(async () => {
    try {
      if (!streamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      }

      const recorder = new MediaRecorder(streamRef.current!);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setDuration(prev => {
          finalizeLog(blob, isMonitoringModeRef.current, prev);
          return prev;
        });
      };

      recorder.start();
      setIsRecording(true);
      setDuration(0);
      setSyncStatus(isMonitoringModeRef.current ? 'MONITORING' : 'RECORDING');

      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      durationTimerRef.current = window.setInterval(() => {
        setDuration(prev => {
          const next = prev + 1;
          if (isMonitoringModeRef.current && next >= SPLIT_INTERVAL_SECONDS) {
            splitMonitorSession();
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      setSyncStatus('MIC ERROR');
    }
  }, []);

  const stopEverything = useCallback(() => {
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setSyncStatus('READY');
  }, []);

  const splitMonitorSession = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setTimeout(() => {
        if (isMonitoringModeRef.current) {
          startRecording();
        }
      }, 100);
    }
  };

  const handleToggleMonitoring = async () => {
    const nextMode = !isMonitoringMode;
    setIsMonitoringMode(nextMode);

    if (nextMode) {
      await startRecording();
    } else {
      if (isRecording) {
        stopEverything();
      }
    }
  };

  const handleAssistantAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistant.query.trim() || !selectedLog) return;
    setAssistant(prev => ({ ...prev, isThinking: true }));
    const response = await askAssistant(assistant.query, selectedLog.transcriptPreview);
    setAssistant(prev => ({ ...prev, response, isThinking: false }));
  };

  useEffect(() => {
    fetchLogs();
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [fetchLogs]);

  const filteredLogs = useMemo(() => logs.filter(l => 
    !searchQuery || 
    l.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.transcriptPreview.toLowerCase().includes(searchQuery.toLowerCase())
  ), [logs, searchQuery]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex-1 flex flex-col gap-6">
        {/* MODERN CONTROL HUB */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] -mr-32 -mt-32" />
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <div className="flex items-center gap-5">
              <div className={`p-4 rounded-2xl ${isRecording ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-blue-600 text-white shadow-xl shadow-blue-900/20'}`}>
                {isRecording ? <Activity size={28} /> : <Mic size={28} />}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white tracking-tight">Audio Logs</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${isRecording ? (isMonitoringMode ? 'text-blue-400' : 'text-red-400') : 'text-slate-500'}`}>
                    {isMonitoringMode ? 'MONITOR ACTIVE' : syncStatus}
                  </span>
                  <div className={`w-1.5 h-1.5 rounded-full ${isRecording ? 'bg-red-500' : 'bg-emerald-500'}`} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-950/50 p-2 rounded-2xl border border-slate-800/50">
              <div className="flex items-center gap-3 px-4 py-2">
                <Repeat size={16} className={isMonitoringMode ? 'text-blue-400' : 'text-slate-500'} />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Continuous Monitor</span>
                <button 
                  onClick={handleToggleMonitoring}
                  className={`relative w-11 h-6 transition-colors rounded-full focus:outline-none ${isMonitoringMode ? 'bg-blue-600' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isMonitoringMode ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="w-[1px] h-8 bg-slate-800" />
              <button onClick={fetchLogs} className="p-3 text-slate-400 hover:text-white transition-colors">
                <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {isRecording ? (
              <div className="bg-slate-950/80 rounded-3xl border border-slate-800 p-8 flex flex-col items-center justify-center gap-6 shadow-inner group">
                <div className="flex flex-col items-center">
                  {isMonitoringMode ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-blue-500/10 border border-blue-500/20">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                        <span className="text-sm font-bold text-blue-400 uppercase tracking-[0.3em]">Active</span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium italic">Continuous shop capture enabled...</p>
                    </div>
                  ) : (
                    <span className="text-6xl font-black font-mono tracking-tighter tabular-nums text-red-500">
                      {formatTime(duration)}
                    </span>
                  )}
                </div>
                
                {/* Modern Visualizer */}
                <div className="flex gap-1.5 h-16 items-end w-full max-w-md px-4">
                  {[...Array(40)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`flex-1 rounded-full transition-all duration-300 ${isMonitoringMode ? 'bg-blue-500/60' : 'bg-red-500/60'}`} 
                      style={{ height: `${20 + Math.random() * 80}%` }} 
                    />
                  ))}
                </div>

                {!isMonitoringMode && (
                  <button 
                    onClick={stopEverything} 
                    className="mt-4 flex items-center gap-3 px-10 py-5 bg-white text-slate-950 font-black rounded-2xl hover:bg-slate-200 transition-all active:scale-95 shadow-xl shadow-white/5 uppercase tracking-widest text-sm"
                  >
                    <Square size={18} fill="currentColor" /> Stop Session
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="relative">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                  <input 
                    type="text" 
                    placeholder="Search archives by customer or transcript..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-3xl p-6 pl-16 text-white font-medium outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600" 
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* REFINED LOG LIST */}
        <div className="flex-1 bg-slate-900/20 rounded-[2.5rem] border border-slate-800/50 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-800/50 bg-slate-900/40 flex justify-between items-center">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Recent Activity Logs</h4>
            <span className="text-[10px] font-bold text-slate-400">{filteredLogs.length} Records</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {filteredLogs.length > 0 ? filteredLogs.map((log) => (
              <button 
                key={log.id} 
                onClick={() => setSelectedLog(log)} 
                className={`w-full group text-left p-5 rounded-3xl border transition-all duration-300 ${
                  selectedLog?.id === log.id 
                    ? 'bg-blue-600/10 border-blue-500/50 shadow-lg' 
                    : 'bg-slate-900/40 border-slate-800/40 hover:bg-slate-800/60 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl border ${selectedLog?.id === log.id ? 'bg-blue-600 text-white border-blue-400' : 'bg-slate-950 text-slate-500 border-slate-800'}`}>
                      {log.tags.includes('MONITOR') ? <Repeat size={20} /> : <Volume2 size={20} />}
                    </div>
                    <div>
                      <h4 className={`font-bold transition-colors ${selectedLog?.id === log.id ? 'text-blue-400' : 'text-white'}`}>{log.customerName}</h4>
                      <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">
                        <Clock size={10} /> {log.timestamp.split(',')[1]}
                        <span>•</span>
                        <span>{log.vehicle}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="text-[10px] font-black font-mono text-blue-400 bg-blue-500/5 px-2 py-1 rounded-lg border border-blue-500/10">{log.duration}</span>
                    <div className="flex gap-1">
                      {log.tags.map(tag => (
                        <span key={tag} className="text-[8px] font-bold px-1.5 py-0.5 bg-slate-950 text-slate-500 border border-slate-800 rounded-md uppercase tracking-tighter">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed pl-16 line-clamp-2 font-medium">
                  {log.transcriptPreview}
                </p>
              </button>
            )) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-700 py-20 text-center">
                <HardDrive size={64} className="mb-4 opacity-5" />
                <p className="text-sm font-bold uppercase tracking-[0.3em] opacity-20">No Records Found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODERN ANALYSIS WING */}
      <div className="w-full lg:w-[420px] bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl relative">
        <div className="p-8 border-b border-slate-800/50 flex items-center gap-5">
           <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-blue-400">
             <Bot size={28} />
           </div>
           <div>
             <h3 className="text-xl font-bold text-white tracking-tight">AI Intelligence</h3>
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Natural Language Core</p>
           </div>
        </div>

        <div className="flex-1 p-8 overflow-y-auto space-y-6 custom-scrollbar">
          {selectedLog ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="bg-slate-950/60 p-6 rounded-3xl border border-slate-800/50 shadow-inner">
                <div className="flex items-center gap-2 mb-4">
                  <Terminal size={14} className="text-blue-500" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Transcript Analysis</span>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed font-medium">
                  {selectedLog.transcriptPreview}
                </p>
              </div>
              
              {assistant.response && (
                <div className="bg-blue-600 rounded-3xl p-6 shadow-xl shadow-blue-900/20 animate-in zoom-in-95 duration-300 relative">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <CheckCircle size={48} />
                  </div>
                  <div className="flex items-center gap-2 text-blue-100 text-[10px] font-black uppercase tracking-widest mb-3">
                    <CheckCircle size={14} /> Model Output
                  </div>
                  <div className="text-white text-sm leading-relaxed font-bold tracking-tight">
                    {assistant.response}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-20 h-20 bg-slate-950 rounded-full border border-slate-800 flex items-center justify-center mb-6">
                <AlertTriangle size={32} className="text-slate-700" />
              </div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] leading-relaxed">
                Select log entry <br /> to activate processor
              </p>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-950/80 border-t border-slate-800/50">
          <form onSubmit={handleAssistantAsk} className="flex gap-3">
            <input 
              type="text" 
              value={assistant.query} 
              onChange={(e) => setAssistant(prev => ({ ...prev, query: e.target.value }))} 
              placeholder="Query log data..." 
              className="flex-1 bg-slate-900/60 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-700 font-medium" 
            />
            <button 
              type="submit" 
              disabled={assistant.isThinking || !selectedLog} 
              className="bg-blue-600 w-14 h-14 rounded-2xl text-white flex items-center justify-center hover:bg-blue-500 disabled:opacity-30 transition-all shadow-lg shadow-blue-900/20"
            >
              {assistant.isThinking ? <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full"></div> : <ChevronRight size={24} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AudioLogger;
