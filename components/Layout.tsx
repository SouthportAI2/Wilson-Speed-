
import React, { useState } from 'react';
import { Send, Sparkles, Facebook, Instagram, Copy, Check, Share2 } from 'lucide-react';
import { generateSocialPost } from '../services/gemini';

const SocialPoster: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!topic) return;
    setLoading(true);
    const result = await generateSocialPost(topic);
    setContent(result);
    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-slate-800 rounded-3xl border border-slate-700 p-8 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Share2 size={120} />
        </div>
        
        <div className="relative z-10">
          <h3 className="text-2xl font-bold text-white mb-2">Social Content Generator</h3>
          <p className="text-slate-400 mb-8">Generate high-engagement shop updates for your social channels.</p>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-3 ml-1">Post Topic or News</label>
              <div className="flex gap-4">
                <input 
                  type="text" 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. 10% off brake pads this week"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
                <button 
                  onClick={handleGenerate}
                  disabled={loading || !topic}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-8 rounded-2xl transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Sparkles className="animate-spin" size={20} /> : <Sparkles size={20} />}
                  Draft
                </button>
              </div>
            </div>

            {content && (
              <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex gap-2">
                    <div className="p-2 bg-blue-600/10 text-blue-400 rounded-lg"><Facebook size={18} /></div>
                    <div className="p-2 bg-pink-600/10 text-pink-400 rounded-lg"><Instagram size={18} /></div>
                  </div>
                  <button onClick={copyToClipboard} className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-2">
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy Draft'}
                  </button>
                </div>
                <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">{content}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialPoster;
