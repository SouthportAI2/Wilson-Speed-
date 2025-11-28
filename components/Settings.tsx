
import React, { useState, useEffect } from 'react';
import { Save, Server, Key, Link as LinkIcon, AlertTriangle, Clock } from 'lucide-react';

const Settings: React.FC = () => {
  const [config, setConfig] = useState({
    n8nWebhookEmail: '',
    n8nWebhookSocial: '',
    n8nWebhookAudio: '',
    retellApiKey: '',
    supabaseUrl: '',
    supabaseKey: '',
    audioSegmentDuration: '5'
  });

  useEffect(() => {
    // Load saved settings from localStorage on mount
    const saved = localStorage.getItem('southport_config');
    if (saved) {
      setConfig({ ...config, ...JSON.parse(saved) });
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    localStorage.setItem('southport_config', JSON.stringify(config));
    alert('Configuration saved successfully! The app will now attempt to use these endpoints.');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-700 pb-4">
          <Server className="text-blue-400" size={24} />
          <div>
            <h3 className="text-lg font-bold text-white">System Integrations</h3>
            <p className="text-sm text-slate-400">Connect your n8n workflows and external APIs here.</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* n8n Section */}
          <div>
            <h4 className="text-white font-medium mb-3 flex items-center gap-2">
              <LinkIcon size={16} className="text-green-400" /> n8n Automation Webhooks
            </h4>
            <div className="grid gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Email Summary Webhook (GET)</label>
                <input 
                  type="text" 
                  name="n8nWebhookEmail"
                  value={config.n8nWebhookEmail}
                  onChange={handleChange}
                  placeholder="https://your-n8n-instance.com/webhook/emails"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Social Media Poster Webhook (POST)</label>
                <input 
                  type="text" 
                  name="n8nWebhookSocial"
                  value={config.n8nWebhookSocial}
                  onChange={handleChange}
                  placeholder="https://your-n8n-instance.com/webhook/social-post"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Office Audio Log Webhook (POST - Receives Audio Blob)</label>
                <input 
                  type="text" 
                  name="n8nWebhookAudio"
                  value={config.n8nWebhookAudio}
                  onChange={handleChange}
                  placeholder="https://your-n8n-instance.com/webhook/audio-upload"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Audio Configuration */}
          <div className="pt-4 border-t border-slate-700">
            <h4 className="text-white font-medium mb-3 flex items-center gap-2">
              <Clock size={16} className="text-orange-400" /> Continuous Monitoring Settings
            </h4>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Audio Segment Duration (Minutes)</label>
              <select 
                name="audioSegmentDuration"
                value={config.audioSegmentDuration}
                onChange={handleChange}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-orange-500 focus:outline-none"
              >
                <option value="1">1 Minute (Testing)</option>
                <option value="5">5 Minutes (Recommended)</option>
                <option value="10">10 Minutes</option>
                <option value="15">15 Minutes</option>
                <option value="30">30 Minutes</option>
              </select>
              <p className="text-[10px] text-slate-500 mt-1">If "Continuous Monitor Mode" is enabled, the recorder will restart and upload a new file every X minutes.</p>
            </div>
          </div>

          {/* Retell AI Section */}
          <div className="pt-4 border-t border-slate-700">
            <h4 className="text-white font-medium mb-3 flex items-center gap-2">
              <Key size={16} className="text-purple-400" /> Retell AI Configuration (Optional)
            </h4>
            <div>
              <label className="block text-xs text-slate-400 mb-1">API Key</label>
              <input 
                type="password" 
                name="retellApiKey"
                value={config.retellApiKey}
                onChange={handleChange}
                placeholder="re_123456789..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-purple-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-500 mt-1">Only required if using Retell for Telephony (Phone Calls).</p>
            </div>
          </div>

          {/* Supabase Section */}
          <div className="pt-4 border-t border-slate-700">
            <h4 className="text-white font-medium mb-3 flex items-center gap-2">
              <Server size={16} className="text-emerald-400" /> Supabase Database
            </h4>
            <div className="grid gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Project URL</label>
                <input 
                  type="text" 
                  name="supabaseUrl"
                  value={config.supabaseUrl}
                  onChange={handleChange}
                  placeholder="https://xyz.supabase.co"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Anon Public Key</label>
                <input 
                  type="password" 
                  name="supabaseKey"
                  value={config.supabaseKey}
                  onChange={handleChange}
                  placeholder="eyJh..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            <Save size={18} /> Save Configurations
          </button>
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg flex gap-3">
        <AlertTriangle className="text-amber-500 shrink-0" />
        <div className="text-sm text-amber-200">
          <p className="font-bold mb-1">Developer Mode</p>
          <p>This dashboard is currently running in prototype mode. Once you configure the n8n webhooks above, the data feeds will switch from mock data to live production data automatically.</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
