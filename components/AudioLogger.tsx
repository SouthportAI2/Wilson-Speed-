import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, RefreshCw, Clock, HardDrive } from 'lucide-react';
import { getSupabaseClient } from '../services/supabaseClient';
import { AudioLog } from '../types';

const CONFIG_KEY = 'southport_config';
const LOCAL_LOGS_KEY = 'southport_audio_cache_v3';
const SPLIT_INTERVAL_SECONDS = 900; // 15 minutes

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const extractNameFromTranscript = (text: string): string | null => {
  if (!text) return null;
  
  // Common patterns for name introduction
  const patterns = [
    /my name is ([A-Z][a-z]+ [A-Z][a-z]+)/i,
    /this is ([A-Z][a-z]+ [A-Z][a-z]+)/i,
    /I'm ([A-Z][a-z]+ [A-Z][a-z]+)/i,
    /I am ([A-Z][a-z]+ [A-Z][a-z]+)/i,
    /([A-Z][a-z]+ [A-Z][a-z]+) here/i,
    /([A-Z][a-z]+ [A-Z][a-z]+) calling/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
};

const AudioLogger: React.FC = () => {
  const [logs, setLogs] = useState<AudioLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<AudioLog | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>(
    new Date().toLocaleDateString('en-US', { weekday: 'long' })
  );

  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const durationTimerRef = useRef<number | null>(null);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

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
          .limit(50);

        if (!error && data) {
          cloudLogs = data.map(item => {
            // Parse customers array from new JSONB column
            const customers = item.customers || [];
            
            // Extract customer names for display
            const customerNames = customers.map((c: any) => c.name).filter(Boolean);

            let displayName = '';

            if (customerNames.length > 0) {
              // Use names from customers array (new logs)
              displayName = customerNames.join(', ');
            } else {
              // Try to extract name from transcript (old logs)
              const transcript = item.transcript || item.segment_summary || '';
              const extractedName = extractNameFromTranscript(transcript);
              displayName = extractedName || 'Unknown Customer';
            }
            
            // Get first customer's vehicle if available
            const firstVehicle = customers[0]?.vehicle || 'SHOP FLOOR';
            
            return {
              id: item.id.toString(),
              timestamp: new Date(item.created_at).toLocaleString(),
              customerName: displayName,
              vehicle: firstVehicle,
              duration: 'CAPTURED',
              transcriptPreview: item.segment_summary || item.transcript || 'PROCESSING...',
              tags: item.service_tags || item.tags || ['CLOUD'],
            };
          });
        }
      } catch (err) {
        console.warn("Cloud connection limited.");
      }
    }

    const localData = localStorage.getItem(LOCAL_LOGS_KEY);
    const cachedLogs: AudioLog[] = localData ? JSON.parse(localData) : [];

    // Smarter Deduplication
    const combined = [...cachedLogs, ...cloudLogs];
    const unique = combined.reduce((acc, current) => {
      if (acc.find(item => item.id === current.id)) return acc;

      if (current.tags.includes('LOCAL')) {
        const hasCloudEquivalent = cloudLogs.some(cloud => {
          const cloudTime = new Date(cloud.timestamp).getTime();
          const localTime = new Date(current.timestamp).getTime();
          return Math.abs(cloudTime - localTime) < 60000;
        });
        if (hasCloudEquivalent) return acc;
      }

      return acc.concat([current]);
    }, [] as AudioLog[]);

    setLogs(unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    setIsSyncing(false);
    
    if (cloudLogs.length > 0) {
      localStorage.removeItem(LOCAL_LOGS_KEY);
    }
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
      formData.append('metadata', JSON.stringify({ id: tempId, timestamp: newLog.timestamp, is_monitor: monitoring }));
      fetch(configData.n8nWebhookAudio, { method: 'POST', body: formData })
        .then(() => setTimeout(() => fetchLogs(), 3000))
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
        await finalizeLog(blob, true, duration);
        
        // Auto-restart for next 15-min segment
        if (isRecording) {
          setTimeout(() => {
            chunksRef.current = [];
            setDuration(0);
            mediaRecorderRef.current?.start();
          }, 100);
        }
      };

      recorder.start();
      setIsRecording(true);
      setDuration(0);

      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      durationTimerRef.current = window.setInterval(() => {
        setDuration(prev => {
          const next = prev + 1;
          if (next >= SPLIT_INTERVAL_SECONDS) {
            // Split at 15 minutes
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              mediaRecorderRef.current.stop();
            }
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      alert('Microphone access denied. Please enable microphone permissions.');
    }
  }, [duration, isRecording]);

  const stopRecording = useCallback(() => {
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setDuration(0);
  }, []);

  const handleToggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  useEffect(() => {
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      stopRecording();
    };
  }, [stopRecording]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getCurrentWeekStart = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const filteredLogs = useMemo(() => {
    const weekStart = getCurrentWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 5);

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return logs.filter(log => {
        const searchableText = [
          log.customerName,
          log.vehicle,
          log.transcriptPreview,
          ...(log.tags || [])
        ].join(' ').toLowerCase();
        return searchableText.includes(query);
      });
    } else {
      return logs.filter(log => {
        const logDate = new Date(log.timestamp);
        const logDay = logDate.toLocaleDateString('en-US', { weekday: 'long' });
        return logDay === selectedDay && logDate >= weekStart && logDate < weekEnd;
      });
    }
  }, [logs, selectedDay, searchQuery]);

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-140px)] animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER WITH SEARCH */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-3xl p-8 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] -mr-32 -mt-32" />
        <div className="flex justify-between items-center mb-6 relative z-10">
          <h3 className="text-2xl font-bold text-white tracking-tight">Audio Logger</h3>
          
          <div className="flex items-center gap-3">
            {/* NEW TOGGLE HERE */}
            <div className="flex items-center gap-3 bg-slate-950/50 px-5 py-3 rounded-2xl border border-slate-800/50">
              <span className={`text-xs font-bold uppercase tracking-widest transition-colors ${isRecording ? 'text-blue-400' : 'text-slate-500'}`}>
                Start Conversation Summaries
              </span>
              <button 
                onClick={handleToggleRecording}
                className={`relative w-12 h-6 transition-colors rounded-full focus:outline-none ${isRecording ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isRecording ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
            
            {/* REFRESH BUTTON */}
            <button onClick={fetchLogs} className="p-3 text-slate-400 hover:text-white transition-all active:scale-95">
              <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        
        {/* SEARCH BAR */}
        <div className="relative z-10">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            type="text" 
            placeholder="Search customer, service, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl p-5 pl-16 text-white font-medium outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600 shadow-inner"
          />
        </div>

        {/* DAY TABS (horizontal) */}
        <div className="flex gap-2 mt-6 relative z-10">
          {daysOfWeek.map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                selectedDay === day 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {day.substring(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* SEGMENTS LIST */}
      <div className="flex-1 bg-slate-900/20 rounded-3xl border border-slate-800/50 overflow-hidden flex flex-col shadow-inner">
        <div className="p-6 border-b border-slate-800/50 bg-slate-900/40 flex justify-between items-center">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">
            {searchQuery ? 'Search Results' : `${selectedDay}'s Activity`} ({filteredLogs.length} segments)
          </h4>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {filteredLogs.length > 0 ? filteredLogs.map((log) => (
            <div 
              key={log.id}
              onClick={() => setSelectedLog(log)}
              className={`w-full text-left p-6 rounded-2xl border transition-all duration-300 cursor-pointer ${
                selectedLog?.id === log.id 
                  ? 'bg-blue-600/10 border-blue-500/50 shadow-lg' 
                  : 'bg-slate-900/40 border-slate-800/40 hover:bg-slate-800/60 hover:border-slate-700'
              }`}
            >
              {/* Time range header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${selectedLog?.id === log.id ? 'bg-blue-600 text-white' : 'bg-slate-950 text-blue-400 shadow-inner'}`}>
                    <Clock size={16} />
                  </div>
                  <span className="font-bold text-white text-sm">{log.timestamp}</span>
                </div>
                <div className="flex gap-1">
                  {log.tags.map(tag => (
                    <span key={tag} className="text-[8px] font-black px-2 py-1 bg-slate-950 text-slate-500 border border-slate-800 rounded uppercase tracking-tighter">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              
              {/* Customer info - display as bullets */}
              <div className="space-y-2 pl-4">
                <div className="flex items-start gap-4">
                  <span className="text-blue-500 mt-1 font-bold">•</span>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-bold text-white">{log.customerName}</span>
                      {log.vehicle && (
                        <>
                          <span className="text-slate-600 font-bold hidden sm:inline">•</span>
                          <span className="text-slate-400 text-xs font-medium">{log.vehicle}</span>
                        </>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm mt-2 line-clamp-3 font-medium leading-relaxed italic opacity-80 group-hover:opacity-100">
                      {log.transcriptPreview}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-700 py-20 text-center">
              <HardDrive size={64} className="mb-4 opacity-5" />
              <p className="text-xs font-black uppercase tracking-[0.3em] opacity-20">No matching segments</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudioLogger;
