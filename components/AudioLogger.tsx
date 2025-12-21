import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Mic, Search, Play, Square, RefreshCw, Clock, FileText, Bot, Database, Radio, Activity, StopCircle } from 'lucide-react';
import { askAssistant } from '../services/gemini';
import { getSupabaseClient } from '../services/supabaseClient';
import { AudioLog } from '../types';

const MAX_LOGS_DISPLAY = 50;

const AudioLogger: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [logs, setLogs] = useState<AudioLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<AudioLog | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isMonitoringMode, setIsMonitoringMode] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const splitTimerRef = useRef<number | null>(null);

  const [assistant, setAssistant] = useState({
    query: '',
    response: '',
    isThinking: false,
  });

  const fetchLogs = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setIsConnected(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('audio_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(MAX_LOGS_DISPLAY);

      if (!error && data) {
        setLogs(data.map((item: any) => ({
          id: item.id,
          timestamp: new Date(item.created_at).toLocaleString(),
          customerName: item.customer_name || 'System Event',
          vehicle: item.vehicle || 'Monitoring Node',
          duration: 'Segment',
          transcriptPreview: item.transcript || item.summary || 'Segment data pending analysis...',
          tags: item.tags || [],
          audioUrl: item.audio_url,
        })));
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    } catch (err) {
      console.error(err);
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleUpload = async (blob: Blob, isAutomatic: boolean) => {
    setIsProcessing(true);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setIsProcessing(false);
      return;
    }

    try {
      // In a production environment, we would upload to Supabase Storage first.
      // For this implementation, we insert the metadata record to track the event.
      await supabase.from('audio_logs').insert([{
        customer_name: isAutomatic ? "24/7 Monitoring" : "Manual Recording",
        vehicle: "Shop Infrastructure",
        transcript: "Processing segment via intelligence node...",
        summary: `Segment captured at ${new Date().toLocaleTimeString()}`,
        created_at: new Date().toISOString()
      }]);
      fetchLogs();
    } catch (err) {
      console.error("Archive failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = async (autoRestart = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleUpload(audioBlob, autoRestart);
        
        // Loop logic for 24/7 monitoring
        if (isMonitoringMode && mediaRecorderRef.current === mediaRecorder) {
          startRecording(true);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Timer UI
      setRecordingTime(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Handle split logic
      if (isMonitoringMode || autoRestart) {
        const config = JSON.parse(localStorage.getItem('southport_config') || '{}');
        const splitDuration = (parseInt(config.audioSegmentDuration) || 5) * 60 * 1000;
        
        if (splitTimerRef.current) clearTimeout(splitTimerRef.current);
        splitTimerRef.current = window.setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            stream.getTracks().forEach(t => t.stop());
          }
        }, splitDuration);
      }
    } catch (err) {
      alert("Microphone access is required for audio logging.");
    }
  };

  const stopRecording = (stopMonitoring = true) => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    
    if (timerRef.current) clearInterval(timerRef.current);
    if (splitTimerRef.current) clearTimeout(splitTimerRef.current);
    
    setIsRecording(false);
    if (stopMonitoring) setIsMonitoringMode(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleAssistantAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistant.query.trim()) return;
    setAssistant(prev => ({ ...prev, isThinking: true }));
    const context = logs.slice(0, 5).map(l => l.transcriptPreview).join('\n');
    const response = await askAssistant(assistant.query, context);
    setAssistant(prev => ({ ...prev, response, isThinking: false }));
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => 
      log.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.transcriptPreview.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [logs, searchQuery]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in text-left">
      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50 backdrop-blur-sm space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'} ${isRecording ? 'animate-pulse' : ''}`} />
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                {isRecording ? `REC: ${formatTime(recordingTime)}` : isConnected ? 'Node Synced' : 'Database Offline'}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => {
                  if (isMonitoringMode) stopRecording(true);
                  else {
                    setIsMonitoringMode(true);
                    startRecording(true);
                  }
                }}
                className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border transition-all ${isMonitoringMode ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
              >
                <Radio size={12} className={isMonitoringMode ? 'animate-pulse' : ''} />
                24/7 Monitoring Mode
              </button>
              <button onClick={fetchLogs} className="text-slate-500 hover:text-white">
                <RefreshCw size={14} className={isProcessing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Search audio archives..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl pl-12 pr-4 py-4 text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            
            {isRecording ? (
              <button 
                onClick={() => stopRecording(true)}
                className="bg-red-600 hover:bg-red-500 text-white font-black px-8 py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl shadow-red-900/20"
              >
                <StopCircle size={20} /> STOP RECORDING
              </button>
            ) : (
              <button 
                onClick={() => startRecording(false)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-black px-8 py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl shadow-blue-900/20"
              >
                <Mic size={20} /> START RECORDING
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 bg-slate-800/20 rounded-3xl border border-slate-700/30 overflow-y-auto p-4 space-y-3 min-h-[450px]">
          {filteredLogs.map(log => (
            <div 
              key={log.id} 
              onClick={() => setSelectedLog(log)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer ${selectedLog?.id === log.id ? 'bg-blue-500/10 border-blue-500/50' : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-white uppercase tracking-tight text-sm">{log.customerName}</h4>
                <span className="text-[9px] font-mono text-slate-500">{log.timestamp}</span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-medium">{log.transcriptPreview}</p>
            </div>
          ))}
          {filteredLogs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-600 space-y-4">
              <Database size={48} className="opacity-20" />
              <p className="font-bold text-xs uppercase tracking-widest">Archive Empty</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-800/40 rounded-3xl border border-slate-700/50 flex flex-col overflow-hidden backdrop-blur-sm">
        <div className="flex-1 p-8 overflow-y-auto">
          {selectedLog ? (
            <div className="space-y-8 animate-fade-in">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-white uppercase">Insight</h3>
                <div className="p-3 bg-blue-600 rounded-full text-white shadow-lg cursor-pointer hover:scale-105 transition-transform">
                  <Play size={20} fill="currentColor" />
                </div>
              </div>
              
              <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2 mb-4">
                  <Activity size={12} className="text-blue-500" />
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Transcript</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed font-medium">{selectedLog.transcriptPreview}</p>
              </div>

              <div className="grid grid-cols-1 gap-4 text-left">
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                  <div className="text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">Entity</div>
                  <div className="text-white font-bold text-sm">{selectedLog.customerName}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-20">
              <FileText size={64} />
              <p className="font-bold uppercase tracking-widest text-xs">Select entry for analysis</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-950/30 border-t border-slate-800">
          <form onSubmit={handleAssistantAsk} className="relative">
            <input 
              type="text"
              value={assistant.query}
              onChange={(e) => setAssistant(prev => ({ ...prev, query: e.target.value }))}
              placeholder="Query Core AI Node..."
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-4 pr-12 py-4 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
              {assistant.isThinking ? <RefreshCw size={20} className="animate-spin" /> : <Bot size={20} />}
            </button>
          </form>
          {assistant.response && (
            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-200 animate-fade-in">
              {assistant.response}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudioLogger;
