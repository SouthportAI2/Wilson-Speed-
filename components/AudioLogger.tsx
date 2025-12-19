import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Mic, Search, Play, Square, UploadCloud, RefreshCw, Clock, FileText, Bot, Cpu, WifiOff, AlertTriangle, Database, Terminal, VolumeX } from 'lucide-react';
import { askAssistant } from '../services/gemini.ts';
import { getSupabaseClient } from '../services/supabaseClient.ts';
import { AudioLog } from '../types.ts';

const POLLING_SCHEDULE = [5000, 10000, 20000, 30000] as const;
const TEMP_LOG_EXPIRY_SECONDS = 35;
const MAX_LOGS_DISPLAY = 50;
const CONFIG_KEY = 'southport_config';

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  nextSplitIn: number;
}

interface SystemState {
  isProcessing: boolean;
  isConnected: boolean;
  dbError: string | null;
  serverLog: string;
}

interface AssistantState {
  query: string;
  response: string;
  isThinking: boolean;
}

interface AppConfig {
  n8nWebhookAudio?: string;
  audioSegmentDuration?: string;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatIncomingLog = (item: any): AudioLog => ({
  id: item.id,
  timestamp: new Date(item.created_at).toLocaleString(),
  customerName: item.customer_name || 'Unknown',
  vehicle: item.vehicle || 'General Shop',
  duration: 'Recorded',
  transcriptPreview: item.transcript || item.summary || 'Processing...',
  tags: item.tags || [],
  audioUrl: item.audio_url,
});

const AudioLogger: React.FC = () => {
  const [isContinuous, setIsContinuous] = useState(false);
  const [segmentDuration, setSegmentDuration] = useState(5);
  const [searchQuery, setSearchQuery] = useState('');
  const [logs, setLogs] = useState<AudioLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<AudioLog | null>(null);
  const [lastInsertedId, setLastInsertedId] = useState<string | null>(null);

  const [recording, setRecording] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    nextSplitIn: 0,
  });

  const [system, setSystem] = useState<SystemState>({
    isProcessing: false,
    isConnected: false,
    dbError: null,
    serverLog: '',
  });

  const [assistant, setAssistant] = useState<AssistantState>({
    query: '',
    response: '',
    isThinking: false,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const isMountedRef = useRef(true);
  const isRecordingRef = useRef(false);
  const pollTimersRef = useRef<number[]>([]);
  const durationTimerRef = useRef<number | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!isMountedRef.current) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('audio_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(MAX_LOGS_DISPLAY);

      if (!error && data) {
        setLogs(data.map(formatIncomingLog));
        setSystem(s => ({ ...s, isConnected: true }));
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    return () => { isMountedRef.current = false; };
  }, [fetchLogs]);

  const handleAssistantAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistant.query.trim()) return;
    setAssistant(prev => ({ ...prev, isThinking: true }));
    const context = logs.slice(0, 5).map(l => l.transcriptPreview).join('\n');
    const response = await askAssistant(assistant.query, context);
    setAssistant(prev => ({ ...prev, response, isThinking: false }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[calc(100vh-12rem)] animate-fade-in">
      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700/50 backdrop-blur-sm space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${system.isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                {system.isConnected ? 'System Online' : 'System Offline'}
              </span>
            </div>
            <button onClick={fetchLogs} className="text-slate-500 hover:text-white transition-colors">
              <RefreshCw size={14} className={system.isProcessing ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Search infrastructure logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl pl-12 pr-4 py-4 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
              />
            </div>
            <button className="bg-blue-600 hover:bg-blue-500 text-white font-black px-8 py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-900/20">
              <Mic size={20} />
              START LOGGING
            </button>
          </div>
        </div>

        <div className="flex-1 bg-slate-800/30 rounded-3xl border border-slate-700/50 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {logs.map(log => (
            <div 
              key={log.id} 
              onClick={() => setSelectedLog(log)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer ${selectedLog?.id === log.id ? 'bg-blue-500/10 border-blue-500/50 shadow-xl' : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-white">{log.customerName}</h4>
                <span className="text-[10px] font-mono text-slate-500">{log.timestamp}</span>
              </div>
              <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">{log.transcriptPreview}</p>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-20 text-slate-500 space-y-4">
              <Database size={48} className="opacity-20" />
              <p className="font-medium">No records found in current node.</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-3xl border border-slate-700/50 flex flex-col overflow-hidden backdrop-blur-sm">
        <div className="flex-1 p-8 overflow-y-auto">
          {selectedLog ? (
            <div className="space-y-8 animate-fade-in">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Record Analysis</h3>
                <div className="p-3 bg-blue-600 rounded-full text-white shadow-lg cursor-pointer hover:scale-105 transition-transform">
                  <Play size={20} fill="currentColor" />
                </div>
              </div>
              <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 min-h-[200px]">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-4 block">Transcript Data</span>
                <p className="text-slate-300 text-sm leading-relaxed font-mono">{selectedLog.transcriptPreview}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Entity</div>
                  <div className="text-white font-bold">{selectedLog.customerName}</div>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Asset</div>
                  <div className="text-white font-bold">{selectedLog.vehicle}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
              <FileText size={64} />
              <p className="font-bold uppercase tracking-[0.2em] text-xs">Select data node</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-950/50 border-t border-slate-800">
          <form onSubmit={handleAssistantAsk} className="relative">
            <input 
              type="text"
              value={assistant.query}
              onChange={(e) => setAssistant(prev => ({ ...prev, query: e.target.value }))}
              placeholder="Query Core AI..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-12 py-4 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-400 transition-colors">
              {assistant.isThinking ? <RefreshCw size={20} className="animate-spin" /> : <Bot size={20} />}
            </button>
          </form>
          {assistant.response && (
            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm text-blue-200 animate-fade-in">
              <div className="font-black uppercase text-[10px] tracking-widest text-blue-400 mb-2">AI Response</div>
              {assistant.response}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudioLogger;
