import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Search, RefreshCw, Clock, HardDrive, ChevronDown, ChevronUp,
  Trash2, Play, Pause, Volume2, Bookmark, BookmarkCheck,
  ShieldCheck, FileText, AlertTriangle, Calendar, Car, User
} from 'lucide-react';
import { getSupabaseClient } from '../services/supabaseClient';
import { AudioLog } from '../types';

const CONFIG_KEY = 'southport_config';
const LOCAL_LOGS_KEY = 'southport_audio_cache_v3';
const SAVED_LOGS_KEY = 'southport_saved_chats';
const SILENCE_THRESHOLD = 10;
const SILENCE_DURATION = 10000;
const MAX_RECORDING_DURATION = 300000;

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const generateCaseRef = (logId: string, timestamp: string): string => {
  const dateStr = new Date(timestamp).toLocaleDateString('en-US', {
    year: '2-digit', month: '2-digit', day: '2-digit'
  }).replace(/\//g, '');
  const shortId = logId.replace(/\D/g, '').slice(-4).padStart(4, '0');
  return `WS-${dateStr}-${shortId}`;
};

// ─── Audio Player ─────────────────────────────────────────────────────────────

interface AudioPlayerProps {
  audioUrl: string;
  compact?: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, compact = false }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onloadedmetadata = () => setAudioDuration(audio.duration);
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => { setError('Audio unavailable'); setIsLoading(false); };
    audio.oncanplay = () => setIsLoading(false);
    audio.onwaiting = () => setIsLoading(true);
    return () => { audio.pause(); audio.src = ''; };
  }, [audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else {
      setIsLoading(true);
      audio.play()
        .then(() => { setIsPlaying(true); setIsLoading(false); })
        .catch(() => { setError('Playback failed'); setIsLoading(false); });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const progressPercent = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  if (error) return (
    <div className="flex items-center gap-2 text-slate-600 text-xs mt-3">
      <Volume2 size={12} /><span>{error}</span>
    </div>
  );

  return (
    <div className={`flex items-center gap-4 ${compact ? 'p-3 bg-slate-950/40 rounded-lg border border-slate-800/60' : 'p-4 bg-slate-950/60 rounded-xl border border-slate-800'} mt-3`}>
      <button
        onClick={togglePlay}
        disabled={isLoading}
        className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 ${isPlaying ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'} ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
      >
        {isLoading ? <RefreshCw size={14} className="animate-spin" /> : isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>
      <div className="flex-1 flex flex-col gap-1.5 relative">
        <div className="relative h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="absolute left-0 top-0 h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
        <input
          type="range" min={0} max={audioDuration || 0} step={0.1} value={currentTime}
          onChange={handleSeek}
          className="absolute opacity-0 w-full h-1.5 cursor-pointer"
          style={{ marginTop: '-14px' }}
        />
        <div className="flex justify-between text-[10px] text-slate-600 font-mono font-bold">
          <span>{formatTime(Math.floor(currentTime))}</span>
          <span>{audioDuration > 0 ? formatTime(Math.floor(audioDuration)) : '--:--'}</span>
        </div>
      </div>
      <div className="flex-shrink-0 flex items-center gap-1 text-slate-600">
        <Volume2 size={12} />
        <span className="text-[10px] font-bold uppercase tracking-wider">Audio</span>
      </div>
    </div>
  );
};

// ─── Saved Chat Card ──────────────────────────────────────────────────────────

interface SavedChatCardProps {
  log: AudioLog;
  onUnsave: (id: string) => void;
}

const SavedChatCard: React.FC<SavedChatCardProps> = ({ log, onUnsave }) => {
  const [expanded, setExpanded] = useState(false);
  const caseRef = generateCaseRef(log.id, log.timestamp);
  const savedAt = log.savedAt ? new Date(log.savedAt).toLocaleString() : 'Unknown';
  const conversationDate = new Date(log.timestamp).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const conversationTime = new Date(log.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-950/10 overflow-hidden">
      {/* Case Header Bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-amber-500/5 border-b border-amber-500/10">
        <div className="flex items-center gap-3">
          <ShieldCheck size={14} className="text-amber-400 flex-shrink-0" />
          <span className="text-amber-400 text-xs font-black uppercase tracking-widest font-mono">{caseRef}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-600 text-[10px] font-bold uppercase tracking-wider">
            Saved {savedAt}
          </span>
          <button
            onClick={() => onUnsave(log.id)}
            className="text-[10px] font-bold text-slate-600 hover:text-red-400 uppercase tracking-wider transition-colors px-2 py-1 rounded hover:bg-red-500/10"
          >
            Remove
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-5 space-y-4">
        {/* Key Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/40">
            <div className="flex items-center gap-2 mb-1.5">
              <Calendar size={11} className="text-slate-500" />
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Date of Conversation</span>
            </div>
            <p className="text-white text-xs font-bold">{conversationDate}</p>
            <p className="text-slate-400 text-xs font-medium mt-0.5">{conversationTime}</p>
          </div>
          <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/40">
            <div className="flex items-center gap-2 mb-1.5">
              <User size={11} className="text-slate-500" />
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Customer</span>
            </div>
            <p className="text-white text-xs font-bold">{log.customerName}</p>
            {log.vehicle && (
              <div className="flex items-center gap-1 mt-0.5">
                <Car size={10} className="text-slate-500" />
                <p className="text-slate-400 text-xs font-medium">{log.vehicle}</p>
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-slate-950/40 rounded-xl p-4 border border-slate-800/40">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={11} className="text-slate-500" />
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Conversation Summary</span>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">{log.transcriptPreview}</p>
        </div>

        {/* Audio Player */}
        {log.audioUrl && <AudioPlayer audioUrl={log.audioUrl} compact />}

        {/* Full Transcript Toggle */}
        {log.fullTranscript && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-950/40 border border-slate-800/40 hover:border-slate-700 transition-all"
            >
              <div className="flex items-center gap-2">
                <FileText size={13} className="text-blue-400" />
                <span className="text-blue-400 text-xs font-bold">Full Transcript</span>
              </div>
              {expanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
            </button>
            {expanded && (
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 mt-1">
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{log.fullTranscript}</p>
              </div>
            )}
          </>
        )}

        {/* Legal Footer */}
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
          <AlertTriangle size={11} className="text-amber-500/60 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-500/50 leading-relaxed font-medium">
            This record was permanently saved on {savedAt}. Reference case <span className="font-black font-mono">{caseRef}</span> in any dispute or legal proceeding involving this conversation.
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Retry Queue Type ─────────────────────────────────────────────────────────

interface RetryQueueItem {
  id: string;
  audioData: string;
  metadata: any;
  attempts: number;
  timestamp: number;
}

// ─── Main Component ───────────────────────────────────────────────────────────

const AudioLogger: React.FC = () => {
  const [logs, setLogs] = useState<AudioLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>(
    new Date().toLocaleDateString('en-US', { weekday: 'long' })
  );
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [retryQueue, setRetryQueue] = useState<RetryQueueItem[]>([]);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [savedLogsOpen, setSavedLogsOpen] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const durationTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const savedLogs = useMemo(() => logs.filter(log => log.saved), [logs]);

  const toggleSave = async (log: AudioLog) => {
    const supabase = getSupabaseClient();
    const newSaved = !log.saved;
    const savedAt = newSaved ? new Date().toISOString() : null;

    setLogs(prev => prev.map(l =>
      l.id === log.id ? { ...l, saved: newSaved, savedAt: savedAt || undefined } : l
    ));

    if (supabase && !log.id.startsWith('audio-')) {
      try {
        await supabase
          .from('audio_logs')
          .update({ saved: newSaved, saved_at: savedAt })
          .eq('id', log.id);
      } catch (err) {
        console.error('Failed to update saved state:', err);
      }
    }

    const localData = localStorage.getItem(LOCAL_LOGS_KEY);
    if (localData) {
      const cached: AudioLog[] = JSON.parse(localData);
      localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(
        cached.map(l => l.id === log.id ? { ...l, saved: newSaved, savedAt: savedAt || undefined } : l)
      ));
    }

    const savedData: AudioLog[] = JSON.parse(localStorage.getItem(SAVED_LOGS_KEY) || '[]');
    if (newSaved) {
      if (!savedData.find(l => l.id === log.id)) {
        localStorage.setItem(SAVED_LOGS_KEY, JSON.stringify([
          { ...log, saved: true, savedAt: savedAt || undefined },
          ...savedData
        ]));
      }
    } else {
      localStorage.setItem(SAVED_LOGS_KEY, JSON.stringify(savedData.filter(l => l.id !== log.id)));
    }
  };

  const toggleExpand = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) newSet.delete(logId);
      else newSet.add(logId);
      return newSet;
    });
  };

  const deleteLog = async (logId: string) => {
    const log = logs.find(l => l.id === logId);
    const msg = log?.saved
      ? 'This conversation is saved as a liability record. Are you sure you want to permanently delete it?'
      : 'Delete this conversation? This cannot be undone.';
    if (!confirm(msg)) return;

    const supabase = getSupabaseClient();
    setLogs(prev => prev.filter(l => l.id !== logId));

    if (supabase && !logId.startsWith('audio-')) {
      try {
        await supabase.storage.from('audio-files').remove([`${logId}.webm`]);
        await supabase.from('audio_logs').delete().eq('id', logId);
      } catch (err) {
        console.error('Failed to delete from cloud:', err);
      }
    }

    const localData = localStorage.getItem(LOCAL_LOGS_KEY);
    if (localData) {
      localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(
        (JSON.parse(localData) as AudioLog[]).filter(l => l.id !== logId)
      ));
    }
    const savedData: AudioLog[] = JSON.parse(localStorage.getItem(SAVED_LOGS_KEY) || '[]');
    localStorage.setItem(SAVED_LOGS_KEY, JSON.stringify(savedData.filter(l => l.id !== logId)));
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
          // Collect any rows that are missing audio_url so we can patch them back
          const rowsNeedingUrlFix: string[] = [];

          cloudLogs = data.map(item => {
            let audioUrl: string | null = item.audio_url || null;

            // If n8n wiped the audio_url on its transcript update, reconstruct it
            // from the known storage path: audio-files/{id}.webm
            if (!audioUrl) {
              const { data: { publicUrl } } = supabase.storage
                .from('audio-files')
                .getPublicUrl(`${item.id}.webm`);

              if (publicUrl) {
                audioUrl = publicUrl;
                rowsNeedingUrlFix.push(item.id.toString());
              }
            }

            return {
              id: item.id.toString(),
              timestamp: new Date(item.created_at).toLocaleString(),
              customerName: item.customer_name || 'Customer',
              vehicle: item.vehicle || '',
              duration: item.duration || 'N/A',
              transcriptPreview: item.segment_summary || 'Processing...',
              fullTranscript: item.transcript || '',
              tags: item.tags || ['CLOUD'],
              audioUrl,
              saved: item.saved || false,
              savedAt: item.saved_at || undefined,
            };
          });

          // Silently patch any rows whose audio_url was missing — fixes them permanently
          // so n8n can never wipe them again once restored
          if (rowsNeedingUrlFix.length > 0) {
            rowsNeedingUrlFix.forEach(async (id) => {
              const { data: { publicUrl } } = supabase.storage
                .from('audio-files')
                .getPublicUrl(`${id}.webm`);
              if (publicUrl) {
                await supabase
                  .from('audio_logs')
                  .update({ audio_url: publicUrl })
                  .eq('id', id);
                console.log(`Restored missing audio_url for log ${id}`);
              }
            });
          }
        }
      } catch (err) {
        console.warn('Cloud connection limited:', err);
      }
    }

    const localData = localStorage.getItem(LOCAL_LOGS_KEY);
    const cachedLogs: AudioLog[] = localData ? JSON.parse(localData) : [];
    const savedBackup: AudioLog[] = JSON.parse(localStorage.getItem(SAVED_LOGS_KEY) || '[]');

    const allLocal = [...cachedLogs];
    savedBackup.forEach(saved => {
      if (!allLocal.find(l => l.id === saved.id)) allLocal.push(saved);
    });

    const combined = [...allLocal, ...cloudLogs];
    const unique = combined.reduce((acc, current) => {
      if (acc.find(item => item.id === current.id)) return acc;
      if (current.tags?.includes('LOCAL')) {
        const hasCloudEquivalent = cloudLogs.some(cloud =>
          Math.abs(new Date(cloud.timestamp).getTime() - new Date(current.timestamp).getTime()) < 60000
        );
        if (hasCloudEquivalent) return acc;
      }
      return acc.concat([current]);
    }, [] as AudioLog[]);

    setLogs(unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    setIsSyncing(false);
    if (cloudLogs.length > 0) localStorage.removeItem(LOCAL_LOGS_KEY);
  }, []);

  const saveToRetryQueue = (audioBlob: Blob, metadata: any) => {
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = () => {
      const queue = JSON.parse(localStorage.getItem('upload_retry_queue') || '[]');
      queue.push({ id: metadata.id, audioData: reader.result as string, metadata, attempts: 0, timestamp: Date.now() });
      localStorage.setItem('upload_retry_queue', JSON.stringify(queue));
      setRetryQueue(queue);
    };
  };

  const detectSilence = useCallback(() => {
    if (!analyserRef.current) return;
    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const checkAudio = () => {
      if (!isRecording) return;
      analyser.getByteFrequencyData(dataArray);
      const volume = dataArray.reduce((a, b) => a + b) / dataArray.length;
      if (volume < SILENCE_THRESHOLD) {
        if (!silenceStartRef.current) silenceStartRef.current = Date.now();
        else if (Date.now() - silenceStartRef.current > SILENCE_DURATION) { stopRecording(); return; }
      } else silenceStartRef.current = null;
      if (recordingStartTimeRef.current && Date.now() - recordingStartTimeRef.current > MAX_RECORDING_DURATION) { stopRecording(); return; }
      if (isRecording) requestAnimationFrame(checkAudio);
    };
    checkAudio();
  }, [isRecording]);

  const uploadAndProcess = async (audioBlob: Blob, recordingDuration: number) => {
    const configData = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
    const supabase = getSupabaseClient();
    const timestamp = new Date().toLocaleString();
    const tempId = `audio-${Date.now()}`;
    const metadata = { id: tempId, timestamp, duration: Math.floor(recordingDuration / 1000) };

    const newLog: AudioLog = {
      id: tempId, timestamp,
      customerName: 'Recording saved', vehicle: '',
      duration: formatTime(Math.floor(recordingDuration / 1000)),
      transcriptPreview: 'Analyzing conversation… This will update automatically.',
      fullTranscript: '', tags: ['LOCAL', 'PROCESSING'],
      audioUrl: null, saved: false,
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
        const { error: uploadError } = await supabase.storage
          .from('audio-files')
          .upload(fileName, audioBlob, { contentType: 'audio/webm', cacheControl: '3600' });
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('audio-files').getPublicUrl(fileName);
          audioUrl = publicUrl;
          await supabase.from('audio_logs').insert({
            id: tempId,
            created_at: new Date().toISOString(),
            duration: Math.floor(recordingDuration / 1000),
            audio_url: audioUrl,
            tags: ['PROCESSING'],
            segment_summary: 'Analyzing conversation… This will update automatically.',
            saved: false,
          });
          setLogs(prev => prev.map(log => log.id === tempId ? { ...log, audioUrl } : log));
          uploadSuccess = true;
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
        const response = await fetch(configData.n8nWebhookAudio, { method: 'POST', body: formData });
        if (response.ok) uploadSuccess = true;
      } catch (err) { console.error('n8n fallback upload failed:', err); }
    }

    if (uploadSuccess) {
      setUploadStatus('success');
      if (audioUrl && configData.n8nWebhookAudio) {
        try {
          await fetch(configData.n8nWebhookAudio, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: tempId, timestamp, audio_url: audioUrl, duration: Math.floor(recordingDuration / 1000) }),
          });
        } catch (err) { console.error('Webhook trigger failed:', err); }
      }
      setTimeout(() => { fetchLogs(); setUploadStatus('idle'); }, 5000);
    } else {
      setUploadStatus('error');
      saveToRetryQueue(audioBlob, metadata);
      setTimeout(() => setUploadStatus('idle'), 5000);
    }
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      audioContext.createMediaStreamSource(stream).connect(analyser);
      analyser.fftSize = 512;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      // Prefer Opus — cleaner voice quality, smaller files, no gaps
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/ogg;codecs=opus';

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const recordingDuration = Date.now() - (recordingStartTimeRef.current || Date.now());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        await uploadAndProcess(blob, recordingDuration);
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
        if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
      };
      // 250ms timeslice = continuous chunk streaming, eliminates choppiness
      recorder.start(250);
      recordingStartTimeRef.current = Date.now();
      silenceStartRef.current = null;
      setIsRecording(true);
      setDuration(0);
      durationTimerRef.current = window.setInterval(() => setDuration(prev => prev + 1), 1000);
      detectSilence();
    } catch (err) {
      console.error('Microphone error:', err);
      alert('Microphone access denied. Please enable microphone permissions in your browser settings.');
    }
  }, [detectSilence, uploadAndProcess]);

  const stopRecording = useCallback(() => {
    if (durationTimerRef.current) { clearInterval(durationTimerRef.current); durationTimerRef.current = null; }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
    setIsRecording(false);
    setDuration(0);
    silenceStartRef.current = null;
    recordingStartTimeRef.current = null;
  }, []);

  useEffect(() => {
    const retryFailedUploads = async () => {
      const queueData = localStorage.getItem('upload_retry_queue');
      if (!queueData) return;
      const queue: RetryQueueItem[] = JSON.parse(queueData);
      const configData = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
      if (!configData.n8nWebhookAudio) return;
      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        if (item.attempts >= 3) continue;
        try {
          const response = await fetch(item.audioData);
          const blob = await response.blob();
          const formData = new FormData();
          formData.append('file', blob, `${item.id}.webm`);
          formData.append('metadata', JSON.stringify(item.metadata));
          const uploadResponse = await fetch(configData.n8nWebhookAudio, { method: 'POST', body: formData });
          if (uploadResponse.ok) {
            queue.splice(i, 1); i--;
            localStorage.setItem('upload_retry_queue', JSON.stringify(queue));
            setRetryQueue(queue);
            setTimeout(() => fetchLogs(), 2000);
          } else throw new Error('Upload failed');
        } catch {
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
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [fetchLogs]);

  useEffect(() => {
    fetchLogs();
    const queueData = localStorage.getItem('upload_retry_queue');
    if (queueData) setRetryQueue(JSON.parse(queueData));
  }, [fetchLogs]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRecording) { e.preventDefault(); e.returnValue = 'Recording in progress! Close anyway?'; return e.returnValue; }
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
      return logs.filter(log =>
        [log.customerName, log.vehicle, log.transcriptPreview, log.fullTranscript, ...(log.tags || [])]
          .join(' ').toLowerCase().includes(query)
      );
    }
    return logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate.toLocaleDateString('en-US', { weekday: 'long' }) === selectedDay && logDate >= weekStart && logDate < weekEnd;
    });
  }, [logs, selectedDay, searchQuery]);

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-140px)] animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto custom-scrollbar pb-6">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-3xl p-8 shadow-2xl overflow-hidden relative flex-shrink-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] -mr-32 -mt-32" />

        <div className="flex justify-between items-center mb-6 relative z-10">
          <h3 className="text-2xl font-bold text-white tracking-tight">Audio Logger</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-slate-950/50 px-5 py-3 rounded-2xl border border-slate-800/50">
              <span className={`text-xs font-bold uppercase tracking-widest transition-colors ${isRecording ? 'text-blue-400' : 'text-slate-500'}`}>
                Record Customer
              </span>
              <button
                onClick={() => isRecording ? stopRecording() : startRecording()}
                className={`relative w-12 h-6 transition-colors rounded-full focus:outline-none ${isRecording ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isRecording ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
            {isRecording && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-400 text-xs font-bold">{formatTime(duration)}</span>
              </div>
            )}
            {uploadStatus === 'uploading' && (
              <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl">
                <RefreshCw size={12} className="text-blue-400 animate-spin" />
                <span className="text-blue-400 text-xs font-bold">Saving…</span>
              </div>
            )}
            {uploadStatus === 'success' && (
              <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-xl">
                <span className="text-green-400 text-xs font-bold">✓ Saved</span>
              </div>
            )}
            <button onClick={fetchLogs} className="p-3 text-slate-400 hover:text-white transition-all active:scale-95">
              <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

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

      {/* ── CONVERSATIONS LIST ─────────────────────────────────────────────── */}
      <div className="bg-slate-900/20 rounded-3xl border border-slate-800/50 overflow-hidden flex flex-col shadow-inner flex-shrink-0">
        <div className="p-6 border-b border-slate-800/50 bg-slate-900/40 flex justify-between items-center">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">
            {searchQuery ? 'Search Results' : `${selectedDay}'s Conversations`} ({filteredLogs.length})
          </h4>
          {retryQueue.length > 0 && (
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
              {retryQueue.length} pending upload{retryQueue.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="overflow-y-auto p-4 space-y-3 custom-scrollbar" style={{ maxHeight: '420px' }}>
          {filteredLogs.length > 0 ? filteredLogs.map((log) => {
            const isExpanded = expandedLogs.has(log.id);
            return (
              <div
                key={log.id}
                className="w-full text-left p-6 rounded-2xl border bg-slate-900/40 border-slate-800/40 hover:bg-slate-800/60 hover:border-slate-700 transition-all duration-300"
              >
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
                      onClick={() => toggleSave(log)}
                      title={log.saved ? 'Remove from saved records' : 'Save as liability record'}
                      className={`p-2 rounded-lg transition-all ${
                        log.saved
                          ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                          : 'text-slate-500 hover:text-amber-400 hover:bg-amber-500/10'
                      }`}
                    >
                      {log.saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                    </button>
                    <button
                      onClick={() => deleteLog(log.id)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

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
                      <p className="text-slate-400 text-sm mt-2 font-medium">{log.transcriptPreview}</p>

                      {log.audioUrl && <AudioPlayer audioUrl={log.audioUrl} />}

                      {log.fullTranscript && (
                        <button
                          onClick={() => toggleExpand(log.id)}
                          className="mt-3 text-blue-400 text-xs font-bold hover:text-blue-300 transition-colors flex items-center gap-1"
                        >
                          {isExpanded ? <><ChevronUp size={14} />Hide Full Transcript</> : <><ChevronDown size={14} />View Full Transcript</>}
                        </button>
                      )}
                      {isExpanded && log.fullTranscript && (
                        <div className="mt-4 p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Full Conversation</div>
                          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{log.fullTranscript}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="flex flex-col items-center justify-center text-slate-700 py-16 text-center">
              <HardDrive size={48} className="mb-4 opacity-5" />
              <p className="text-xs font-black uppercase tracking-[0.3em] opacity-20">
                {searchQuery ? 'No matching conversations' : `No conversations for ${selectedDay}`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── SAVED CHATS ────────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-amber-500/20 bg-amber-950/5 overflow-hidden flex-shrink-0">
        <button
          onClick={() => setSavedLogsOpen(!savedLogsOpen)}
          className="w-full flex items-center justify-between p-6 hover:bg-amber-500/5 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <ShieldCheck size={18} className="text-amber-400" />
            </div>
            <div className="text-left">
              <h4 className="text-white font-bold text-sm">Saved Records</h4>
              <p className="text-slate-500 text-xs font-medium mt-0.5">
                Permanently saved conversations for liability &amp; legal reference
              </p>
            </div>
            {savedLogs.length > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/20 text-amber-400 text-xs font-black">
                {savedLogs.length}
              </span>
            )}
          </div>
          <ChevronDown
            size={18}
            className={`text-slate-500 transition-transform duration-300 ${savedLogsOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {savedLogsOpen && (
          <div className="px-6 pb-6 space-y-4">
            {savedLogs.length > 0 ? (
              <>
                <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-950/40 border border-slate-800/40 mb-2">
                  <AlertTriangle size={13} className="text-amber-500/70 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-500 text-xs leading-relaxed">
                    These conversations are permanently saved and will not be affected by routine cleanup. Each record includes a unique case reference number. To save a conversation, click the <span className="text-amber-400 font-bold">bookmark icon</span> on any log above.
                  </p>
                </div>
                {savedLogs.map(log => (
                  <SavedChatCard
                    key={log.id}
                    log={log}
                    onUnsave={(id) => {
                      const target = logs.find(l => l.id === id);
                      if (target) toggleSave(target);
                    }}
                  />
                ))}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/40 mb-4">
                  <Bookmark size={32} className="text-slate-700" />
                </div>
                <p className="text-slate-500 text-sm font-bold">No saved records yet</p>
                <p className="text-slate-600 text-xs mt-1 max-w-xs leading-relaxed">
                  Click the <span className="text-amber-400">bookmark icon</span> on any conversation to permanently save it here for liability reference.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default AudioLogger;
