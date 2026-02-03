import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, RefreshCw, Clock, HardDrive, Mic } from 'lucide-react';
import { getSupabaseClient } from '../services/supabaseClient';
import { AudioLog } from '../types';

const CONFIG_KEY = 'southport_config';
const LOCAL_LOGS_KEY = 'southport_audio_cache_v3';
const SILENCE_THRESHOLD = 10; // Volume threshold for silence detection
const SILENCE_DURATION = 10000; // 10 seconds of silence
const MAX_RECORDING_DURATION = 300000; // 5 minutes

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
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
  const [recordingStatus, setRecordingStatus] = useState<'ready' | 'recording' | 'processing'>('ready');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const durationTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);

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
          .limit(100);

        if (!error && data) {
          cloudLogs = data.map(item => {
            const customers = item.customers || [];
            const customerNames = customers.map((c: any) => c.name).filter(Boolean);
            const displayName = customerNames.length > 0 ? customerNames.join(', ') : 'Customer';
            const firstVehicle = customers[0]?.vehicle || '';
            
            return {
              id: item.id.toString(),
              timestamp: new Date(item.created_at).toLocaleString(),
              customerName: displayName,
              vehicle: firstVehicle,
              duration: item.duration || 'N/A',
              transcriptPreview: item.summary_bullet || item.transcript || 'Processing...',
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

  const detectSilence = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const checkAudio = () => {
      if (!isRecording) return;

      analyser.getByteFrequencyData(dataArray);
      const volume = dataArray.reduce((a, b) => a + b) / bufferLength;
      
      // Check for silence
      if (volume < SILENCE_THRESHOLD) {
        if (!silenceStartRef.current) {
          silenceStartRef.current = Date.now();
        } else if (Date.now() - silenceStartRef.current > SILENCE_DURATION) {
          // 10 seconds of silence detected - stop recording
          console.log('Silence detected - auto-stopping');
          stopRecording();
          return;
        }
      } else {
        silenceStartRef.current = null;
      }

      // Check max duration
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
    setRecordingStatus('processing');
    
    const configData = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
    const supabase = getSupabaseClient();
    const timestamp = new Date().toLocaleString();
    const tempId = `audio-${Date.now()}`;
    
    // Create temporary local log
    const newLog: AudioLog = {
      id: tempId,
      timestamp: timestamp,
      customerName: 'Processing...',
      vehicle: '',
      duration: formatTime(Math.floor(recordingDuration / 1000)),
      transcriptPreview: 'Transcribing and analyzing conversation...',
      tags: ['LOCAL', 'PROCESSING'],
    };

    const existingCache = JSON.parse(localStorage.getItem(LOCAL_LOGS_KEY) || '[]');
    localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify([newLog, ...existingCache]));
    setLogs(prev => [newLog, ...prev]);

    try {
      // Upload to Supabase Storage
      if (supabase) {
        const fileName = `${tempId}.webm`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('audio-recordings')
          .upload(fileName, audioBlob, {
            contentType: 'audio/webm',
            cacheControl: '3600',
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('audio-recordings')
          .getPublicUrl(fileName);

        // Trigger n8n webhook
        if (configData.n8nWebhookAudio) {
          await fetch(configData.n8nWebhookAudio, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: tempId,
              timestamp: timestamp,
              audio_url: publicUrl,
              duration: Math.floor(recordingDuration / 1000),
            }),
          });

          // Refresh logs after 5 seconds to get processed results
          setTimeout(() => fetchLogs(), 5000);
        }
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload recording. Please check your configuration.');
    } finally {
      setRecordingStatus('ready');
    }
  };

  const startRecording = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      streamRef.current = stream;

      // Set up Web Audio API for silence detection
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      
      analyser.fftSize = 512;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Set up MediaRecorder
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
        
        // Clean up
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
      setRecordingStatus('recording');
      setDuration(0);

      // Start duration timer
      durationTimerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      // Start silence detection
      detectSilence();

    } catch (err) {
      console.error('Microphone error:', err);
      alert('Microphone access denied. Please enable microphone permissions in your browser settings.');
      setRecordingStatus('ready');
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
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

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
      
      {/* HEADER WITH RECORD BUTTON */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-3xl p-8 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] -mr-32 -mt-32" />
        
        <div className="flex justify-between items-start mb-6 relative z-10">
          <div>
            <h3 className="text-2xl font-bold text-white tracking-tight">Audio Logger</h3>
            <p className="text-slate-400 text-sm mt-1">Click record to capture customer conversations</p>
          </div>
          
          <button onClick={fetchLogs} className="p-3 text-slate-400 hover:text-white transition-all active:scale-95">
            <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* BIG RECORD BUTTON */}
        <div className="relative z-10 mb-6">
          <button
            onClick={handleToggleRecording}
            disabled={recordingStatus === 'processing'}
            className={`w-full p-8 rounded-2xl border-2 transition-all duration-300 ${
              isRecording 
                ? 'bg-red-600 border-red-500 hover:bg-red-500' 
                : recordingStatus === 'processing'
                ? 'bg-slate-800 border-slate-700 cursor-not-allowed opacity-50'
                : 'bg-blue-600 border-blue-500 hover:bg-blue-500 active:scale-98'
            }`}
          >
            <div className="flex items-center justify-center gap-4">
              <div className={`p-4 rounded-full ${isRecording ? 'bg-red-800' : 'bg-blue-800'}`}>
                <Mic size={32} className="text-white" />
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold text-white">
                  {isRecording ? 'RECORDING...' : recordingStatus === 'processing' ? 'PROCESSING...' : 'START RECORDING'}
                </div>
                {isRecording && (
                  <div className="text-slate-200 text-sm mt-1">
                    Duration: {formatTime(duration)} • Auto-stops after 10s silence or 5 min
                  </div>
                )}
                {recordingStatus === 'processing' && (
                  <div className="text-slate-200 text-sm mt-1">
                    Transcribing and analyzing conversation...
                  </div>
                )}
                {recordingStatus === 'ready' && (
                  <div className="text-slate-200 text-sm mt-1">
                    Press to start capturing customer conversation
                  </div>
                )}
              </div>
            </div>
          </button>
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
                    <p className="text-slate-400 text-sm mt-2 line-clamp-3 font-medium leading-relaxed">
                      {log.transcriptPreview}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )) : (
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
