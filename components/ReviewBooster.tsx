import React, { useState, useEffect } from 'react';
import { Star, User, Check, Mail, Loader2, Send, AlertCircle } from 'lucide-react';
import { InfrastructureConfig } from '../types';

const ReviewBooster: React.FC = () => {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [status, setStatus] = useState<'IDLE' | 'SENDING' | 'SENT' | 'ERROR'>('IDLE');
  const [config, setConfig] = useState<InfrastructureConfig | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('southport_config');
    if (saved) setConfig(JSON.parse(saved));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.name || !config?.n8nWebhookReview) return;
    
    setStatus('SENDING');
    
    try {
      const response = await fetch(config.n8nWebhookReview, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: formData.name,
          clientEmail: formData.email,
          businessName: config.businessName || 'Wilson Speed',
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        setStatus('SENT');
        setTimeout(() => {
          setFormData({ name: '', email: '' });
          setStatus('IDLE');
        }, 3000);
      } else {
        setStatus('ERROR');
      }
    } catch (err) {
      console.error("Send failed:", err);
      setStatus('ERROR');
    }
  };

  const isConfigReady = !!config?.n8nWebhookReview;

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 blur-[100px] -mr-32 -mt-32" />
        
        <div className="text-center mb-10 relative z-10">
           <div className="w-20 h-20 bg-yellow-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3 border border-yellow-500/20">
             <Star className="text-yellow-400 fill-yellow-400" size={36} />
           </div>
           <h3 className="text-3xl font-bold text-white mb-2 tracking-tight">Review Booster</h3>
           <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">Customer Sentiment Optimization Node</p>
        </div>

        {!isConfigReady && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-400">
            <AlertCircle size={20} />
            <p className="text-xs font-bold uppercase tracking-wide">Review Booster Webhook node offline. Configure Identity & Nodes in Settings.</p>
          </div>
        )}

        {status === 'IDLE' || status === 'SENDING' ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-6">
              <div className="relative">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Client Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. John Doe"
                    required
                    disabled={status === 'SENDING'}
                    className="w-full bg-slate-950/60 border border-slate-700/80 rounded-2xl pl-12 pr-4 py-4 text-white font-medium focus:ring-2 focus:ring-yellow-500/50 outline-none transition-all placeholder:text-slate-700 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="relative">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="client@example.com"
                    required
                    disabled={status === 'SENDING'}
                    className="w-full bg-slate-950/60 border border-slate-700/80 rounded-2xl pl-12 pr-4 py-4 text-white font-medium focus:ring-2 focus:ring-yellow-500/50 outline-none transition-all placeholder:text-slate-700 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={status === 'SENDING' || !isConfigReady}
              className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-black py-5 rounded-2xl transition-all active:scale-95 shadow-xl shadow-yellow-900/20 flex items-center justify-center gap-3 uppercase tracking-widest text-xs disabled:opacity-50"
            >
              {status === 'SENDING' ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Sending Email...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Send Review Request
                </>
              )}
            </button>
          </form>
        ) : status === 'SENT' ? (
          <div className="text-center py-10">
             <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-500/20">
               <Check className="text-emerald-500" size={48} />
             </div>
             <h4 className="text-2xl font-black text-white mb-4">Email Sent!</h4>
             <p className="text-slate-400 text-sm">Review request has been sent successfully.</p>
          </div>
        ) : (
          <div className="text-center py-10">
             <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-500/20">
               <AlertCircle className="text-red-500" size={48} />
             </div>
             <h4 className="text-2xl font-black text-white mb-4">Send Failed</h4>
             <p className="text-slate-400 text-sm mb-6">Please check your webhook configuration.</p>
             <button 
               onClick={() => setStatus('IDLE')} 
               className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-xl transition-all"
             >
               Try Again
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewBooster;
