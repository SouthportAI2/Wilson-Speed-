import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, RefreshCw, Clock, HardDrive, ChevronDown, ChevronUp, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { getSupabaseClient } from '../services/supabaseClient';
import { AudioLog } from '../types';

const CONFIG_KEY = 'southport_config';
const LOCAL_LOGS_KEY = 'southport_audio_cache_v3';
const SILENCE_THRESHOLD = 10;
const SILENCE_DURATION = 10000; // 10 seconds
const MAX_RECORDING_DURATION = 300000; // 5 minutes

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

interface RetryQueueItem {
  id: string;
  audioData: string;
  metadata: any;
  attempts: number;
  timestamp: number;
}

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
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [retryQueue, setRetryQueue] = useState<RetryQueueItem[]>([]);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const durationTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const toggleExpand = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const deleteLog = async (logId: string) => {
    if (!confirm('Delete this conversation? This cannot be undone.')) {
      return;
    }

    const supabase = getSupabaseClient();
    
    // Remove from UI immediately
    setLogs(prev => prev.filter(log => log.id !== logId));
    
    // Remove from cloud if it exists there
    if (supabase && !logId.startsWith('audio-')) {
      try {
        await supabase
          .from('audio_logs')
          .delete()
          .eq('id', logId);
      } catch (err) {
        console.error('Failed to delete from cloud:', err);
      }
    }
    
    // Remove from local cache
    const localData = localStorage.getItem(LOCAL_LOGS_KEY);
    if (localData) {
      const cachedLogs: AudioLog[] = JSON.parse(localData);
      const filtered = cachedLogs.filter(log => log.id !== logId);
      localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(filtered));
    }
  };

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
          .limit(100);

        if (!error && data) {
          cloudLogs = data.map(item => {
            return {
              id: item.id.toString(),
              timestamp: new Date(item.created_at).toLocaleString(),
              customerName: item.customer_name || 'Customer',
              vehicle: item.vehicle || '',
              duration: item.duration || 'N/A',
              transcriptPreview: item.summary_bullet || 'Processing...',
              fullTranscript: item.transcript || '',
              tags: item.tags || ['CLOUD'],
            };
          });
        }
      } catch (err) {
        console.warn("Cloud connection limited:", err);
      }
    }

    const localData = localStorage.getItem(LOCAL_LOGS_KEY);
    const cachedLogs: AudioLog[] = localData ? JSON.parse(localData) : [];

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

  const saveToRetryQueue = (audioBlob: Blob, metadata: any) => {
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = () => {
      const queue = JSON.parse(localStorage.getItem('upload_retry_queue') || '[]');
      queue.push({
        id: metadata.id,
        audioData: reader.result as string,
        metadata: metadata,
        attempts: 0,
        timestamp: Date.now()
      });
      localStorage.setItem('upload_retry_queue', JSON.stringify(queue));
      setRetryQueue(queue);
    };
  };

  const detectSilence = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const checkAudio = () => {
      if (!isRecording) return;

      analyser.getByteFrequencyData(dataArray);
      const volume = dataArray.reduce((a, b) => a + b) / bufferLength;
      
      if (volume < SILENCE_THRESHOLD) {
        if (!silenceStartRef.current) {
          silenceStartRef.current = Date.now();
        } else if (Date.now() - silenceStartRef.current > SILENCE_DURATION) {
          console.log('Silence detected - auto-stopping');
          stopRecording();
          return;
        }
      } else {
        silenceStartRef.current = null;
      }

      if (recordingStartTimeRef.current && Date.now() - recordingStartTimeRef.current > MAX_RECORDING_DURATION) {
        console.log('Max duration reached - auto-stopping');
        stopRecording();
        return;
      }
      
      if (isRecording) {
        requestAnimationFrame(checkAudio);
      }
    };
    
    checkAudio();
  }, [isRecording]);

  const uploadAndProcess = async (audioBlob: Blob, recordingDuration: number) => {
    const configData = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
    const supabase = getSupabaseClient();
    const timestamp = new Date().toLocaleString();
    const tempId = `audio-${Date.now()}`;
    
    const metadata = {
      id: tempId,
      timestamp: timestamp,
      duration: Math.floor(recordingDuration / 1000),
    };
    
    const newLog: AudioLog = {
      id: tempId,
      timestamp: timestamp,
      customerName: 'Processing...',
      vehicle: '',
      duration: formatTime(Math.floor(recordingDuration / 1000)),
      transcriptPreview: 'Transcribing and analyzing conversation...',
      fullTranscript: '',
      tags: ['LOCAL', 'PROCESSING'],
    };

    const existingCache = JSON.parse(localStorage.getItem(LOCAL_LOGS_KEY) || '[]');
    localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify([newLog, ...existingCache]));
    setLogs(prev => [newLog, ...prev]);

    setUploadStatus('uploading');
    
    let uploadSuccess = false;
    let audioUrl = '';
    
    try {
      if (supabase) {
        const fileName = `${tempId}.webm`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('audio-files')
          .upload(fileName, audioBlob, {
            contentType: 'audio/webm',
            cacheControl: '3600',
          });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('audio-files')
            .getPublicUrl(fileName);
          
          audioUrl = publicUrl;
          uploadSuccess = true;
        } else {
          console.error('Supabase upload error:', uploadError);
        }
      }
    } catch (err) {
      console.warn('Supabase upload failed:', err);
    }
    
    if (!uploadSuccess && configData.n8nWebhookAudio) {
      try {
        const formData = new FormData();
        formData.append('file', audioBlob, `${tempId}.webm`);
        formData.append('metadata', JSON.stringify(metadata));
        
        const response = await fetch(configData.n8nWebhookAudio, {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          uploadSuccess = true;
          console.log('Fallback n8n upload succeeded');
        }
      } catch (err) {
        console.error('n8n fallback upload failed:', err);
      }
    }
    
    if (uploadSuccess) {
      setUploadStatus('success');
      
      if (audioUrl && configData.n8nWebhookAudio) {
        try {
          await fetch(configData.n8nWebhookAudio, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: tempId,
              timestamp: timestamp,
              audio_url: audioUrl,
              duration: Math.floor(recordingDuration / 1000),
            }),
          });
        } catch (err) {
          console.error('Webhook trigger failed:', err);
        }
      }
      
      setTimeout(() => {
        fetchLogs();
        setUploadStatus('idle');
      }, 5000);
      
    } else {
      setUploadStatus('error');
      saveToRetryQueue(audioBlob, metadata);
      console.error('All upload methods failed - added to retry queue');
      setTimeout(() => setUploadStatus('idle'), 5000);
    }
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      streamRef.current = stream;

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      
      analyser.fftSize = 512;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const recordingDuration = Date.now() - (recordingStartTimeRef.current || Date.now());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await uploadAndProcess(blob, recordingDuration);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
      };

      recorder.start();
      recordingStartTimeRef.current = Date.now();
      silenceStartRef.current = null;
      setIsRecording(true);
      setDuration(0);

      durationTimerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      detectSilence();

    } catch (err) {
      console.error('Microphone error:', err);
      alert('Microphone access denied. Please enable microphone permissions in your browser settings.');
    }
  }, [detectSilence, uploadAndProcess]);

  const stopRecording = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    setIsRecording(false);
    setDuration(0);
    silenceStartRef.current = null;
    recordingStartTimeRef.current = null;
  }, []);

  const handleToggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  useEffect(() => {
    const retryFailedUploads = async () => {
      const queueData = localStorage.getItem('upload_retry_queue');
      if (!queueData) return;
      
      const queue: RetryQueueItem[] = JSON.parse(queueData);
      const configData = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
      
      if (!configData.n8nWebhookAudio) return;
      
      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        
        if (item.attempts >= 3) {
          console.log(`Max retry attempts reached for ${item.id}`);
          continue;
        }
        
        try {
          const response = await fetch(item.audioData);
          const blob = await response.blob();
          
          const formData = new FormData();
          formData.append('file', blob, `${item.id}.webm`);
          formData.append('metadata', JSON.stringify(item.metadata));
          
          const uploadResponse = await fetch(configData.n8nWebhookAudio, {
            method: 'POST',
            body: formData
          });
          
          if (uploadResponse.ok) {
            console.log(`Retry successful for ${item.id}`);
            queue.splice(i, 1);
            i--;
            localStorage.setItem('upload_retry_queue', JSON.stringify(queue));
            setRetryQueue(queue);
            setTimeout(() => fetchLogs(), 2000);
          } else {
            throw new Error('Upload failed');
          }
        } catch (error) {
          console.log(`Retry attempt ${item.attempts + 1} failed for ${item.id}`);
          queue[i].attempts++;
          localStorage.setItem('upload_retry_queue', JSON.stringify(queue));
          setRetryQueue(queue);
        }
      }
    };
    
    retryFailedUploads();
    const retryInterval = setInterval(retryFailedUploads, 120000);
    
    return () => {
      clearInterval(retryInterval);
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [fetchLogs]);

  useEffect(() => {
    fetchLogs();
    
    const queueData = localStorage.getItem('upload_retry_queue');
    if (queueData) {
      setRetryQueue(JSON.parse(queueData));
    }
  }, [fetchLogs]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRecording) {
        e.preventDefault();
        e.returnValue = 'Recording in progress! Close anyway?';
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRecording]);

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
          log.fullTranscript,
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
      
      {/* HEADER */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-3xl p-8 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] -mr-32 -mt-32" />
        
        <div className="flex justify-between items-center mb-6 relative z-10">
          <h3 className="text-2xl font-bold text-white tracking-tight">Audio Logger</h3>
          
          <div className="flex items-center gap-3">
            {/* RECORDING TOGGLE */}
            <div className="flex items-center gap-3 bg-slate-950/50 px-5 py-3 rounded-2xl border border-slate-800/50">
              <span className={`text-xs font-bold uppercase tracking-widest transition-colors ${isRecording ? 'text-blue-400' : 'text-slate-500'}`}>
                Record Customer
              </span>
              <button 
                onClick={handleToggleRecording}
                className={`relative w-12 h-6 transition-colors rounded-full focus:outline-none ${isRecording ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isRecording ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
            
            {/* DURATION DISPLAY */}
            {isRecording && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-400 text-xs font-bold">{formatTime(duration)}</span>
              </div>
            )}
            
            {/* REFRESH BUTTON */}
            <button onClick={fetchLogs} className="p-3 text-slate-400 hover:text-white transition-all active:scale-95">
              <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* STATUS INDICATORS */}
        <div className="relative z-10 mb-6 space-y-2">
          {retryQueue.length > 0 && (
            <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 px-4 py-2 rounded-xl">
              <AlertCircle size={16} className="text-yellow-400" />
              <span className="text-yellow-400 text-xs font-bold">
                {retryQueue.length} recording{retryQueue.length > 1 ? 's' : ''} waiting to upload - will retry automatically
              </span>
            </div>
          )}

          {uploadStatus === 'uploading' && (
            <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl">
              <RefreshCw size={16} className="text-blue-400 animate-spin" />
              <span className="text-blue-400 text-xs font-bold">Uploading...</span>
            </div>
          )}

          {uploadStatus === 'success' && (
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-xl">
              <CheckCircle size={16} className="text-green-400" />
              <span className="text-green-400 text-xs font-bold">Saved successfully!</span>
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl">
              <AlertCircle size={16} className="text-red-400" />
              <span className="text-red-400 text-xs font-bold">
                Upload failed - will retry automatically in 2 minutes
              </span>
            </div>
          )}
        </div>
        
        {/* SEARCH BAR */}
        <div className="relative z-10 mb-6">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            type="text" 
            placeholder="Search customer, service, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl p-5 pl-16 text-white font-medium outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600 shadow-inner"
          />
        </div>

        {/* DAY TABS */}
        <div className="flex gap-2 relative z-10">
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

      {/* CONVERSATIONS LIST */}
      <div className="flex-1 bg-slate-900/20 rounded-3xl border border-slate-800/50 overflow-hidden flex flex-col shadow-inner">
        <div className="p-6 border-b border-slate-800/50 bg-slate-900/40 flex justify-between items-center">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">
            {searchQuery ? 'Search Results' : `${selectedDay}'s Conversations`} ({filteredLogs.length})
          </h4>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {filteredLogs.length > 0 ? filteredLogs.map((log) => {
            const isExpanded = expandedLogs.has(log.id);
            
            return (
              <div 
                key={log.id}
                className="w-full text-left p-6 rounded-2xl border bg-slate-900/40 border-slate-800/40 hover:bg-slate-800/60 hover:border-slate-700 transition-all duration-300"
              >
                {/* Header with timestamp and delete */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-950 text-blue-400 shadow-inner">
                      <Clock size={16} />
                    </div>
                    <span className="font-bold text-white text-sm">{log.timestamp}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="flex gap-1">
                      {log.tags.map(tag => (
                        <span key={tag} className="text-[8px] font-black px-2 py-1 bg-slate-950 text-slate-500 border border-slate-800 rounded uppercase tracking-tighter">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => deleteLog(log.id)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      title="Delete conversation"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                {/* Summary bullet */}
                <div className="pl-4">
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
                      
                      {/* Summary */}
                      <p className="text-slate-400 text-sm mt-2 font-medium">
                        {log.transcriptPreview}
                      </p>
                      
                      {/* Expand/Collapse button */}
                      {log.fullTranscript && (
                        <button
                          onClick={() => toggleExpand(log.id)}
                          className="mt-3 text-blue-400 text-xs font-bold hover:text-blue-300 transition-colors flex items-center gap-1"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp size={14} />
                              Hide Full Transcript
                            </>
                          ) : (
                            <>
                              <ChevronDown size={14} />
                              View Full Transcript
                            </>
                          )}
                        </button>
                      )}
                      
                      {/* Full transcript (expanded) */}
                      {isExpanded && log.fullTranscript && (
                        <div className="mt-4 p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                            Full Conversation
                          </div>
                          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                            {log.fullTranscript}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-700 py-20 text-center">
              <HardDrive size={64} className="mb-4 opacity-5" />
              <p className="text-xs font-black uppercase tracking-[0.3em] opacity-20">
                {searchQuery ? 'No matching conversations' : `No conversations for ${selectedDay}`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudioLogger;
