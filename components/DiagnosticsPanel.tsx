import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  Play, 
  Shield, 
  Database, 
  Zap, 
  AlertTriangle,
  RefreshCw,
  Clock,
  Trash2
} from 'lucide-react';
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

const DiagnosticsPanel: React.FC = () => {
  const [checks, setChecks] = useState<DiagnosticCheck[]>([
    { id: 'env-supabase', name: 'Supabase Credentials', description: 'Checks for Supabase URL and Anon Key in settings.', status: 'PENDING', category: 'ENV' },
    { id: 'env-n8n', name: 'n8n Webhook Configuration', description: 'Verifies at least one n8n webhook is configured.', status: 'PENDING', category: 'ENV' },
    { id: 'api-supabase', name: 'Supabase Connection', description: 'Performs a test query on the database.', status: 'PENDING', category: 'API' },
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
      await testEnvSupabase();
      await testEnvN8N();
      await testSysBrowser();
      await testSysReact();
      await testApiSupabase();
      await testApiN8N();
    } finally {
      setIsRunningAll(false);
    }
  };

  const testEnvSupabase = async () => {
    updateCheck('env-supabase', { status: 'RUNNING' });
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey) {
      updateCheck('env-supabase', { status: 'PASS', message: 'Supabase credentials detected.' });
    } else {
      const missing = [];
      if (!supabaseUrl) missing.push('VITE_SUPABASE_URL');
      if (!supabaseKey) missing.push('VITE_SUPABASE_ANON_KEY');
      updateCheck('env-supabase', { status: 'FAIL', message: 'Missing credentials.', details: `Missing: ${missing.join(', ')}` });
    }
  };

  const testEnvN8N = async () => {
    updateCheck('env-n8n', { status: 'RUNNING' });
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
    
    if (webhookUrl && webhookUrl.startsWith('http')) {
      updateCheck('env-n8n', { status: 'PASS', message: 'n8n webhook configured.' });
    } else {
      updateCheck('env-n8n', { status: 'FAIL', message: 'No n8n webhook configured.', details: 'VITE_N8N_WEBHOOK_URL is missing or invalid.' });
    }
  };

  const testApiSupabase = async () => {
    updateCheck('api-supabase', { status: 'RUNNING' });
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        updateCheck('api-supabase', { status: 'FAIL', message: 'Client creation failed.' });
        return;
      }
      const { error } = await supabase.from('audio_logs').select('count', { count: 'exact', head: true });
      if (error) throw error;
      updateCheck('api-supabase', { status: 'PASS', message: 'Database connection successful.' });
    } catch (e: any) {
      updateCheck('api-supabase', { status: 'FAIL', message: 'Connection failed.', details: e.message });
    }
  };

  const testApiN8N = async () => {
    updateCheck('api-n8n', { status: 'RUNNING' });
    const url = import.meta.env.VITE_N8N_WEBHOOK_URL;
    
    if (!url) {
      updateCheck('api-n8n', { status: 'FAIL', message: 'No webhook URL configured.' });
      return;
    }
    
    try {
      const res = await fetch(url, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DIAGNOSTIC_PING', timestamp: Date.now() })
      });
      
      if (res.ok) {
        updateCheck('api-n8n', { status: 'PASS', message: 'n8n webhook responding.' });
      } else {
        updateCheck('api-n8n', { status: 'FAIL', message: `HTTP ${res.status}`, details: 'Webhook returned non-200 status.' });
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
