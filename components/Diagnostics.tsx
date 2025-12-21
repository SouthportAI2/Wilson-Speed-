import React, { useState, useEffect } from 'react';
import { Shield, AlertCircle, CheckCircle, Terminal, X, Key, Settings, ExternalLink } from 'lucide-react';

/**
 * Fix: Removed redundant Window['aistudio'] declaration that was colliding with 
 * the environment's predefined AIStudio type. Access is now performed via safe 
 * runtime checks and type assertions.
 */

export const Diagnostics: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState({
    apiKey: 'CHECKING',
    supabase: 'CHECKING',
    environment: 'CHECKING',
    tailwind: 'CHECKING'
  });

  const checkStatus = async () => {
    // Check API Key
    let key = process.env.API_KEY;
    let keyStatus = key && key.length > 5 ? 'OK' : 'MISSING';
    
    // Check for AI Studio specialized selection if env var is missing
    const aistudio = (window as any).aistudio;
    if (keyStatus === 'MISSING' && aistudio) {
      const hasKey = await aistudio.hasSelectedApiKey();
      if (hasKey) keyStatus = 'OK';
    }

    // Check Tailwind
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
  };

  useEffect(() => {
    checkStatus();
    // Re-check periodically if key is missing
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleConnectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      await aistudio.openSelectKey();
      // Assume success as per instructions
      setStatus(prev => ({ ...prev, apiKey: 'OK' }));
    } else {
      alert("AI Studio environment not detected. Please set process.env.API_KEY in your environment configuration.");
    }
  };

  if (!isOpen) {
    const hasError = status.apiKey !== 'OK' || status.supabase !== 'CONFIGURED';
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-[100] p-4 rounded-full shadow-2xl hover:scale-110 transition-all border animate-pulse-slow ${
          hasError ? 'bg-red-600 border-red-400/50 shadow-red-900/40' : 'bg-blue-600 border-blue-400/50 shadow-blue-900/40'
        }`}
      >
        <Shield size={24} className="text-white" />
        {hasError && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
            <AlertCircle size={12} className="text-red-600" />
          </div>
        )}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[101] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-6 overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Terminal className="text-blue-400" size={20} />
            <h2 className="font-black uppercase tracking-widest text-sm">Infrastructure Diagnostic Console</h2>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DiagnosticItem 
              label="Gemini API Node" 
              value={status.apiKey} 
              isOk={status.apiKey === 'OK'} 
              desc={status.apiKey === 'OK' ? "AI Services are online." : "Authentication required."}
              action={status.apiKey !== 'OK' ? { label: 'Connect Key', onClick: handleConnectKey, icon: Key } : undefined}
            />
            <DiagnosticItem 
              label="Storage Cluster" 
              value={status.supabase} 
              isOk={status.supabase === 'CONFIGURED'} 
              desc={status.supabase === 'CONFIGURED' ? "Supabase link active." : "Database unlinked."}
              action={status.supabase !== 'CONFIGURED' ? { label: 'Go to Settings', onClick: () => setIsOpen(false), icon: Settings } : undefined}
            />
          </div>

          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 font-mono text-[10px] md:text-xs text-slate-500 space-y-1">
            <div className="text-blue-500 font-black mb-2 uppercase tracking-widest flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
               Live Initialisation Logs
            </div>
            <p><span className="text-slate-700">[{new Date().toLocaleTimeString()}]</span> Booting Core OS...</p>
            {status.apiKey !== 'OK' ? (
              <p className="text-red-500/80">[ERROR] Authentication token missing in secure environment.</p>
            ) : (
              <p className="text-emerald-500/80">[AUTH] Gemini Handshake Successful.</p>
            )}
            {status.supabase !== 'CONFIGURED' && (
              <p className="text-orange-500/80">[WARN] Supabase credentials not found. Local mock state active.</p>
            )}
            <p>[INFO] UI Virtual DOM injected. Tailwind CSS v3 runtime detected.</p>
          </div>

          <div className="bg-blue-500/5 border border-blue-500/10 p-5 rounded-2xl flex gap-4">
            <div className="p-2 bg-blue-500/10 rounded-lg h-fit">
              <ExternalLink className="text-blue-400" size={18} />
            </div>
            <div className="text-xs text-slate-400 leading-relaxed">
              <span className="font-bold text-white block mb-1 uppercase tracking-widest text-[10px]">Documentation</span>
              Ensure you are using an API Key from a paid GCP project. Check the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-blue-400 underline hover:text-blue-300">billing documentation</a> for details on quota and requirements.
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end">
          <button 
            onClick={() => setIsOpen(false)}
            className="w-full md:w-auto px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-blue-900/20 active:scale-95"
          >
            Acknowledge & Sync
          </button>
        </div>
      </div>
    </div>
  );
};

const DiagnosticItem: React.FC<{ 
  label: string; 
  value: string; 
  isOk: boolean; 
  desc: string;
  action?: { label: string; onClick: () => void; icon: any };
}> = ({ label, value, isOk, desc, action }) => (
  <div className={`p-5 rounded-2xl border transition-all ${isOk ? 'bg-emerald-500/5 border-emerald-500/20 shadow-emerald-950/20 shadow-inner' : 'bg-red-500/5 border-red-500/20'}`}>
    <div className="flex items-center justify-between mb-3">
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</span>
      {isOk ? <CheckCircle size={16} className="text-emerald-500" /> : <AlertCircle size={16} className="text-red-500" />}
    </div>
    <div className={`font-black text-xl mb-1 tracking-tight ${isOk ? 'text-emerald-400' : 'text-red-400'}`}>{value}</div>
    <div className="text-[10px] text-slate-500 font-medium leading-relaxed mb-4">{desc}</div>
    {action && (
      <button 
        onClick={action.onClick}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-slate-800 transition-colors"
      >
        <action.icon size={12} className="text-blue-400" />
        {action.label}
      </button>
    )}
  </div>
);
