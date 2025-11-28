
import React, { useState, useEffect, useRef } from 'react';
import { Mic, Search, Play, Pause, FileText, Bot, Cpu, Square, UploadCloud, AlertCircle, RefreshCw, Clock } from 'lucide-react';
import { askAssistant } from '../services/gemini';
import { AudioLog } from '../types';

const MOCK_LOGS: AudioLog[] = [
  {
    id: '1',
    timestamp: 'Today, 10:30 AM',
    customerName: 'Sarah Jenkins',
    vehicle: '2018 Honda CR-V',
    duration: '04:12',
    transcriptPreview: "Customer states distinct rattling noise coming from the passenger side when idling. Suspect heat shield loose or catalytic converter issue. Scheduled for diagnostic...",
    tags: ['Rattle', 'Honda', 'Heat Shield']
  },
  {
    id: '2',
    timestamp: 'Today, 11:15 AM',
    customerName: 'Mike Ross',
    vehicle: '2020 Ford F-150',
    duration: '02:45',
    transcriptPreview: "Oil change completed. Noticed rear brake pads are at 3mm. Recommend replacement before winter. Customer declined for now, noted on invoice...",
    tags: ['Brakes', 'Maintenance', 'Declined Service']
  },
  {
    id: '3',
    timestamp: 'Yesterday, 3:45 PM',
    customerName: 'Shop Floor',
    vehicle: 'Internal',
    duration: '15:20',
    transcriptPreview: "Team meeting regarding the new lift installation. Safety protocols reviewed. Parts for the BMW 3-series are delayed until Tuesday...",
    tags: ['Meeting', 'Parts Delay', 'BMW']
  }
];

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
  const [logs, setLogs] = useState<AudioLog[]>(MOCK_LOGS);
  const [selectedLog, setSelectedLog] = useState<AudioLog | null>(null);
  
  // Assistant State
  const [assistantQuery, setAssistantQuery] = useState('');
  const [assistantResponse, setAssistantResponse] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const chunks = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const segmentTimerRef = useRef<number | null>(null);
  const isContinuousRef = useRef(false); // Ref for access inside closures
  const isRecordingRef = useRef(false); // Ref to track actual intent vs auto-restart

  // Load settings on mount
  useEffect(() => {
    const storedConfig = localStorage.getItem('southport_config');
    if (storedConfig) {
      const config = JSON.parse(storedConfig);
      if (config.audioSegmentDuration) {
        setSegmentDuration(parseInt(config.audioSegmentDuration, 10));
      }
    }
  }, []);

  // Sync ref with state
  useEffect(() => {
    isContinuousRef.current = isContinuous;
  }, [isContinuous]);

  // Search Logic
  useEffect(() => {
    if (!searchQuery) {
      setLogs(MOCK_LOGS);
    } else {
      const lower = searchQuery.toLowerCase();
      const filtered = MOCK_LOGS.filter(log => 
        log.customerName.toLowerCase().includes(lower) ||
        log.vehicle.toLowerCase().includes(lower) ||
        log.transcriptPreview.toLowerCase().includes(lower) ||
        log.tags.some(t => t.toLowerCase().includes(lower))
      );
      setLogs(filtered);
    }
  }, [searchQuery]);

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
      // Stream tracks are stopped in onstop when !isRecordingRef.current
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
        const formData = new FormData();
        formData.append('file', audioBlob, `recording_${Date.now()}.webm`);
        formData.append('timestamp', new Date().toISOString());
        
        // Fire and forget upload to n8n (don't await if in continuous mode to keep UI snappy)
        fetch(webhookUrl, { method: 'POST', body: formData })
          .then(res => res.json())
          .catch(err => console.error("Webhook error", err));

        // Simulate a new log entry immediately for feedback
        const newLog: AudioLog = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          customerName: 'Auto-Log Segment',
          vehicle: 'Shop Floor',
          duration: formatTime(recordingTime > 0 ? recordingTime : (segmentDuration * 60)),
          transcriptPreview: "Audio segment uploaded to n8n. Processing transcription...",
          tags: ['Auto-Segment', 'Processing'],
          audioUrl: URL.createObjectURL(audioBlob)
        };
        
        setLogs(prev => [newLog, ...prev]);
        
      } catch (error) {
        console.error("Upload setup failed", error);
      }
    } else {
      // Fallback Demo Mode
      await new Promise(resolve => setTimeout(resolve, 500));
      const newLog: AudioLog = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        customerName: 'Demo Segment',
        vehicle: 'Office Mic',
        duration: formatTime(recordingTime > 0 ? recordingTime : (segmentDuration * 60)),
        transcriptPreview: "(Demo) Segment saved. Configure n8n webhook to transcribe real-time.",
        tags: ['Local Demo', 'Continuous'],
        audioUrl: URL.createObjectURL(audioBlob)
      };
      setLogs(prev => [newLog, ...prev]);
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
      {/* Left Column: Search & List */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        {/* Controls */}
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="Search by vehicle, customer, or keyword..." 
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
          {logs.map(log => (
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
                  <Play size={14} /> {log.duration}
                </div>
              </div>
              <p className="text-slate-400 text-sm line-clamp-2">{log.transcriptPreview}</p>
              <div className="flex gap-2 mt-2">
                {log.tags.map(tag => (
                  <span key={tag} className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">#{tag}</span>
                ))}
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-center text-slate-500 py-10">No logs found matching your search.</div>
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
                 <p className="text-slate-400 text-sm">{selectedLog.id} • {selectedLog.timestamp}</p>
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
                 <li>Detected Issue: <span className="text-white">Reviewing...</span></li>
                 <li>Sentiment: <span className="text-white">Neutral</span></li>
                 <li>Action Item: <span className="text-white">Log only</span></li>
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
