
import React, { useState, useEffect } from 'react';
import { Star, Send, User, Check, Mail, ChevronRight, Loader2, RefreshCw, X, AlertCircle } from 'lucide-react';
import { generateReviewEmail } from '../services/gemini';
import { InfrastructureConfig } from '../types';

const ReviewBooster: React.FC = () => {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [status, setStatus] = useState<'IDLE' | 'GENERATING' | 'REVIEWING' | 'SENDING' | 'SENT' | 'ERROR'>('IDLE');
  const [preview, setPreview] = useState('');
  const [config, setConfig] = useState<InfrastructureConfig | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('southport_config');
    if (saved) setConfig(JSON.parse(saved));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.name) return;
    setStatus('GENERATING');
    
    try {
      // Pass business identity info to the generator if available
      const businessName = config?.businessName || "Infrastructure Root Node";
      const result = await generateReviewEmail(formData.name, formData.email);
      
      // Post-process the result to inject the real review link if it exists
      let finalDraft = result;
      if (config?.googleMapsLink) {
        finalDraft = result.replace(/\[REVIEW_LINK\]/g, config.googleMapsLink);
      }
      
      setPreview(finalDraft);
      setStatus('REVIEWING');
    } catch (error) {
      console.error(error);
      setStatus('ERROR'); 
    }
  };

  const handleApproveAndSend = async () => {
    if (!config?.n8nWebhookReview) {
      alert("Infrastructure Error: Review Booster Webhook node not configured in Settings.");
      return;
    }

    setStatus('SENDING');
    
    try {
      const response = await fetch(config.n8nWebhookReview, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'REVIEW_REQUEST',
          clientName: formData.name,
          clientEmail: formData.email,
          content: preview,
          businessName: config.businessName,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        setStatus('SENT');
      } else {
        setStatus('ERROR');
      }
    } catch (err) {
      console.error("Dispatch failed:", err);
      setStatus('ERROR');
    }
  };

  const reset = () => {
    setFormData({ name: '', email: '' });
    setStatus('IDLE');
    setPreview('');
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

        {status === 'IDLE' || status === 'GENERATING' ? (
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
                    className="w-full bg-slate-950/60 border border-slate-700/80 rounded-2xl pl-12 pr-4 py-4 text-white font-medium focus:ring-2 focus:ring-yellow-500/50 outline-none transition-all placeholder:text-slate-700"
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
                    className="w-full bg-slate-950/60 border border-slate-700/80 rounded-2xl pl-12 pr-4 py-4 text-white font-medium focus:ring-2 focus:ring-yellow-500/50 outline-none transition-all placeholder:text-slate-700"
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={status === 'GENERATING' || !isConfigReady}
              className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-black py-5 rounded-2xl transition-all active:scale-95 shadow-xl shadow-yellow-900/20 flex items-center justify-center gap-3 uppercase tracking-widest text-xs disabled:opacity-50"
            >
              {status === 'GENERATING' ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Drafting Professional Request...
                </>
              ) : (
                <>
                  <ChevronRight size={18} />
                  Generate Request
                </>
              )}
            </button>
          </form>
        ) : status === 'REVIEWING' || status === 'SENDING' ? (
          <div className="space-y-6">
            <div className="bg-slate-950/80 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
              <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Protocol Preview</span>
                <div className="w-6" />
              </div>
              <div className="p-8">
                <div className="mb-6 pb-6 border-b border-slate-800/50 space-y-3">
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-black">Recipient: <span className="text-slate-200 normal-case tracking-normal ml-2 font-bold">{formData.name} &lt;{formData.email}&gt;</span></p>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-black">Sender Instance: <span className="text-blue-400 normal-case tracking-normal ml-2 font-bold">{config?.businessName || 'Infrastructure Root Node'}</span></p>
                </div>
                <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium h-48 overflow-y-auto custom-scrollbar pr-2">
                  {preview}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setStatus('IDLE')}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 font-black py-5 rounded-2xl transition-all uppercase tracking-widest text-xs border border-slate-700/50"
              >
                Reset
              </button>
              <button 
                onClick={handleApproveAndSend}
                disabled={status === 'SENDING'}
                className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white font-black py-5 rounded-2xl transition-all active:scale-95 shadow-xl shadow-emerald-900/20 flex items-center justify-center gap-3 uppercase tracking-widest text-xs disabled:opacity-50"
              >
                {status === 'SENDING' ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Executing Dispatch...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Approve & Dispatch
                  </>
                )}
              </button>
            </div>
          </div>
        ) : status === 'ERROR' ? (
          <div className="text-center py-10">
             <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-500/20 shadow-lg shadow-red-900/20">
               <AlertCircle className="text-red-500" size={48} />
             </div>
             <h4 className="text-3xl font-black text-white mb-4 tracking-tighter">Transmission Error</h4>
             <p className="text-slate-400 text-sm leading-relaxed mb-10 max-w-sm mx-auto font-medium">
               The n8n webhook node did not acknowledge the dispatch packet. Check Identity & Network nodes in Settings.
             </p>
             <button 
               onClick={() => setStatus('IDLE')} 
               className="inline-flex items-center gap-3 px-12 py-5 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl transition-all uppercase tracking-widest text-xs shadow-xl"
             >
               <RefreshCw size={16} /> Re-initialize Protocol
             </button>
          </div>
        ) : (
          <div className="text-center py-10">
             <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-500/20 shadow-lg shadow-emerald-900/20">
               <Check className="text-emerald-500" size={48} />
             </div>
             <h4 className="text-3xl font-black text-white mb-4 tracking-tighter">Node Confirmed</h4>
             <p className="text-slate-400 text-sm leading-relaxed mb-10 max-w-sm mx-auto font-medium">
               The review request has been committed to the n8n SMTP relay orchestration layer.
             </p>
             <button 
               onClick={reset} 
               className="inline-flex items-center gap-3 px-12 py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all uppercase tracking-widest text-xs shadow-xl shadow-blue-900/20"
             >
               <RefreshCw size={16} /> Process New Client
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewBooster;
