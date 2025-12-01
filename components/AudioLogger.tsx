import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Search, Play, Square, UploadCloud, RefreshCw, Clock, FileText, Bot, Cpu, Wifi, WifiOff, AlertTriangle, Database, Terminal } from 'lucide-react';
import { askAssistant } from '../services/gemini';
import { getSupabaseClient } from '../services/supabase';
import { AudioLog } from '../types';

const AudioLogger: React.FC = () => {
  // --- STATE ---
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isContinuous, setIsContinuous] = useState(false);
  const [segmentDuration, setSegmentDuration] = useState(5);
  const [nextSplitIn, setNextSplitIn] = useState(0);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [logs, setLogs] = useState<AudioLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<AudioLog | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [serverLog, setServerLog] = useState<string>('Ready for upload...');
  
  const [assistantQuery, setAssistantQuery] = useState('');
  const [assistantResponse, setAssistantResponse] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // --- REFS ---
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const segmentTimerRef = useRef<number | null>(null);
  const isContinuousRef = useRef(false);
  const isRecordingRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isContinuousRef.current = isContinuous;
  }, [isContinuous]);

  useEffect(() => {
    isMountedRef.current = true;
    
    const storedConfig = localStorage.getItem('southport_config');
    if (storedConfig) {
      const config = JSON.parse(storedConfig);
      if (config.audioSegmentDuration) {
        setSegmentDuration(parseInt(config.audioSegmentDuration, 10));
      }
    }

    fetchLogs();

    return () => {
      isMountedRef.current = false;
      cleanupRecordingResources();
    };
  }, []);

  const cleanupRecordingResources = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (segmentTimerRef.current) clearInterval(segmentTimerRef.current);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    chunksRef.current = [];
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
      setIsConnected(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('audio_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (isMountedRef.current) {
        setIsConnected(true);
        
        if (data) {
          console.log(`📊 Fetched ${data.length} rows from Supabase`);
          
          const formattedLogs: AudioLog[] = data.map(item => ({
            id: item.id,
            timestamp: new Date(item.created_at).toLocaleString(),
            customerName: item.customer_name || 'Unknown',
            vehicle: item.vehicle || 'General Shop',
            duration: 'Recorded', 
            transcriptPreview: item.transcript || item.summary || 'Processing...',
            tags: item.tags || [],
            audioUrl: item.audio_url
          }));
          
          setLogs(prev => {
            const now = Date.now();
            
            const recentTempLogs = prev.filter(log => {
              if (!log.id.startsWith('temp-')) return false;
              const tempIdTimestamp = parseInt(log.id.replace('temp-', ''));
              const ageSeconds = (now - tempIdTimestamp) / 1000;
              
              if (ageSeconds >= 35) {
                console.log(`🗑️ Removing expired temp log (age: ${ageSeconds.toFixed(1)}s)`);
                return false;
              }
              return true;
            });
            
            console.log(`✅ Merged: ${formattedLogs.length} real + ${recentTempLogs.length} temp = ${formattedLogs.length + recentTempLogs.length} total`);
            
            const merged = [...formattedLogs, ...recentTempLogs];
            
            setDebugInfo(`Sync Success. Rows: ${merged.length} (${formattedLogs.length} real, ${recentTempLogs.length} temp)`);
            
            return merged;
          });
        }
      }
    } catch (err: any) {
      console.error("Supabase Error:", err);
      if (isMountedRef.current) {
        setIsConnected(false);
        const msg = err.message || "Failed to fetch data";
        setDbError(msg);
        setDebugInfo(`DB Error: ${msg}`);
      }
    }
  }, []);

  const handleTestSupabase = async () => {
    console.log('🧪 TESTING SUPABASE CONNECTION...');
    const supabase = getSupabaseClient();
    
    if (!supabase) {
      console.error('❌ No Supabase client');
      alert('No Supabase client - check Settings');
      return;
    }
    
    console.log('✅ Supabase client exists');

    try {
      const { data, error, count } = await supabase
        .from('audio_logs')
        .select('*', { count: 'exact' })
        .limit(10);
      
      console.log('📊 SUPABASE RESPONSE:', { data, error, count });

      if (error) {
        console.error('❌ Supabase error:', error);
        alert(`Supabase Error: ${error.message}\n\nCheck console for details.`);
        return;
      }
      
      if (data && data.length > 0) {
        console.log('✅ SUCCESS! Retrieved data:');
        data.forEach((row, i) => {
          console.log(`  ${i + 1}. ${row.customer_name} - ${row.vehicle}`);
        });
        alert(`SUCCESS! Found ${count} total records in database.\n\nRetrieved ${data.length} rows.\n\nCheck console for full details.`);
      } else {
        console.warn('⚠️ Query succeeded but returned no data');
        alert('Connected to Supabase, but no data found.');
      }
      
    } catch (err: any) {
      console.error('💥 Exception:', err);
      alert(`Exception: ${err.message}\n\nCheck console for stack trace.`);
    }
  };

  const startNewSegment = async () => {
    cleanupRecordingResources();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];
        
        await handleUpload(blob);

        if (isMountedRef.current && isRecordingRef.current && isContinuousRef.current) {
          console.log("🔄 Starting next continuous segment...");
          setRecordingTime(0);
          startNewSegment();
        } else {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
          }
          if (isMountedRef.current) {
            setIsRecording(false);
            setServerLog("Recording stopped.");
          }
        }
      };

      recorder.start();
      
      if (isMountedRef.current) {
        setIsRecording(true);
        isRecordingRef.current = true;
        setServerLog("Recording started...");
        startTimers();
      }

    } catch (err: any) {
      console.error("Mic Error:", err);
      setServerLog("Microphone Access Denied");
      alert("Microphone error: " + err.message);
      setIsRecording(false);
      isRecordingRef.current = false;
    }
  };

  const startTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (segmentTimerRef.current) clearInterval(segmentTimerRef.current);

    setRecordingTime(0);
    timerRef.current = window.setInterval(() => {
      if (isMountedRef.current) setRecordingTime(t => t + 1);
    }, 1000);

    if (isContinuous) {
      const splitSeconds = segmentDuration * 60;
      setNextSplitIn(splitSeconds);
      
      segmentTimerRef.current = window.setInterval(() => {
        if (!isMountedRef.current) return;
        setNextSplitIn(prev => {
          if (prev <= 1) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop();
            }
            return splitSeconds;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      cleanupRecordingResources();
      setIsRecording(false);
    }
  };

  const handleUpload = async (audioBlob: Blob) => {
    if (!isMountedRef.current) return;
    setIsProcessing(true);

    const storedConfig = localStorage.getItem('southport_config');
    const config = storedConfig ? JSON.parse(storedConfig) : {};
    const webhookUrl = config.n8nWebhookAudio;

    if (!webhookUrl) {
      setServerLog("Error: No Webhook URL in Settings");
      setIsProcessing(false);
      return;
    }

    if (audioBlob.size === 0) {
      setServerLog("Error: Empty audio file");
      setIsProcessing(false);
      return;
    }

    const tempId = 'temp-' + Date.now();
    const tempLog: AudioLog = {
      id: tempId,
      timestamp: new Date().toLocaleTimeString(),
      customerName: 'Uploading...',
      vehicle: 'Processing',
      duration: formatTime(recordingTime || (segmentDuration * 60)),
      transcriptPreview: 'Sending to AI...',
      tags: ['Upload'],
      audioUrl: ''
    };
    
    console.log(`📤 Creating temp log: ${tempId}`);
    setLogs(prev => [tempLog, ...prev]);

    try {
      setServerLog(`Uploading ${(audioBlob.size / 1024).toFixed(1)} KB...`);
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm'); 

      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
      });

      const text = await response.text();
      console.log("Server Response:", text);

      if (!response.ok) {
        throw new Error(`Server responded ${response.status}: ${text}`);
      }

      setServerLog(`Upload Success! AI is analyzing...`);
      
      const poll = (delay: number, attempt: number) => {
        setTimeout(() => {
          if (isMountedRef.current) {
            console.log(`🔍 Poll #${attempt} at ${delay}ms...`);
            fetchLogs();
            if (attempt === 4) {
              setServerLog("Data synced from database");
            }
          }
        }, delay);
      };

      poll(5000, 1);
      poll(10000, 2);
      poll(20000, 3);
      poll(30000, 4);

    } catch (error: any) {
      console.error("Upload Error:", error);
      setServerLog(`Upload Failed: ${error.message}`);
      setLogs(prev => prev.filter(l => l.id !== tempId));
    } finally {
      if (isMountedRef.current) setIsProcessing(false);
    }
  };

  const handlePlayAudio = (url?: string) => {
    if (!url) return;
    try {
      const audio = new Audio(url);
      audio.play().catch(e => alert("Playback error: " + e.message));
    } catch (e) {
      console.error("Audio playback error", e);
    }
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
      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-4 shadow-sm">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <span className={`flex items-center gap-1.5 px-2 py-1 rounded ${isConnected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
                {isConnected ? "DB Connected" : "DB Offline"}
              </span>
              <span className="font-mono opacity-50 hidden sm:inline">{debugInfo}</span>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={handleTestSupabase}
                className="hover:text-yellow-400 text-yellow-500 flex items-center gap-1 font-bold bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/30 text-[10px]"
              >
                🧪 TEST DB
              </button>
              
              <button onClick={fetchLogs} className="hover:text-white flex items-center gap-1 transition-colors">
                <RefreshCw size={12}/> Refresh
              </button>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg font-mono text-[11px] text-green-400 flex gap-3 items-center overflow-hidden">
             <Terminal size={12} className="shrink-0 text-slate-500" />
             <span className="truncate">{serverLog}</span>
          </div>

          {dbError && (
             <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs flex items-center gap-2">
               <AlertTriangle size={14} className="shrink-0" />
               <span>{dbError}</span>
             </div>
          )}
          
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Search logs..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
              />
            </div>
            
            {isRecording ? (
              <button 
                onClick={stopRecording}
                className="w-full md:w-auto flex items-center justify-center gap-3 px-6 py-3 rounded-lg font-bold bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20 transition-all animate-pulse"
              >
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <Square size={18} fill="currentColor" />
                <span className="font-mono tabular-nums">{formatTime(recordingTime)}</span>
                <span className="text-xs font-semibold ml-1">STOP</span>
              </button>
            ) : (
              <button 
                onClick={startNewSegment}
                disabled={isProcessing}
                className={`w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isContinuous ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'
                }`}
              >
                {isProcessing ? (
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
          
          <div className="flex items-center justify-between text-sm pt-2">
             <div 
               onClick={() => !isRecording && setIsContinuous(!isContinuous)}
               className={`flex items-center gap-2 cursor-pointer select-none px-3 py-1.5 rounded-md border transition-all ${
                 isContinuous 
                   ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' 
                   : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'
               } ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
             >
                <RefreshCw size={14} className={isContinuous ? "animate-spin" : ""} />
                <span className="font-medium">Continuous Monitor Mode</span>
             </div>
             
             {isContinuous && (
               <div className="text-xs text-slate-500 flex items-center gap-3">
                 <span className="flex items-center gap-1"><Clock size={12} /> {segmentDuration}m segments</span>
                 {isRecording && <span className="text-purple-400 font-mono">Next split: {formatTime(nextSplitIn)}</span>}
               </div>
             )}
          </div>
        </div>

        <div className="flex-1 bg-slate-800/50 rounded-xl border border-slate-700 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {filteredLogs.length > 0 ? (
            filteredLogs.map(log => (
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
                     <h4 className={`font-bold ${log.customerName === 'Unknown' || log.customerName === 'Uploading...' ? 'text-slate-400' : 'text-white'}`}>
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
                <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed">{log.transcriptPreview}</p>
                {log.tags && log.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {log.tags.slice(0,3).map((tag, i) => (
                      <span key={i} className="text-[10px] bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded-full border border-slate-600">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3 opacity-60">
              <Database size={40} className="stroke-1" />
              <p className="text-sm">No audio logs found.</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 flex flex-col overflow-hidden shadow-xl">
        {selectedLog ? (
          <div className="flex-1 p-6 overflow-y-auto">
             <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-700">
               <div>
                 <h3 className="text-lg font-bold text-white">Transcript Details</h3>
                 <p className="text-slate-400 text-xs mt-1">ID: {selectedLog.id.substring(0,8)}</p>
               </div>
               {selectedLog.audioUrl && (
                  <button 
                    onClick={() => handlePlayAudio(selectedLog.audioUrl)}
                    className="p-3 bg-blue-600 rounded-full hover:bg-blue-500 text-white shadow-lg transition-transform active:scale-95"
                  >
                    <Play size={18} fill="currentColor" />
                  </button>
               )}
             </div>
             
             <div className="space-y-6">
               <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Transcript</span>
                  <p className="text-slate-300 leading-relaxed text-sm font-mono whitespace-pre-wrap">{selectedLog.transcriptPreview}</p>
               </div>
               
               <div>
                 <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><Cpu size={14} className="text-purple-400"/> AI Analysis</h4>
                 <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-700/30 p-3 rounded border border-slate-700">
                      <div className="text-[10px] text-slate-500 uppercase">Customer</div>
                      <div className="text-sm text-white font-medium truncate">{selectedLog.customerName}</div>
                    </div>
                    <div className="bg-slate-700/30 p-3 rounded border border-slate-700">
                      <div className="text-[10px] text-slate-500 uppercase">Vehicle</div>
                      <div className="text-sm text-white font-medium truncate">{selectedLog.vehicle}</div>
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

        <div className="p-4 bg-slate-900/80 border-t border-slate-700 backdrop-blur-sm">
          {assistantResponse && (
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-200 animate-fade-in flex gap-3 shadow-inner">
              <Bot className="shrink-0 text-blue-400" size={18} />
              <div className="leading-relaxed">{assistantResponse}</div>
            </div>
          )}
          <form onSubmit={handleAssistantAsk} className="relative">
            <input 
              type="text" 
              value={assistantQuery}
              onChange={(e) => setAssistantQuery(e.target.value)}
              placeholder="Ask AI about these logs..."
              className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-4 pr-12 py-3 text-sm text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
            <button 
              type="submit" 
              disabled={isThinking}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            >
              {isThinking ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div> : <Bot size={18} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AudioLogger;
