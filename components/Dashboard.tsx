import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  Play, 
  Shield, 
  Database, 
  Zap, 
  Globe, 
  Cpu, 
  Terminal,
  AlertTriangle,
  RefreshCw,
  Clock,
  Trash2
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { getSupabaseClient } from '../services/supabaseClient.ts';

interface DiagnosticCheck {
  id: string;
  name: string;
  description: string;
  status: 'PENDING' | 'PASS' | 'FAIL' | 'RUNNING';
  message?: string;
  details?: string;
  category: 'ENV' | 'API' | 'SYSTEM';
}

export const DiagnosticsPanel: React.FC = () => {
  const [checks, setChecks] = useState<DiagnosticCheck[]>([
    { id: 'env-api-key', name: 'Gemini API Key', description: 'Checks if process.env.API_KEY is defined.', status: 'PENDING', category: 'ENV' },
    { id: 'env-supabase', name: 'Supabase Credentials', description: 'Checks for Supabase URL and Anon Key in settings.', status: 'PENDING', category: 'ENV' },
    { id: 'env-n8n', name: 'n8n Webhook Configuration', description: 'Verifies at least one n8n webhook is configured.', status: 'PENDING', category: 'ENV' },
    { id: 'api-gemini', name: 'Gemini Connectivity', description: 'Tests connection to Gemini-3-Flash node.', status: 'PENDING', category: 'API' },
    { id: 'api-supabase', name: 'Supabase Handshake', description: 'Performs a test query on the archive cluster.', status: 'PENDING', category: 'API' },
    { id: 'api-n8n', name: 'n8n Webhook Ping', description: 'Sends a test packet to the primary n8n node.', status: 'PENDING', category: 'API' },
    { id: 'sys-react', name: 'React Mount Integrity', description: 'Verifies the application root is properly initialized.', status: 'PENDING', category: 'SYSTEM' },
    { id: 'sys-browser', name: 'Browser Capabilities', description: 'Checks for MediaRecorder, Fetch, and AudioContext support.', status: 'PENDING', category: 'SYSTEM' },
  ]);

  const [lastRun, setLastRun] = useState<string | null>(null);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const updateCheck = (id: string, updates: Partial<DiagnosticCheck>) => {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleWipeConfig = () => {
    if (window.confirm("CRITICAL: Wipe all infrastructure settings and reset core?")) {
      localStorage.removeItem('southport_config');
      window.location.reload();
    }
  };

  const runAllTests = async () => {
    setIsRunningAll(true);
    setLastRun(new Date().toLocaleTimeString());
    setChecks(prev => prev.map(c => ({ ...c, status: 'PENDING', message: undefined, details: undefined })));

    try {
      await testEnvApiKey();
      await testEnvSupabase();
      await testEnvN8N();
      await testSysBrowser();
      await testSysReact();
      await testApiGemini();
      await testApiSupabase();
      await testApiN8N();
    } finally {
      setIsRunningAll(false);
    }
  };

  const testEnvApiKey = async () => {
    updateCheck('env-api-key', { status: 'RUNNING' });
    const key = process.env.API_KEY;
    if (key && key.length > 5) {
      updateCheck('env-api-key', { status: 'PASS', message: 'API_KEY found in environment.' });
    } else {
      updateCheck('env-api-key', { status: 'FAIL', message: 'API_KEY is missing.', details: 'The application requires a valid Gemini API Key. Use the AI Studio dialog if not set via environment.' });
    }
  };

  const testEnvSupabase = async () => {
    updateCheck('env-supabase', { status: 'RUNNING' });
    const stored = localStorage.getItem('southport_config');
    if (!stored) {
      updateCheck('env-supabase', { status: 'FAIL', message: 'Settings empty.' });
      return;
    }
    const config = JSON.parse(stored);
    if (config.supabaseUrl && config.supabaseKey) {
      updateCheck('env-supabase', { status: 'PASS', message: 'Supabase credentials detected.' });
    } else {
      updateCheck('env-supabase', { status: 'FAIL', message: 'Incomplete credentials.' });
    }
  };

  const testEnvN8N = async () => {
    updateCheck('env-n8n', { status: 'RUNNING' });
    const stored = localStorage.getItem('southport_config');
    const config = stored ? JSON.parse(stored) : {};
    if (config.n8nWebhookEmail || config.n8nWebhookAudio) {
      updateCheck('env-n8n', { status: 'PASS', message: 'Webhook nodes detected.' });
    } else {
      updateCheck('env-n8n', { status: 'FAIL', message: 'No n8n webhooks configured.' });
    }
  };

  const testApiGemini = async () => {
    updateCheck('api-gemini', { status: 'RUNNING' });
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      updateCheck('api-gemini', { status: 'FAIL', message: 'API_KEY missing, cannot test.' });
      return;
    }
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: 'hi',
      });
      if (response.text) {
        updateCheck('api-gemini', { status: 'PASS', message: 'Gemini handshake active.' });
      } else {
        throw new Error("Invalid node response.");
      }
    } catch (e: any) {
      updateCheck('api-gemini', { status: 'FAIL', message: 'Connection failure.', details: e.message });
    }
  };

  const testApiSupabase = async () => {
    updateCheck('api-supabase', { status: 'RUNNING' });
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        updateCheck('api-supabase', { status: 'FAIL', message: 'Client creation failed.', details: 'Check if URL and Key are valid in Settings.' });
        return;
      }
      const { error } = await supabase.from('audio_logs').select('count', { count: 'exact', head: true });
      if (error) throw error;
      updateCheck('api-supabase', { status: 'PASS', message: 'Archive handshake successful.' });
    } catch (e: any) {
      updateCheck('api-supabase', { status: 'FAIL', message: 'Handshake failed.', details: e.message });
    }
  };

  const testApiN8N = async () => {
    updateCheck('api-n8n', { status: 'RUNNING' });
    const stored = localStorage.getItem('southport_config');
    const config = stored ? JSON.parse(stored) : {};
    const url = config.n8nWebhookEmail || config.n8nWebhookAudio;
    if (!url) {
      updateCheck('api-n8n', { status: 'FAIL', message: 'No target node for ping.' });
      return;
    }
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DIAGNOSTIC_PING' }),
        signal: controller.signal
      });
      clearTimeout(id);
      if (res.ok) {
        updateCheck('api-n8n', { status: 'PASS', message: 'Primary node pinged.' });
      } else {
        updateCheck('api-n8n', { status: 'FAIL', message: `HTTP ${res.status}` });
      }
    } catch (e: any) {
      updateCheck('api-n8n', { status: 'FAIL', message: 'Network timeout.', details: e.message });
    }
  };

  const testSysReact = async () => {
    updateCheck('sys-react', { status: 'RUNNING' });
    const root = document.getElementById('root');
    if (root && root.children.length > 0) {
      updateCheck('sys-react', { status: 'PASS', message: 'DOM initialization verified.' });
    } else {
      updateCheck('sys-react', { status: 'FAIL', message: 'Root mounting failure.' });
    }
  };

  const testSysBrowser = async () => {
    updateCheck('sys-browser', { status: 'RUNNING' });
    const support = {
      fetch: typeof window.fetch === 'function',
      media: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      recorder: typeof window.MediaRecorder === 'function'
    };
    const failed = Object.entries(support).filter(([_, v]) => !v).map(([k]) => k);
    if (failed.length === 0) {
      updateCheck('sys-browser', { status: 'PASS', message: 'Browser compatibility confirmed.' });
    } else {
      updateCheck('sys-browser', { status: 'FAIL', message: `Missing: ${failed.join(', ')}` });
    }
  };

  useEffect(() => {
    runAllTests();
  }, []);

  const getStatusIcon = (status: DiagnosticCheck['status']) => {
    switch (status) {
      case 'PASS': return <CheckCircle className="text-emerald-500" size={20} />;
      case 'FAIL': return <XCircle className="text-red-500" size={20} />;
      case 'RUNNING': return <RefreshCw className="text-blue-500 animate-spin" size={20} />;
      default: return <Clock className="text-slate-600" size={20} />;
    }
  };

  const passCount = checks.filter(c => c.status === 'PASS').length;
  const failCount = checks.filter(c => c.status === 'FAIL').length;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden text-left">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-600 via-blue-600 to-red-600" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div className="flex items-center gap-6">
            <div className={`p-5 rounded-3xl text-white shadow-xl transition-colors duration-500 ${failCount > 0 ? 'bg-red-600 shadow-red-900/20' : 'bg-emerald-600 shadow-emerald-900/20'}`}>
              <Shield size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight text-white uppercase italic">Infrastructure Diagnostic</h2>
              <p className="text-sm text-slate-500 font-bold tracking-widest uppercase">System Integrity Monitor</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
             <button 
               onClick={handleWipeConfig}
               className="p-4 bg-slate-800 hover:bg-red-600/20 text-slate-400 hover:text-red-500 rounded-2xl transition-all border border-slate-700"
               title="Emergency Protocol Reset"
             >
               <Trash2 size={20} />
             </button>
             <button 
               onClick={runAllTests} 
               disabled={isRunningAll}
               className="flex-1 md:flex-none flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl shadow-blue-900/20 disabled:opacity-50"
             >
               <Play size={16} fill="currentColor" /> Run Scan
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
           <div className="p-6 bg-slate-950/40 rounded-3xl border border-slate-800/50 flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg"><CheckCircle size={16} /></div>
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Passed</span>
             </div>
             <span className="text-2xl font-black text-white italic">{passCount}</span>
           </div>
           <div className="p-6 bg-slate-950/40 rounded-3xl border border-slate-800/50 flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="p-2 bg-red-500/10 text-red-500 rounded-lg"><XCircle size={16} /></div>
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Failed</span>
             </div>
             <span className="text-2xl font-black text-white italic">{failCount}</span>
           </div>
           <div className="p-6 bg-slate-950/40 rounded-3xl border border-slate-800/50 flex items-center justify-between">
             <div className="flex items-center gap-3 text-slate-400">
               <Clock size={16} />
               <span className="text-[10px] font-black uppercase tracking-widest">{lastRun || '--:--'}</span>
             </div>
           </div>
        </div>

        <div className="space-y-12">
          {(['ENV', 'API', 'SYSTEM'] as const).map(cat => (
            <div key={cat} className="space-y-4">
              <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-600 flex items-center gap-3 ml-2">
                <div className="w-1.5 h-1.5 bg-slate-800 rounded-full" />
                {cat === 'ENV' ? 'Infrastructure Configuration' : cat === 'API' ? 'Cloud Connectivity' : 'Platform & System'}
              </h4>

              <div className="grid grid-cols-1 gap-3">
                {checks.filter(c => c.category === cat).map(check => (
                  <div 
                    key={check.id}
                    className={`group bg-slate-950/60 border rounded-3xl transition-all duration-300 ${
                      expandedId === check.id ? 'border-slate-700 shadow-xl' : 'border-slate-800/50 hover:border-slate-700'
                    }`}
                  >
                    <button 
                      onClick={() => setExpandedId(expandedId === check.id ? null : check.id)}
                      className="w-full flex items-center justify-between p-5 text-left"
                    >
                      <div className="flex items-center gap-5">
                        <div className={`transition-all duration-500`}>
                          {getStatusIcon(check.status)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white tracking-tight">{check.name}</div>
                          <div className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-0.5">{check.message || check.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                         {check.status === 'FAIL' && <AlertTriangle size={16} className="text-red-500" />}
                         {expandedId === check.id ? <ChevronUp size={18} className="text-slate-600" /> : <ChevronDown size={18} className="text-slate-600" />}
                      </div>
                    </button>

                    {expandedId === check.id && (
                      <div className="px-5 pb-5 animate-in slide-in-from-top-2 duration-300">
                        <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 space-y-4">
                           <p className="text-xs text-slate-400 leading-relaxed font-medium">{check.description}</p>
                           {check.details && (
                             <div className="bg-slate-950/80 p-4 rounded-xl border border-red-950/30 text-red-400 text-xs font-mono leading-relaxed">
                               [ANALYSIS]: {check.details}
                             </div>
                           )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DiagnosticsPanel;
