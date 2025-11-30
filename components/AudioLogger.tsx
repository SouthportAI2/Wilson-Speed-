import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Search, Play, Square, UploadCloud, RefreshCw, Clock, FileText, Bot, Cpu, Wifi, WifiOff, AlertTriangle, Database, Terminal } from 'lucide-react';
import { askAssistant } from '../services/gemini';
import { getSupabaseClient } from '../services/supabase';
import { AudioLog } from '../types';

const AudioLogger: React.FC = () => {
  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isContinuous, setIsContinuous] = useState(false);
  const [segmentDuration, setSegmentDuration] = useState(5); // Default 5 minutes
  const [nextSplitIn, setNextSplitIn] = useState(0);
  
  // Data State
  const [searchQuery, setSearchQuery] = useState('');
  const [logs, setLogs] = useState<AudioLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<AudioLog | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [serverLog, setServerLog] = useState<string>('Ready for upload...');
  
  // Assistant State
  const [assistantQuery, setAssistantQuery] = useState('');
  const [assistantResponse, setAssistantResponse] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // Refs for stability
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const segmentTimerRef = useRef<number | null>(null);
  const isContinuousRef = useRef(false);
  const isRecordingRef = useRef(false);
  const isMountedRef = useRef(true);

  // Sync ref with state
  useEffect(() => {
    isContinuousRef.current = isContinuous;
  }, [isContinuous]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanupRecordingResources();
    };
  }, []);

  // Load settings
  useEffect(() => {
    const storedConfig = localStorage.getItem('southport_config');
    if (storedConfig) {
      const config = JSON.parse(storedConfig);
      if (config.audioSegmentDuration) {
        setSegmentDuration(parseInt(config.audioSegmentDuration, 10));
      }
    }
  }, []);

  const cleanupRecordingResources = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (segmentTimerRef.current) clearInterval(segmentTimerRef.current);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const fetchLogs = useCallback(async () => {
    if (!isMountedRef.current) return;

    setDbError(null);
    setDebugInfo('Connecting to DB...');
    const supabase = getSupabaseClient();
    
    if (!supabase) {
      const msg = "Missing API Keys in Settings";
      setDbError(msg);
      setDebugInfo(msg);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('audio_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (isMountedRef.current) {
        setDebugInfo(`Success. Rows: ${data?.length || 0}`);
        setIsConnected(true);
        
        if (data) {
          const formattedLogs: AudioLog[] = data.map(item => ({
            id: item.id,
            timestamp: new Date(item.created_at).toLocaleString(),
            customerName: item.customer_name || 'Unknown',
            vehicle: item.vehicle || 'General Shop',
            duration: 'Recorded', 
            transcriptPreview: item.transcript || item.summary || 'Processing or Empty Log...',
            tags: item.tags || [],
            audioUrl: item.audio_url
          }));
          setLogs(formattedLogs);
        }
      }
    } catch (err: any) {
      console.error("Error fetching logs:", err);
      if (isMountedRef.current) {
        setIsConnected(false);
        const msg = err.message || "Failed to connect to Supabase";
        setDbError(msg);
        setDebugInfo(`DB Error: ${msg}`);
      }
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const startNewSegment = async () => {
    try {
      // 1. Get Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // 2. Create Recorder
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        // Prepare blob
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = []; // Clear immediately
        
        // Clean up stream for this segment
        stream.getTracks().forEach(track => track.stop());

        // Upload
        await handleUpload(blob);

        // Check if we should restart
        if (isMountedRef.current && isRecordingRef.current && isContinuousRef.current) {
          console.log("Starting next continuous segment...");
          setRecordingTime(0);
          startNewSegment(); // Recursively start next segment
        } else {
          setIsRecording(false);
          isRecordingRef.current = false;
        }
      };

      // 3. Start Recording
      recorder.start();
      
      // 4. Update State
      if (isMountedRef.current) {
        setIsRecording(true);
        isRecordingRef.current = true;
        setServerLog("Recording segment...");
      }

      // 5. Start Timers
      startTimers();

    } catch (err) {
      console.error("Error starting recording:", err);
      setServerLog("Microphone Access Denied");
      alert("Could not access microphone.");
      setIsRecording(false);
      isRecordingRef.current = false;
    }
  };

  const startTimers = () => {
    // Clear existing
    if (timerRef.current) clearInterval(timerRef.current);
    if (segmentTimerRef.current) clearInterval(segmentTimerRef.current);

    // Main Timer (Visual only)
    setRecordingTime(0);
    timerRef.current = window.setInterval(() => {
      if (isMountedRef.current) {
        setRecordingTime(prev => prev + 1);
      }
    }, 1000);

    // Segment Timer (Logic)
    if (isContinuous) {
      const splitSeconds = segmentDuration * 60;
      setNextSplitIn(splitSeconds);
      
      segmentTimerRef.current = window.setInterval(() => {
        if (!isMountedRef.current) return;
        
        setNextSplitIn(prev => {
          if (prev <= 1) {
            // Trigger Split
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop(); // This triggers onstop -> which triggers restart
            }
            return splitSeconds;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const stopRecording = () => {
    isRecordingRef.current = false; // Prevent auto-restart
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    cleanupRecordingResources();
    setIsRecording(false);
  };

  const handleUpload = async (audioBlob: Blob) => {
    if (!isMountedRef.current) return;
    
    setIsProcessing(true);
    
    if (audioBlob.size === 0) {
      setServerLog("Empty audio file, skipping.");
      setIsProcessing(false);
      return;
    }

    const storedConfig = localStorage.getItem('southport_config');
    const config = storedConfig ? JSON.parse(storedConfig) : {};
    const webhookUrl = config.n8nWebhookAudio;

    if (!webhookUrl) {
      setServerLog("No Webhook URL configured.");
      setIsProcessing(false);
      return;
    }

    // Optimistic UI Update
    const tempId = 'temp-' + Date.now();
    const tempLog: AudioLog = {
      id: tempId,
      timestamp: new Date().toLocaleTimeString(),
      customerName: 'Uploading...',
      vehicle: 'Processing',
      duration: '...',
      transcriptPreview: 'Sending to AI...',
      tags: ['Upload'],
      audioUrl: ''
    };
    setLogs(prev => [tempLog, ...prev]);

    try {
      setServerLog(`Uploading ${audioBlob.size} bytes...`);
      const formData = new FormData();
      formData.append('file', audioBlob, `rec-${Date.now()}.webm`);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData
      });

      const text = await response.text();
      
      if (!response.ok) {
        throw new Error(`Server Error: ${response.status} ${text}`);
      }

      setServerLog(`Success: ${text.substring(0, 50)}...`);
      
      // Poll for the real log
      setTimeout(() => {
        if (isMountedRef.current) fetchLogs();
      }, 5000);

    } catch (error: any) {
      console.error("Upload failed", error);
      setServerLog(`Error: ${error.message}`);
      // Remove temp log on error
      setLogs(prev => prev.filter(l => l.id !== tempId));
    } finally {
      if (isMountedRef.current) setIsProcessing(false);
    }
  };

  const handlePlayAudio = (url?: string) => {
    if (!url) return;
    try {
      const audio = new Audio(url);
      audio.play().catch(e => alert("Could not play audio: " + e.message));
    } catch (e) {
      console.error("Audio error", e);
    }
  };

  // Helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredLogs = logs.filter(log => 
    !searchQuery || 
    log.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.vehicle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.transcriptPreview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
      {/* Left Column: Search & List */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        {/* Controls */}
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-4">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1">
              {isConnected ? <Wifi size={12} className="text-green-500" /> : <WifiOff size={12} className="text-red-500" />}
              {isConnected ? "Database Connected" : "Offline / Connecting..."}
            </span>
            <span className="font-mono text-xs opacity-50">{debugInfo}</span>
            <button onClick={fetchLogs} className="hover:text-white flex items-center gap-1"><RefreshCw size={12}/> Refresh Logs</button>
          </div>
          
          {/* Server Response Panel */}
          <div className="bg-black/30 border border-slate-700 p-2 rounded font-mono text-[10px] text-green-400 flex gap-2 items-center overflow-hidden whitespace-nowrap">
             <Terminal size={12} className="shrink-0" />
             <span className="truncate">{serverLog}</span>
          </div>
          
          {dbError && (
             <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-xs flex items-center gap-2">
               <AlertTriangle size={14} />
               <span><strong>Connection Error:</strong> {dbError}</span>
             </div>
          )}
          
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="Search logs..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            
            {isRecording ? (
              <button 
                onClick={stopRecording}
                className="w-full md:w-auto flex items-center justify-center gap-3 px-6 py-3 rounded-lg font-bold bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500/30 transition-all animate-pulse"
              >
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <Square size={20} fill="currentColor" />
                <span>{formatTime(recordingTime)}</span>
                <span className="text-xs font-normal opacity-80 ml-1">STOP</span>
              </button>
            ) : (
              <button 
                onClick={startNewSegment}
                disabled={isProcessing}
                className={`w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${
                  isContinuous ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'
                }`}
              >
                {isProcessing ? (
                  <>
                    <UploadCloud size={20} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Mic size={20} />
                    {isContinuous ? 'Start Monitor' : 'Start Recording'}
                  </>
                )}
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-slate-400">
             <div 
               onClick={() => !isRecording && setIsContinuous(!isContinuous)}
               className={`flex items-center gap-2 cursor-pointer select-none px-3 py-1.5 rounded-lg border transition-all ${
                 isContinuous 
                   ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' 
                   : 'bg-slate-900 border-slate-700 hover:border-slate-600'
               } ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
             >
                <RefreshCw size={14} className={isContinuous ? "animate-spin" : ""} />
                <span className="font-medium">Continuous Monitor Mode</span>
             </div>
             
             {isContinuous && (
               <span className="text-xs flex items-center gap-1">
                 <Clock size={12} />
                 Auto-splits every {segmentDuration} min
               </span>
             )}

             {isRecording && isContinuous && (
               <span className="ml-auto text-xs text-purple-400 font-mono">
                 Next upload in: {formatTime(nextSplitIn)}
               </span>
             )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 bg-slate-800/50 rounded-xl border border-slate-700 overflow-y-auto p-4 space-y-3">
          {filteredLogs.length > 0 ? (
            filteredLogs.map(log => (
              <div 
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedLog?.id === log.id 
                    ? 'bg-blue-600/10 border-blue-500' 
                    : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                     <h4 className="font-bold text-white">{log.customerName}</h4>
                     <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded mr-2">{log.vehicle}</span>
                     <span className="text-xs text-slate-500">{log.timestamp}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    {log.duration}
                  </div>
                </div>
                <p className="text-slate-400 text-sm line-clamp-2">{log.transcriptPreview}</p>
                <div className="flex gap-2 mt-2">
                  {log.tags && log.tags.map(tag => (
                    <span key={tag} className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">#{tag}</span>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-slate-500 py-10 flex flex-col items-center">
              <Database size={32} className="mb-2 opacity-20" />
              <p>No audio logs found in Database.</p>
              <p className="text-xs mt-1 opacity-50">{debugInfo}</p>
              {!isConnected && <p className="text-xs text-red-400 mt-2">Check Database Connection in Settings</p>}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Assistant & Details */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 flex flex-col overflow-hidden">
        {selectedLog ? (
          <div className="flex-1 p-6 overflow-y-auto">
             <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-700">
               <div>
                 <h3 className="text-xl font-bold text-white">Transcript Details</h3>
                 <p className="text-slate-400 text-sm">{selectedLog.timestamp}</p>
               </div>
               {selectedLog.audioUrl && (
                  <button 
                    onClick={() => handlePlayAudio(selectedLog.audioUrl)}
                    className="p-3 bg-blue-600 rounded-full hover:bg-blue-500 text-white shadow-lg transition-transform active:scale-95"
                  >
                    <Play size={20} fill="currentColor" />
                  </button>
               )}
             </div>
             
             <div className="prose prose-invert max-w-none">
               <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 mb-4">
                  <p className="text-slate-300 leading-relaxed font-mono text-sm">{selectedLog.transcriptPreview}</p>
               </div>
               
               <h4 className="font-semibold text-white mb-2 flex items-center gap-2"><Cpu size={16} /> AI Analysis</h4>
               <ul className="list-disc list-inside text-slate-400 text-sm space-y-1 mb-6">
                 <li>Customer: <span className="text-white">{selectedLog.customerName}</span></li>
                 <li>Vehicle: <span className="text-white">{selectedLog.vehicle}</span></li>
               </ul>
             </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
            <FileText size={48} className="mb-4 opacity-20" />
            <p>Select a recording to view transcript and AI insights.</p>
          </div>
        )}

        {/* Voice Assistant Chat */}
        <div className="p-4 bg-slate-900/80 border-t border-slate-700">
          {assistantResponse && (
            <div className="mb-4 p-3 bg-blue-600/20 border border-blue-500/30 rounded-lg text-sm text-blue-100 animate-fade-in flex gap-3">
              <Bot className="shrink-0 text-blue-400" size={20} />
              <div>{assistantResponse}</div>
            </div>
          )}
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              if (!assistantQuery.trim()) return;
              setIsThinking(true);
              const context = logs.slice(0, 10).map(l => `[${l.timestamp}] ${l.customerName}: ${l.transcriptPreview}`).join('\n');
              const response = await askAssistant(assistantQuery, context);
              setAssistantResponse(response);
              setIsThinking(false);
            }} 
            className="relative"
          >
            <input 
              type="text" 
              value={assistantQuery}
              onChange={(e) => setAssistantQuery(e.target.value)}
              placeholder="Ask AI about these logs..."
              className="w-full bg-slate-800 border border-slate-600 rounded-full pl-4 pr-12 py-3 text-sm text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
            <button 
              type="submit" 
              disabled={isThinking}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 rounded-full text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {isThinking ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Bot size={16} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AudioLogger;
