import React, { useState } from 'react';
import { Star, Send, User, Check, Mail } from 'lucide-react';
import { generateReviewEmail } from '../services/gemini';

const ReviewBooster: React.FC = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'GENERATING' | 'SENT'>('IDLE');
  const [preview, setPreview] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('GENERATING');
    
    try {
      const result = await generateReviewEmail(email);
      setPreview(result);
      // Simulate or call webhook if needed
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStatus('SENT');
    } catch (error) {
      console.error(error);
      setStatus('SENT'); 
    }
  };

  const reset = () => {
    setEmail('');
    setStatus('IDLE');
    setPreview('');
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 shadow-2xl">
        <div className="text-center mb-8">
           <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
             <Star className="text-yellow-400 fill-yellow-400" size={32} />
           </div>
           <h3 className="text-2xl font-bold text-white mb-2">Google Review Booster</h3>
           <p className="text-slate-400">Personalized high-conversion review requests.</p>
        </div>

        {status === 'SENT' ? (
          <div className="text-center py-10 animate-fade-in">
             <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
               <Check className="text-green-500" size={32} />
             </div>
             <h4 className="text-xl font-bold text-white mb-2">Request Ready!</h4>
             <div className="bg-slate-900 p-4 rounded-lg text-left text-sm text-slate-300 mb-6 whitespace-pre-wrap border border-slate-800 font-mono">
               {preview}
             </div>
             <button onClick={reset} className="text-blue-400 hover:text-blue-300 font-medium">Send another request</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Client Email</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@example.com"
                  required
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-12 pr-4 py-4 text-white text-lg focus:ring-2 focus:ring-yellow-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={status === 'GENERATING'}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 text-white font-bold py-4 rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {status === 'GENERATING' ? 'Analyzing...' : <><Send size={20} /> Generate Request</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReviewBooster;
