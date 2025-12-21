import React, { useState, useEffect } from 'react';
import { Save, Server, Key, Link as LinkIcon, AlertTriangle, Clock, Database, ExternalLink, CheckCircle } from 'lucide-react';

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
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SUCCESS'>('IDLE');

  useEffect(() => {
    const saved = localStorage.getItem('southport_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Failed to parse config", e);
      }
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
    if (saveStatus === 'SUCCESS') setSaveStatus('IDLE');
  };

  const handleSave = () => {
    setSaveStatus('SAVING');
    localStorage.setItem('southport_config', JSON.stringify(config));
    
    setTimeout(() => {
      setSaveStatus('SUCCESS');
      setTimeout(() => {
        window.location.reload();
      }, 800);
    }, 400);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="bg-slate-800 rounded-3xl border border-slate-700/50 p-6 md:p-8 shadow-2xl relative overflow-hidden text-left">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
        
        <div className="flex items-center gap-4 mb-8 border-b border-slate-700/50 pb-6">
          <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
            <Server size={28} />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight text-white uppercase">Infrastructure Core</h3>
            <p className="text-sm text-slate-400 font-medium">Connect external nodes and database layers.</p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <h4 className="text-white text-xs font-black uppercase tracking-[0.2em] mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2"><Database size={14} className="text-emerald-400" /> Database Layer (Supabase)</span>
              <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 normal-case tracking-normal text-[11px] font-bold">
                Get Credentials <ExternalLink size={10} />
              </a>
            </h4>
            
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 mb-6 flex gap-4">
              <AlertTriangle className="text-emerald-500 shrink-0" size={20} />
              <div className="text-[10px] md:text-xs text-emerald-200/70 leading-relaxed font-medium">
                Find these in your Supabase Dashboard under <strong>Project Settings &rarr; API</strong>. 
                Use the <code className="bg-emerald-950 px-1 rounded">anon public</code> key.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Endpoint URL</label>
                <input 
                  type="text" 
                  name="supabaseUrl"
                  value={config.supabaseUrl}
                  onChange={handleChange}
                  placeholder="https://xyz.supabase.co"
                  className="w-full bg-slate-900/50 border border-slate-700/80 rounded-xl p-3.5 text-sm text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all shadow-inner"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Anon Public Key</label>
                <input 
                  type="password" 
                  name="supabaseKey"
                  value={config.supabaseKey}
                  onChange={handleChange}
                  placeholder="eyJh..."
                  className="w-full bg-slate-900/50 border border-slate-700/80 rounded-xl p-3.5 text-sm text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all shadow-inner"
                />
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-700/50 space-y-4">
            <h4 className="text-white text-xs font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <LinkIcon size={14} className="text-green-400" /> Automation Webhooks (n8n)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email Intake</label>
                <input 
                  type="text" 
                  name="n8nWebhookEmail"
                  value={config.n8nWebhookEmail}
                  onChange={handleChange}
                  placeholder="https://n8n.eric-infra.com/..."
                  className="w-full bg-slate-900/50 border border-slate-700/80 rounded-xl p-3.5 text-sm text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Audio Intake (Logger)</label>
                <input 
                  type="text" 
                  name="n8nWebhookAudio"
                  value={config.n8nWebhookAudio}
                  onChange={handleChange}
                  placeholder="https://n8n.eric-infra.com/..."
                  className="w-full bg-slate-900/50 border border-slate-700/80 rounded-xl p-3.5 text-sm text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col md:flex-row gap-4 justify-end">
          <button 
            onClick={handleSave}
            disabled={saveStatus === 'SAVING'}
            className={`group flex items-center justify-center gap-3 px-10 py-4 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl ${
              saveStatus === 'SUCCESS' ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-500'
            } text-white shadow-blue-900/20`}
          >
            {saveStatus === 'SUCCESS' ? (
              <CheckCircle size={20} className="animate-in zoom-in" />
            ) : (
              <Save size={20} className={saveStatus === 'SAVING' ? 'animate-spin' : ''} />
            )}
            {saveStatus === 'SAVING' ? 'Syncing...' : saveStatus === 'SUCCESS' ? 'Committed' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
