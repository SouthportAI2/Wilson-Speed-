import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Server, 
  AlertTriangle, 
  CheckCircle, 
  Database, 
  Zap, 
  ShieldCheck, 
  Building2, 
  Phone, 
  MapPin,
  Settings as SettingsIcon 
} from 'lucide-react';
import { InfrastructureConfig } from '../types';

const Settings: React.FC = () => {
  const [config, setConfig] = useState<InfrastructureConfig | any>({
    n8nWebhookEmail: '',
    n8nWebhookAudio: '',
    n8nWebhookSocial: '',
    n8nWebhookReview: '',
    supabaseUrl: '',
    supabaseKey: '',
    businessName: '',
    businessPhone: '',
    googleMapsLink: '',
  });
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SUCCESS'>('IDLE');

  useEffect(() => {
    // Load from localStorage first
    const saved = localStorage.getItem('southport_config');
    let loadedConfig: any = {
      n8nWebhookEmail: '',
      n8nWebhookAudio: '',
      n8nWebhookSocial: '',
      n8nWebhookReview: '',
      supabaseUrl: '',
      supabaseKey: '',
      businessName: '',
      businessPhone: '',
      googleMapsLink: '',
    };

    if (saved) {
      try {
        loadedConfig = { ...loadedConfig, ...JSON.parse(saved) };
      } catch (e) {
        console.error("Failed to parse config", e);
      }
    }

    // Use environment variables as defaults if localStorage is empty
    setConfig({
      n8nWebhookEmail: loadedConfig.n8nWebhookEmail || (import.meta as any).env.VITE_N8N_WEBHOOK_EMAIL || '',
      n8nWebhookAudio: loadedConfig.n8nWebhookAudio || (import.meta as any).env.VITE_N8N_WEBHOOK_AUDIO || '',
      n8nWebhookSocial: loadedConfig.n8nWebhookSocial || (import.meta as any).env.VITE_N8N_WEBHOOK_SOCIAL || '',
      n8nWebhookReview: loadedConfig.n8nWebhookReview || (import.meta as any).env.VITE_N8N_WEBHOOK_REVIEW || '',
      supabaseUrl: loadedConfig.supabaseUrl || (import.meta as any).env.VITE_SUPABASE_URL || '',
      supabaseKey: loadedConfig.supabaseKey || (import.meta as any).env.VITE_SUPABASE_KEY || '',
      businessName: loadedConfig.businessName || (import.meta as any).env.VITE_BUSINESS_NAME || '',
      businessPhone: loadedConfig.businessPhone || (import.meta as any).env.VITE_BUSINESS_PHONE || '',
      googleMapsLink: loadedConfig.googleMapsLink || (import.meta as any).env.VITE_GOOGLE_MAPS_LINK || '',
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig({ ...config, [name] : value });
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
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] border border-slate-800 p-8 md:p-12 shadow-2xl relative overflow-hidden text-left">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
        
        <div className="flex items-center gap-6 mb-12 border-b border-slate-800 pb-10">
          <div className="p-5 bg-blue-600 rounded-3xl text-white shadow-xl shadow-blue-900/20">
            <SettingsIcon size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tight text-white uppercase italic">Infrastructure Core</h2>
            <p className="text-sm text-slate-500 font-bold tracking-widest uppercase">Protocol Configuration & Identity</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* LEFT COLUMN: BUSINESS PROFILE */}
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <Building2 className="text-blue-500" size={20} />
              <h4 className="text-white text-xs font-black uppercase tracking-[0.2em]">Business Identity Profile</h4>
            </div>

            <div className="space-y-6 bg-slate-950/40 p-8 rounded-3xl border border-slate-800/50">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Building2 size={12} /> Business Name
                </label>
                <input 
                  type="text" 
                  name="businessName"
                  value={config.businessName}
                  onChange={handleChange}
                  placeholder="e.g. Southport Auto Specialists"
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-sm text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Phone size={12} /> Business Phone Number
                </label>
                <input 
                  type="text" 
                  name="businessPhone"
                  value={config.businessPhone}
                  onChange={handleChange}
                  placeholder="(555) 123-4567"
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-sm text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <MapPin size={12} /> Google Maps Review Link
                </label>
                <input 
                  type="text" 
                  name="googleMapsLink"
                  value={config.googleMapsLink}
                  onChange={handleChange}
                  placeholder="https://g.page/r/..."
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-sm text-white focus:ring-2 focus:ring-yellow-500/50 outline-none transition-all"
                />
                <p className="text-[9px] text-slate-600 font-medium px-1 italic">Used by the Review Booster node to generate one-tap review requests.</p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: AUTOMATION NODES */}
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <Zap className="text-blue-500" size={20} />
              <h4 className="text-white text-xs font-black uppercase tracking-[0.2em]">Network Webhooks & DB</h4>
            </div>
            
            <div className="space-y-6 bg-slate-950/40 p-8 rounded-3xl border border-slate-800/50">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Node Webhook</label>
                  <input 
                    type="text" 
                    name="n8nWebhookEmail"
                    value={config.n8nWebhookEmail}
                    onChange={handleChange}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-[11px] text-white focus:ring-2 focus:ring-blue-500/50 outline-none font-mono"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Audio Node Webhook</label>
                  <input 
                    type="text" 
                    name="n8nWebhookAudio"
                    value={config.n8nWebhookAudio}
                    onChange={handleChange}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-[11px] text-white focus:ring-2 focus:ring-blue-500/50 outline-none font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Social Media Webhook</label>
                  <input 
                    type="text" 
                    name="n8nWebhookSocial"
                    value={config.n8nWebhookSocial}
                    onChange={handleChange}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-[11px] text-white focus:ring-2 focus:ring-indigo-500/50 outline-none font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Review Booster Webhook</label>
                  <input 
                    type="text" 
                    name="n8nWebhookReview"
                    value={config.n8nWebhookReview}
                    onChange={handleChange}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-[11px] text-white focus:ring-2 focus:ring-yellow-500/50 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/50 space-y-4">
                <div className="flex items-center gap-2">
                  <Database className="text-emerald-500" size={14} />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Archive Storage Cluster</span>
                </div>
                <div className="space-y-3">
                  <input 
                    type="text" 
                    name="supabaseUrl"
                    value={config.supabaseUrl}
                    onChange={handleChange}
                    placeholder="Supabase Project URL"
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-[11px] text-white outline-none font-mono"
                  />
                  <input 
                    type="password" 
                    name="supabaseKey"
                    value={config.supabaseKey}
                    onChange={handleChange}
                    placeholder="Supabase API Key"
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-[11px] text-white outline-none font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col md:flex-row gap-8 justify-between items-center bg-slate-950/40 p-8 rounded-[2rem] border border-slate-800/50 shadow-inner">
          <div className="flex items-center gap-5 text-slate-500">
            <div className="p-3 bg-yellow-500/10 rounded-2xl">
              <AlertTriangle size={24} className="text-yellow-500" />
            </div>
            <p className="text-xs font-medium leading-relaxed max-w-sm">Identity updates propagate globally across all AI nodes. Verify webhook connectivity after saving to ensure seamless handshakes.</p>
          </div>
          <button 
            onClick={handleSave}
            disabled={saveStatus === 'SAVING'}
            className={`w-full md:w-auto group flex items-center justify-center gap-4 px-16 py-5 rounded-2xl font-black uppercase tracking-[0.15em] transition-all active:scale-[0.97] shadow-2xl ${
              saveStatus === 'SUCCESS' ? 'bg-emerald-600 shadow-emerald-900/40' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/40'
            } text-white text-sm`}
          >
            {saveStatus === 'SUCCESS' ? (
              <CheckCircle size={20} className="animate-in zoom-in duration-300" />
            ) : (
              <Save size={20} className={saveStatus === 'SAVING' ? 'animate-spin' : 'group-hover:translate-y-[-2px] transition-transform'} />
            )}
            {saveStatus === 'SAVING' ? 'Synchronizing Nodes...' : saveStatus === 'SUCCESS' ? 'Infrastructure Locked' : 'Commit Configuration'}
          </button>
        </div>
      </div>
      
      <div className="flex items-center justify-center gap-12 py-8 opacity-20 grayscale hover:grayscale-0 hover:opacity-40 transition-all duration-700">
         <ShieldCheck size={32} />
         <Server size={32} />
         <Database size={32} />
      </div>
    </div>
  );
};

export default Settings;
