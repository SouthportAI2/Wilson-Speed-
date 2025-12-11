import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Mic, Search, Play, Square, UploadCloud, RefreshCw, Clock, FileText, Bot, Cpu, WifiOff, AlertTriangle, Database, Terminal, VolumeX } from 'lucide-react';
import { askAssistant } from '../services/gemini';
import { getSupabaseClient } from '../services/supabaseClient';
import { AudioLog } from '../types';

// ============================================================================
// CONSTANTS & CONFIG
// ============================================================================
const POLLING_SCHEDULE = [5000, 10000, 20000, 30000] as const;
const TEMP_LOG_EXPIRY_SECONDS = 35;
const MAX_LOGS_DISPLAY = 50;
const CONFIG_KEY = 'southport_config';

// ============================================================================
// TYPES
// ============================================================================
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

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

/**
 * Manages app configuration from localStorage
 */
const useAppConfig = () => {
  return useMemo((): AppConfig => {
    try {
      const stored = localStorage.getItem(CONFIG_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }, []); // Only read once on mount
};

/**
 * Manages recording timers with auto-cleanup
 */
const useRecordingTimers = (
  isContinuous: boolean,
  segmentDuration: number,
  onSplit: () => void
) => {
  const durationTimerRef = useRef<number | null>(null);
  const splitTimerRef = useRef<number | null>(null);

  const startTimers = useCallback((
    setDuration: (fn: (prev: number) => number) => void,
    setNextSplit: (fn: (prev: number) => number) => void
  ) => {
    // Clean existing timers
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    if (splitTimerRef.current) clearInterval(splitTimerRef.current);

    // Start duration counter
    durationTimerRef.current = window.setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);

    // Start split timer if continuous mode
    if (isContinuous) {
      const splitSeconds = segmentDuration * 60;
      setNextSplit(() => splitSeconds);

      splitTimerRef.current = window.setInterval(() => {
        setNextSplit(prev => {
          if (prev <= 1) {
            onSplit();
            return splitSeconds;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [isContinuous, segmentDuration, onSplit]);

  const stopTimers = useCallback(() => {
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    if (splitTimerRef.current) clearInterval(splitTimerRef.current);
  }, []);

  useEffect(() => {
    return () => stopTimers();
  }, [stopTimers]);

  return { startTimers, stopTimers };
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const isExpiredTempLog = (logId: string): boolean => {
  if (!logId.startsWith('temp-')) return false;
  const timestamp = parseInt(logId.replace('temp-', ''));
  const ageSeconds = (Date.now() - timestamp) / 1000;
  return ageSeconds >= TEMP_LOG_EXPIRY_SECONDS;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AudioLogger: React.FC = () => {
  // ========== STATE ==========
  const [isContinuous, setIsContinuous] = useState(false);
  const [segmentDuration, setSegmentDuration] = useState(5);
  const [searchQuery, setSearchQuery] = useState('');
  const [logs, setLogs] = useState<AudioLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<AudioLog | null>(null);

  // Consolidated state objects
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

  // ========== REFS ==========
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const isMountedRef = useRef(true);
  const isRecordingRef = useRef(false);
  const pollTimersRef = useRef<number[]>([]);

  // ========== CUSTOM HOOKS ==========
  const config = useAppConfig();

  // ========== CLEANUP FUNCTIONS ==========
  const cleanupRecordingResources = useCallback(() => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }

    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    chunksRef.current = [];
  }, []);

  const cleanupPolling = useCallback(() => {
    pollTimersRef.current.forEach(clearTimeout);
    pollTimersRef.current = [];
  }, []);

  // ========== DATABASE OPERATIONS ==========
  const fetchLogs = useCallback(async () => {
    if (!isMountedRef.current) return;

    setSystem(prev => ({ ...prev, dbError: null }));
    const supabase = getSupabaseClient();

    if (!supabase) {
      const msg = "Missing API Keys";
      setSystem(prev => ({
        ...prev,
        dbError: msg,
        isConnected: false,
      }));
      return;
    }

    try {
      const { data, error } = await supabase
        .from('audio_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(MAX_LOGS_DISPLAY);

      if (error) throw error;

      if (isMountedRef.current && data) {
        const formattedLogs: AudioLog[] = data.map(item => ({
          id: item.id,
          timestamp: new Date(item.created_at).toLocaleString(),
          customerName: item.customer_name || 'Unknown',
          vehicle: item.vehicle || 'General Shop',
          duration: 'Recorded',
          transcriptPreview: item.transcript || item.summary || 'Processing...',
          tags: item.tags || [],
          audioUrl: item.audio_url,
        }));

        setLogs(prev => {
          // Filter out expired temp logs
          const validTempLogs = prev.filter(log => !isExpiredTempLog(log.id));
          const merged = [...formattedLogs, ...validTempLogs];

          setSystem(s => ({ ...s, isConnected: true }));
          return merged;
        });
      }
    } catch (err) {
      console.error("Supabase Error:", err);
      if (isMountedRef.current) {
        const msg = err instanceof Error ? err.message : "Failed to fetch data";
        setSystem(prev => ({
          ...prev,
          isConnected: false,
          dbError: msg,
        }));
      }
    }
  }, []);

  // ========== RECORDING LOGIC ==========
  const handleSplit = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const { startTimers, stopTimers } = useRecordingTimers(
    isContinuous,
    segmentDuration,
    handleSplit
  );

  const handleUpload = useCallback(async (audioBlob: Blob) => {
    if (!isMountedRef.current) return;

    setSystem(prev => ({ ...prev, isProcessing: true }));
    cleanupPolling();

    const webhookUrl = config.n8nWebhookAudio;

    if (!webhookUrl) {
      setSystem(prev => ({
        ...prev,
        serverLog: "Error: No Webhook URL in Settings",
        isProcessing: false,
      }));
      return;
    }

    if (audioBlob.size === 0) {
      setSystem(prev => ({
        ...prev,
        serverLog: "Error: Empty audio file",
        isProcessing: false,
      }));
      return;
    }

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const tempLog: AudioLog = {
      id: tempId,
      timestamp: new Date().toLocaleTimeString(),
      customerName: 'Uploading...',
      vehicle: 'Processing',
      duration: formatTime(recording.duration || segmentDuration * 60),
      transcriptPreview: 'Sending to AI...',
      tags: ['Upload'],
      audioUrl: '',
    };
    setLogs(prev => [tempLog, ...prev]);

    try {
      setSystem(prev => ({ ...prev, serverLog: `Uploading ${audioBlob.size} bytes...` }));

      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');

      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server responded ${response.status}: ${text}`);
      }

      setSystem(prev => ({ ...prev, serverLog: 'Upload Success! AI is analyzing...' }));

      // Schedule polling attempts
      POLLING_SCHEDULE.forEach((delay, index) => {
        const timer = window.setTimeout(() => {
          if (isMountedRef.current) {
            fetchLogs();
            if (index === POLLING_SCHEDULE.length - 1) {
              setSystem(s => ({ ...s, serverLog: 'Recording processed' }));
            }
          }
        }, delay);
        pollTimersRef.current.push(timer);
      });
    } catch (error) {
      console.error("Upload Error:", error);
      const msg = error instanceof Error ? error.message : 'Upload failed';
      setSystem(prev => ({ ...prev, serverLog: `Upload Failed: ${msg}` }));
      setLogs(prev => prev.filter(l => l.id !== tempId));
    } finally {
      if (isMountedRef.current) {
        setSystem(prev => ({ ...prev, isProcessing: false }));
      }
    }
  }, [config.n8nWebhookAudio, recording.duration, segmentDuration, fetchLogs, cleanupPolling]);

  const startNewSegment = useCallback(async () => {
    cleanupRecordingResources();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data?.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];

        await handleUpload(blob);

        // Check if should continue
        if (isMountedRef.current && isRecordingRef.current && isContinuous) {
          setRecording(prev => ({ ...prev, duration: 0 }));
          startNewSegment();
        } else {
          streamRef.current?.getTracks().forEach(track => track.stop());
          if (isMountedRef.current) {
            setRecording(prev => ({ ...prev, isRecording: false }));
            setSystem(prev => ({ ...prev, serverLog: 'Recording stopped.' }));
          }
        }
      };

      recorder.start();

      if (isMountedRef.current) {
        isRecordingRef.current = true;
        setRecording(prev => ({ ...prev, isRecording: true, duration: 0 }));
        setSystem(prev => ({ ...prev, serverLog: 'Recording started...' }));

        startTimers(
          (fn) => setRecording(prev => ({ ...prev, duration: fn(prev.duration) })),
          (fn) => setRecording(prev => ({ ...prev, nextSplitIn: fn(prev.nextSplitIn) }))
        );
      }
    } catch (err) {
      console.error("Mic Error:", err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setSystem(prev => ({ ...prev, serverLog: 'Microphone Access Denied' }));
      alert("Microphone error: " + msg);
      setRecording(prev => ({ ...prev, isRecording: false }));
      isRecordingRef.current = false;
    }
  }, [cleanupRecordingResources, handleUpload, isContinuous, startTimers]);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    stopTimers();

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      cleanupRecordingResources();
      setRecording(prev => ({ ...prev, isRecording: false }));
    }
  }, [stopTimers, cleanupRecordingResources]);

  // ========== ASSISTANT ==========
  const handleAssistantAsk = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistant.query.trim()) return;

    setAssistant(prev => ({ ...prev, isThinking: true }));

    const context = logs
      .slice(0, 10)
      .map(l => `[${l.timestamp}] ${l.customerName}: ${l.transcriptPreview}`)
      .join('\n');

    const response = await askAssistant(assistant.query, context);

    setAssistant(prev => ({
      ...prev,
      response,
      isThinking: false,
    }));
  }, [assistant.query, logs]);

  // ========== HELPERS ==========
  const handlePlayAudio = useCallback((url?: string) => {
    if (!url) {
      return;
    }
    const audio = new Audio(url);
    audio.play().catch(e => {
      const msg = e instanceof Error ? e.message : 'Playback error';
      alert("Playback error: " + msg);
    });
  }, []);

  // ========== COMPUTED VALUES ==========
  const filteredLogs = useMemo(
    () =>
      logs.filter(
        log =>
          !searchQuery ||
          log.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.vehicle.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.transcriptPreview.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [logs, searchQuery]
  );

  const shouldShowTerminal = useMemo(() => {
    return recording.isRecording || system.isProcessing || system.serverLog.toLowerCase().includes('error');
  }, [recording.isRecording, system.isProcessing, system.serverLog]);

  // ========== LIFECYCLE ==========
  useEffect(() => {
    isMountedRef.current = true;

    // Load segment duration from config
    const duration = config.audioSegmentDuration;
    if (duration) {
      setSegmentDuration(parseInt(duration, 10));
    }

    fetchLogs();

    return () => {
      isMountedRef.current = false;
      cleanupRecordingResources();
      cleanupPolling();
      stopTimers();
    };
  }, [config.audioSegmentDuration, fetchLogs, cleanupRecordingResources, cleanupPolling, stopTimers]);

  // ========== RENDER ==========
  return (
    // Responsive grid: Stacked on mobile/tablet (h-auto), Side-by-side on large screens (fixed height)
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[calc(100vh-12rem)]">
      {/* Left Column: List & Controls */}
      {/* Fixed height on mobile (500px) to allow internal scrolling, auto/flex height on desktop */}
      <div className="lg:col-span-2 flex flex-col gap-4 h-[600px] lg:h-auto">
        {/* Control Panel */}
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-4 shadow-sm shrink-0">
          {/* Status Bar - Simplified */}
          <div className="flex justify-between items-center text-xs text-slate-400">
            <div className="flex items-center gap-3">
              {/* Only show DB Offline badge when there's an error or not connected */}
              {!system.isConnected && (
                <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-500/10 text-red-400">
                  <WifiOff size={12} />
                  DB Offline
                </span>
              )}
            </div>

            <button
              onClick={fetchLogs}
              className="hover:text-white flex items-center gap-1 transition-colors"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>

          {/* Server Log Terminal - Conditional Display */}
          {shouldShowTerminal && (
            <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg font-mono text-[11px] text-green-400 flex gap-3 items-center overflow-hidden animate-fade-in">
              <Terminal size={12} className="shrink-0 text-slate-500" />
              <span className="truncate">{system.serverLog}</span>
            </div>
          )}

          {system.dbError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0" />
              <span>{system.dbError}</span>
            </div>
          )}

          {/* Main Controls */}
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                size={18}
              />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
              />
            </div>

            {recording.isRecording ? (
              <button
                onClick={stopRecording}
                className="w-full md:w-auto flex items-center justify-center gap-3 px-6 py-3 rounded-lg font-bold bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20 transition-all animate-pulse"
              >
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <Square size={18} fill="currentColor" />
                <span className="font-mono tabular-nums">{formatTime(recording.duration)}</span>
                <span className="text-xs font-semibold ml-1">STOP</span>
              </button>
            ) : (
              <button
                onClick={startNewSegment}
                disabled={system.isProcessing}
                className={`w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isContinuous
                    ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/20'
                    : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'
                }`}
              >
                {system.isProcessing ? (
                  <>
                    <UploadCloud size={18} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Mic size={18} />
                    {isContinuous ? 'Start Monitor' : 'Start Recording'}
                  </>
                )}
              </button>
            )}
          </div>

          {/* Continuous Mode Toggle */}
          <div className="flex items-center justify-between text-sm pt-2">
            <div
              onClick={() => !recording.isRecording && setIsContinuous(!isContinuous)}
              className={`flex items-center gap-2 cursor-pointer select-none px-3 py-1.5 rounded-md border transition-all ${
                isContinuous
                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                  : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'
              } ${recording.isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <RefreshCw size={14} className={isContinuous ? 'animate-spin' : ''} />
              <span className="font-medium">Continuous Monitor Mode</span>
            </div>

            {isContinuous && (
              <div className="text-xs text-slate-500 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {segmentDuration}m segments
                </span>
                {recording.isRecording && (
                  <span className="text-purple-400 font-mono">
                    Next split: {formatTime(recording.nextSplitIn)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Logs List */}
        <div className="flex-1 bg-slate-800/50 rounded-xl border border-slate-700 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className={`p-4 rounded-lg border cursor-pointer transition-all hover:-translate-y-0.5 ${
                  selectedLog?.id === log.id
                    ? 'bg-blue-500/10 border-blue-500/50 shadow-lg shadow-blue-900/10'
                    : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4
                      className={`font-bold ${
                        log.customerName === 'Unknown' || log.customerName === 'Uploading...'
                          ? 'text-slate-400'
                          : 'text-white'
                      }`}
                    >
                      {log.customerName}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-medium text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                        {log.vehicle}
                      </span>
                      <span className="text-[10px] text-slate-500">{log.timestamp}</span>
                    </div>
                  </div>
                  <div className="text-slate-500 text-xs font-mono">{log.duration}</div>
                </div>
                <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed">
                  {log.transcriptPreview || <span className="italic opacity-50">No transcript available</span>}
                </p>
                {log.tags && log.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {log.tags.slice(0, 3).map((tag, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded-full border border-slate-600"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3 opacity-60">
              <Database size={40} className="stroke-1" />
              <p className="text-sm">No audio logs found.</p>
              {system.isConnected && (
                <p className="text-[10px] text-yellow-500">Check RLS Permissions if you expect data.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Assistant & Details */}
      {/* Fixed height on mobile (500px), auto/flex on desktop */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 flex flex-col overflow-hidden shadow-xl h-[500px] lg:h-auto">
        {selectedLog ? (
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-700">
              <div>
                <h3 className="text-lg font-bold text-white">Transcript Details</h3>
                <p className="text-slate-400 text-xs mt-1">
                  ID: {selectedLog.id.substring(0, 8)}
                </p>
              </div>
              <button
                onClick={() => handlePlayAudio(selectedLog.audioUrl)}
                className={`p-3 rounded-full shadow-lg transition-transform active:scale-95 ${
                  selectedLog.audioUrl
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'
                }`}
                disabled={!selectedLog.audioUrl}
                title={selectedLog.audioUrl ? 'Play Audio' : 'Audio not available'}
              >
                {selectedLog.audioUrl ? (
                  <Play size={18} fill="currentColor" />
                ) : (
                  <VolumeX size={18} />
                )}
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 min-h-[100px]">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                  Transcript
                </span>
                <p className="text-slate-300 leading-relaxed text-sm font-mono whitespace-pre-wrap">
                  {selectedLog.transcriptPreview ? (
                     selectedLog.transcriptPreview
                  ) : (
                     <span className="text-slate-600 italic">No transcript content available for this record.</span>
                  )}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Cpu size={14} className="text-purple-400" /> AI Analysis
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-700/30 p-3 rounded border border-slate-700">
                    <div className="text-[10px] text-slate-500 uppercase">Customer</div>
                    <div className="text-sm text-white font-medium truncate">
                      {selectedLog.customerName}
                    </div>
                  </div>
                  <div className="bg-slate-700/30 p-3 rounded border border-slate-700">
                    <div className="text-[10px] text-slate-500 uppercase">Vehicle</div>
                    <div className="text-sm text-white font-medium truncate">
                      {selectedLog.vehicle}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
            <FileText size={48} className="mb-4 opacity-10" />
            <p className="text-sm">Select a recording to view transcript and AI insights.</p>
          </div>
        )}

        {/* Voice Assistant Chat */}
        <div className="p-4 bg-slate-900/80 border-t border-slate-700 backdrop-blur-sm shrink-0">
          {assistant.response && (
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-200 animate-fade-in flex gap-3 shadow-inner">
              <Bot className="shrink-0 text-blue-400" size={18} />
              <div className="leading-relaxed">{assistant.response}</div>
            </div>
          )}
          <form onSubmit={handleAssistantAsk} className="relative">
            <input
              type="text"
              value={assistant.query}
              onChange={(e) => setAssistant(prev => ({ ...prev, query: e.target.value }))}
              placeholder="Ask AI about these logs..."
              className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-4 pr-12 py-3 text-sm text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={assistant.isThinking}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            >
              {assistant.isThinking ? (
                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Bot size={18} />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AudioLogger;
