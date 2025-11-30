
import React, { useState, useEffect, useRef } from 'react';
import { Mic, Search, Play, Square, UploadCloud, RefreshCw, Clock, FileText, Bot, Cpu, Wifi, WifiOff, AlertTriangle, Database } from 'lucide-react';
import { askAssistant } from '../services/gemini';
import { getSupabaseClient } from '../services/supabase';
import { AudioLog } from '../types';

const AudioLogger: React.FC = () => {
  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
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
  
  // Assistant State
  const [assistantQuery, setAssistantQuery] = useState('');
  const [assistantResponse, setAssistantResponse] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const chunks = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const segmentTimerRef = useRef<number | null>(null);
  const isContinuousRef = useRef(false);
  const isRecordingRef = useRef(false);

  // Load settings and fetch data
  useEffect(() => {
    const storedConfig = localStorage.getItem('southport_config');
    if (storedConfig) {
      const config = JSON.parse(storedConfig);
      if (config.audioSegmentDuration) {
        setSegmentDuration(parseInt(config.audioSegmentDuration, 10));
      }
    }
    fetchLogs();
  }, []);

  // Sync ref with state
  useEffect(() => {
    isContinuousRef.current = isContinuous;
  }, [isContinuous]);

  const fetchLogs = async () => {
    setDbError(null);
    setDebugInfo('Connecting...');
    const supabase = getSupabaseClient();
    
    if (!supabase) {
      const msg = "Missing API Keys in Settings";
      setDbError(msg);
      setDebugInfo(msg);
      return;
    }

    try {
      // Simple fetch to verify connection
      const { data, error, count } = await supabase
        .from('audio_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setDebugInfo(`Success. Found ${data?.length || 0} logs.`);

      if (data) {
        setIsConnected(true);
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
    } catch (err: any) {
      console.error("Error fetching logs:", err);
      setIsConnected(false);
      const msg = err.message || "Failed to connect to Supabase";
      setDbError(msg);
      setDebugInfo(`Error: ${msg}`);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        chunks.current = [];
        await handleUpload(blob);

        // Auto-Restart Logic for Continuous Mode
        if (isRecordingRef.current && isContinuousRef.current) {
          console.log("Auto-restarting recording segment...");
          recorder.start();
          setRecordingTime(0);
          resetSegmentTimer();
        } else {
          // Full stop
          stream.getTracks().forEach(track => track.stop());
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      isRecordingRef.current = true;
      
      // Main Timer
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Segment Timer (if continuous)
      if (isContinuous) {
        resetSegmentTimer(recorder);
      }

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const resetSegmentTimer = (activeRecorder?: MediaRecorder) => {
    if (segmentTimerRef.current) clearInterval(segmentTimerRef.current);
    
    // Calculate split time in seconds
    const splitSeconds = segmentDuration * 60;
    setNextSplitIn(splitSeconds);

    segmentTimerRef.current = window.setInterval(() => {
      setNextSplitIn(prev => {
        if (prev <= 1) {
          // Trigger split
          const recorder = activeRecorder || mediaRecorder;
          if (recorder && recorder.state === 'recording') {
            recorder.stop(); // This triggers onstop, which triggers restart
          }
          return splitSeconds;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    isRecordingRef.current = false; // Signal intent to fully stop
    setIsRecording(false);
    
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (segmentTimerRef.current) {
      clearInterval(segmentTimerRef.current);
      segmentTimerRef.current = null;
    }
  };

  const handleUpload = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    // Check for configured Webhook
    const storedConfig = localStorage.getItem('southport_config');
    const config = storedConfig ? JSON.parse(storedConfig) : {};
    const webhookUrl = config.n8nWebhookAudio;

    if (webhookUrl) {
      try {
        console.log("Uploading audio blob size:", audioBlob.size);
        
        if (audioBlob.size === 0) {
             console.warn("Audio blob was empty, skipping upload");
             setIsProcessing(false);
             return;
        }

        const formData = new FormData();
        // FIELD NAME IS 'file' - Ensure n8n Webhook or Whisper node looks for 'file'
        formData.append('file', audioBlob, `recording_${Date.now()}.webm`);
        formData.append('timestamp', new Date().toISOString());
        
        // Fire and forget upload to n8n
        fetch(webhookUrl, { method: 'POST', body: formData })
          .then(async (res) => {
             const text = await res.text();
             console.log("Webhook response:", text);
          })
          .catch(err => console.error("Webhook error", err));

        // Add a temporary optimistic log
        const newLog: AudioLog = {
          id: 'temp-' + Date.now(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          customerName: 'Processing...',
          vehicle: 'Upload Sent',
          duration: formatTime(recordingTime > 0 ? recordingTime : (segmentDuration * 60)),
          transcriptPreview: "Audio sent to AI. Refresh shortly to see analysis.",
          tags: ['Uploading'],
          audioUrl: URL.createObjectURL(audioBlob)
        };
        
        setLogs(prev => [newLog, ...prev]);
        
        // Poll for updates after 10 seconds
        setTimeout(fetchLogs, 10000);
        
      } catch (error) {
        console.error("Upload setup failed", error);
        alert("Failed to upload audio to n8n. Check webhook URL.");
      }
    } else {
      alert("Please configure n8n Webhook in Settings first.");
    }
    
    setIsProcessing(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAssistantAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistantQuery.trim()) return;
    
    setIsThinking(true);
    const context = logs.slice(0, 10).map(l => `[${l.timestamp}] ${l.customerName}: ${l.transcriptPreview}`).join('\n');
    
    const response = await askAssistant(assistantQuery, context);
    setAssistantResponse(response);
    setIsThinking(false);
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
            <span className="font-mono text-xs opacity-50">DB Status: {debugInfo}</span>
            <button onClick={fetchLogs} className="hover:text-white flex items-center gap-1"><RefreshCw size={12}/> Refresh Logs</button>
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
                onClick={startRecording}
                disabled={isProcessing}
                className={`w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${
                  isContinuous ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'
                }`}
              >
                {isProcessing ? (
                  <>
                    <UploadCloud size={20} className="animate-bounce" />
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
                <RefreshCw size={14} className={isContinuous ? "animate-spin-slow" : ""} />
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
                    onClick={() => {
                      const audio = new Audio(selectedLog.audioUrl);
                      audio.play();
                    }}
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
          <form onSubmit={handleAssistantAsk} className="relative">
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

