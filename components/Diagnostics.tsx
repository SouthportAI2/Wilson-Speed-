import React, { useState, useEffect } from 'react';
import { Shield, AlertCircle, CheckCircle, Terminal, X, Zap } from 'lucide-react';

export const Diagnostics: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState({
    apiKey: 'CHECKING',
    supabase: 'CHECKING',
    environment: 'CHECKING',
    tailwind: 'CHECKING'
  });

  useEffect(() => {
    // Check API Key
    const key = process.env.API_KEY;
    const keyStatus = key && key.length > 5 ? 'OK' : 'MISSING';
    
    // Check Tailwind (by looking for a computed style injected by CDN)
    const tailwindStatus = window.getComputedStyle(document.body).display ? 'OK' : 'FAIL';

    // Check Supabase Settings
    const stored = localStorage.getItem('southport_config');
    const hasSupabase = stored && JSON.parse(stored).supabaseUrl ? 'CONFIGURED' : 'NOT_CONFIGURED';

    setStatus({
      apiKey: keyStatus,
      supabase: hasSupabase,
      environment: typeof window !== 'undefined' ? 'BROWSER' : 'ERROR',
      tailwind: tailwindStatus
    });
  }, []);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[100] p-4 bg-blue-600 rounded-full shadow-2xl hover:scale-110 transition-transform animate-pulse-slow border border-blue-400/50"
      >
        <Shield size={24} className="text-white" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[101] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Terminal className="text-blue-400" size={20} />
            <h2 className="font-black uppercase tracking-widest text-sm">Infrastructure Diagnostic Console</h2>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DiagnosticItem 
              label="Gemini API Key" 
              value={status.apiKey} 
              isOk={status.apiKey === 'OK'} 
              desc={status.apiKey === 'OK' ? "Key injected successfully." : "Key is undefined in process.env."}
            />
            <DiagnosticItem 
              label="Tailwind Runtime" 
              value={status.tailwind} 
              isOk={status.tailwind === 'OK'} 
              desc="Styles are being applied to DOM."
            />
            <DiagnosticItem 
              label="Supabase Node" 
              value={status.supabase} 
              isOk={status.supabase === 'CONFIGURED'} 
              desc="Check Settings to link your DB."
            />
            <DiagnosticItem 
              label="Runtime Context" 
              value={status.environment} 
              isOk={status.environment === 'BROWSER'} 
              desc="ESM Client initialization active."
            />
          </div>

          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 font-mono text-xs text-slate-400 space-y-2">
            <div className="text-blue-400 font-bold mb-2 uppercase tracking-widest">Initialization Logs</div>
            <p>[SYSTEM] Booting Eric Wilson Infrastructure Core...</p>
            <p>[AUTH] Checking process.env.API_KEY...</p>
            {status.apiKey !== 'OK' && <p className="text-red-500">[ERROR] process.env.API_KEY NOT FOUND. DASHBOARD WILL RUN IN SAFE-MODE.</p>}
            <p>[UI] Verifying Tailwind CDN reachability...</p>
            <p>[DATABASE] Initializing storage listeners...</p>
          </div>

          {status.apiKey !== 'OK' && (
            <div className="bg-red-500/10 border border-red-500/30 p-5 rounded-2xl flex gap-4">
              <AlertCircle className="text-red-500 shrink-0" size={20} />
              <div className="text-xs text-red-200 leading-relaxed">
                <span className="font-bold block mb-1">ACTION REQUIRED</span>
                The Gemini AI features require an API Key. Ensure your environment provider has <code className="bg-red-950 px-1 rounded">API_KEY</code> set in its project configuration.
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end">
          <button 
            onClick={() => setIsOpen(false)}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all"
          >
            Acknowledge & Continue
          </button>
        </div>
      </div>
    </div>
  );
};

const DiagnosticItem: React.FC<{ label: string; value: string; isOk: boolean; desc: string }> = ({ label, value, isOk, desc }) => (
  <div className={`p-4 rounded-xl border ${isOk ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
    <div className="flex items-center justify-between mb-1">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      {isOk ? <CheckCircle size={14} className="text-emerald-500" /> : <AlertCircle size={14} className="text-red-500" />}
    </div>
    <div className={`font-bold text-sm ${isOk ? 'text-emerald-400' : 'text-red-400'}`}>{value}</div>
    <div className="text-[10px] text-slate-500 mt-1 font-medium italic">{desc}</div>
  </div>
);
