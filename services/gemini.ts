import React, { useState, useEffect } from 'react';
import { Save, Server, Key, Link as LinkIcon, AlertTriangle, Clock, Database, ExternalLink, ShieldCheck, CheckCircle2 } from 'lucide-react';

const Settings: React.FC = () => {
  const [config, setConfig] = useState({
    n8nWebhookEmail: '',
    n8nWebhookSocial: '',
    n8nWebhookAudio: '',
    n8nWebhookReview: '',
    retellApiKey: '',
    supabaseUrl: '',
    supabaseKey: '',
    audioSegmentDuration: '5'
  });
  
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('southport_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Config restoration failed:", e);
      }
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
    setIsSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem('southport_config', JSON.stringify(config));
    setIsSaved(true);
    setTimeout(() => {
      alert('Infrastructure Config Restored and Synced.');
      window.location.reload(); 
    }, 500);
  };

  const handleConnectGemini = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      await aistudio.openSelectKey();
    } else {
      alert("AI Studio environment not detected.");
    }
  };

  const hasSupabase = config.supabaseUrl && config.supabaseKey;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="bg-slate-800 rounded-3xl border border-slate-700/50 p-6 md:p-8 shadow-2xl relative overflow-hidden text-left">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
        
        <div className="flex items-center justify-between gap-4 mb-8 border-b border-slate-700/50 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
              <Server size={28} />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-white uppercase">Infrastructure Core</h3>
              <p className="text-sm text-slate-400 font-medium">Archival and intelligence node management.</p>
            </div>
          </div>
          {isSaved && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-[10px] font-black uppercase tracking-widest">
              <CheckCircle2 size={14} /> Persisted
            </div>
          )}
        </div>

        <div className="space-y-10">
          <div className="space-y-4">
            <h4 className="text-white text-xs font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <ShieldCheck size={14} className="text-blue-400" /> Intelligence (Gemini AI)
            </h4>
            <div className="bg-blue-600/5 border border-blue-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 text-left">
              <div className="space-y-2 max-w-lg">
                <p className="text-sm text-slate-300 font-bold">API Handshake</p>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  Connect your Google Gemini key for neural processing.
                </p>
              </div>
              <button 
                onClick={handleConnectGemini}
                className="w-full md:w-auto px-8 py-4 bg-slate-900 border border-blue-500/30 hover:border-blue-500 rounded-xl text-blue-400 font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"
              >
                Connect Gemini Node
              </button>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-slate-700/30">
            <h4 className="text-white text-xs font-black uppercase tracking-[0.2em] mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2"><Database size={14} className="text-emerald-400" /> Database (Supabase)</span>
              <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 normal-case tracking-normal text-[11px] font-bold">
                Credentials Console <ExternalLink size={10} />
              </a>
            </h4>
            
            <div className={`border rounded-2xl p-4 mb-6 flex gap-4 transition-colors ${hasSupabase ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
              <AlertTriangle className={hasSupabase ? 'text-emerald-500 shrink-0' : 'text-red-500 shrink-0'} size={20} />
              <div className={`text-[10px] md:text-xs leading-relaxed font-medium ${hasSupabase ? 'text-emerald-200/70' : 'text-red-200/70'}`}>
                {hasSupabase 
                  ? "Storage linked. Real-time archival is active." 
                  : "Database unlinked. Find API keys in Project Settings \u2192 API."}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 text-left block">Endpoint URL</label>
                <input 
                  type="text" 
                  name="supabaseUrl"
                  value={config.supabaseUrl}
                  onChange={handleChange}
                  placeholder="https://xyz.supabase.co"
                  className="w-full bg-slate-900/50 border border-slate-700/80 rounded-xl p-3.5 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 text-left block">Public Anon Key</label>
                <input 
                  type="password" 
                  name="supabaseKey"
                  value={config.supabaseKey}
                  onChange={handleChange}
                  placeholder="eyJh..."
                  className="w-full bg-slate-900/50 border border-slate-700/80 rounded-xl p-3.5 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-700/50 flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-4 text-left">
              <h4 className="text-white text-xs font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <Clock size={14} className="text-orange-400" /> Monitoring Cycle (Minutes)
              </h4>
              <select 
                name="audioSegmentDuration"
                value={config.audioSegmentDuration}
                onChange={handleChange}
                className="w-full bg-slate-900/50 border border-slate-700/80 rounded-xl p-3.5 text-sm text-white focus:ring-2 focus:ring-orange-500 outline-none appearance-none"
              >
                <option value="1">1 Minute</option>
                <option value="5">5 Minutes (Optimized)</option>
                <option value="10">10 Minutes</option>
                <option value="15">15 Minutes</option>
              </select>
            </div>
            
            <div className="flex-1 space-y-4 text-left">
              <h4 className="text-white text-xs font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <Key size={14} className="text-purple-400" /> Telephony Node
              </h4>
              <input 
                type="password" 
                name="retellApiKey"
                value={config.retellApiKey}
                onChange={handleChange}
                placeholder="re_..."
                className="w-full bg-slate-900/50 border border-slate-700/80 rounded-xl p-3.5 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col md:flex-row gap-4 justify-end">
          <button 
            onClick={handleSave}
            className="group flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-900/20"
          >
            <Save size={20} className="group-hover:rotate-12 transition-transform" /> 
            Commit Update
          </button>
        </div>
      </div>

      <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl flex gap-5 items-center shadow-inner text-left">
        <div className="p-3 bg-blue-500/10 rounded-full text-blue-500 shrink-0">
          <LinkIcon size={24} />
        </div>
        <div className="text-[10px] font-medium text-slate-400 leading-relaxed uppercase tracking-wider">
          <p className="text-white font-black mb-1 tracking-widest">Architecture Sync</p>
          Credentials are stored in the secure browser sandbox. Key persists across re-deployments.
        </div>
      </div>
    </div>
  );
};

export default Settings;
