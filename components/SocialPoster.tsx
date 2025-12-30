import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Facebook, Instagram, Image as ImageIcon, Check, Share2, Upload, X, Loader2, Send, AlertCircle, Zap, Lock, ShieldCheck } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { InfrastructureConfig } from '../types';

// Extend local config type to include geminiApiKey
type SocialConfig = InfrastructureConfig & { geminiApiKey?: string };

const SocialPoster: React.FC = () => {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [postStatus, setPostStatus] = useState<'idle' | 'posting' | 'success' | 'error'>('idle');
  const [config, setConfig] = useState<SocialConfig | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('southport_config');
    if (saved) setConfig(JSON.parse(saved));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newImages: string[] = [];
    const fileArray = Array.from(files);
    
    // Limit to 8 images total
    const remainingSlots = 8 - images.length;
    const filesToProcess = fileArray.slice(0, remainingSlots);
    
    let processed = 0;
    if (filesToProcess.length === 0) return;

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newImages.push(reader.result as string);
        processed++;
        if (processed === filesToProcess.length) {
          setImages(prev => [...prev, ...newImages]);
          setContent('');
          setPostStatus('idle');
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setContent('');
  };

  const handleGenerate = async () => {
    if (images.length === 0 || !config?.geminiApiKey) {
      alert("Please configure Gemini API Key in Settings");
      return;
    }
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
      const base64Data = images[0].split(',')[1];
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: 'image/jpeg',
              },
            },
            {
              text: `You are a professional social media manager for Wilson Speed, an auto repair shop in Southport, NC run by Eric Wilson. Analyze this photo${images.length > 1 ? ` (1 of ${images.length} images)` : ''} and create a compelling, professional social media caption. Be authentic, highlight quality workmanship, and keep it concise (2-3 sentences max). Use a confident, professional tone. Return ONLY the caption text.`,
            },
          ],
        },
      });

      setContent(response.text || '');
    } catch (err) {
      console.error("Analysis failed:", err);
      setContent("Error generating content. Verify API Key node.");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAndPost = async () => {
    if (!config?.n8nWebhookSocial) {
      alert("Social distribution node (n8n Webhook) not configured.");
      return;
    }
    
    setPostStatus('posting');
    
    try {
      const response = await fetch(config.n8nWebhookSocial, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: images,
          caption: content,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        setPostStatus('success');
      } else {
        setPostStatus('error');
      }
    } catch (err) {
      console.error("Post failed:", err);
      setPostStatus('error');
    }
  };

  const clear = () => {
    setImages([]);
    setContent('');
    setPostStatus('idle');
  };

  const isConfigReady = !!config?.n8nWebhookSocial;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 blur-[100px] -mr-32 -mt-32" />
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-900/20">
                <Share2 size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white tracking-tight">Social Poster</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Multi-Channel Distribution Engine</p>
              </div>
            </div>
            
            <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${isConfigReady ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
              <Zap size={14} className={isConfigReady ? 'animate-pulse' : ''} />
              <span className="text-[10px] font-black uppercase tracking-widest">{isConfigReady ? 'Webhook Connected' : 'Webhook Offline'}</span>
            </div>
          </div>

          {!isConfigReady && (
            <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-400">
              <AlertCircle size={20} />
              <p className="text-xs font-bold uppercase tracking-wide">Backend Webhook missing. Configure Social Webhook in Settings.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              {/* Image Grid */}
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    onClick={() => images.length === index && fileInputRef.current?.click()}
                    className={`relative aspect-square rounded-2xl border-2 transition-all flex items-center justify-center overflow-hidden ${
                      images[index]
                        ? 'border-indigo-500/50 bg-slate-950/40'
                        : index === images.length
                        ? 'border-dashed border-slate-700 hover:border-indigo-500/50 bg-slate-900/20 hover:bg-slate-900/40 cursor-pointer active:scale-95'
                        : 'border-slate-800/30 bg-slate-950/20 opacity-30'
                    }`}
                  >
                    {images[index] ? (
                      <>
                        <img src={images[index]} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(index);
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-slate-950/90 rounded-full text-white hover:bg-red-500 transition-colors border border-slate-700"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : index === images.length ? (
                      <div className="flex flex-col items-center gap-2 p-4 text-center">
                        <div className="p-3 bg-indigo-500/10 rounded-full text-indigo-400">
                          <Upload size={20} />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {images.length === 0 ? 'Tap to Upload' : `Add ${index + 1}`}
                        </p>
                      </div>
                    ) : (
                      <div className="text-slate-800 text-xs font-bold">{index + 1}</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Upload Instructions */}
              {images.length === 0 && (
                <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl">
                  <p className="text-xs text-indigo-400 font-medium text-center">
                    📱 Tap to upload up to 8 photos from your phone or computer
                  </p>
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                multiple
                className="hidden"
              />

              {!content && images.length > 0 && (
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white font-black rounded-2xl transition-all active:scale-95 shadow-xl shadow-indigo-900/20 uppercase tracking-widest text-xs"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  Draft Social Intelligence
                </button>
              )}
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex-1 bg-slate-950/60 rounded-[2rem] border border-slate-800 p-8 relative min-h-[300px]">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><Sparkles size={14} /></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Strategy Draft</span>
                  </div>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center h-48 gap-4">
                    <Loader2 size={40} className="text-indigo-500 animate-spin" />
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Algorithmic Drafting...</p>
                  </div>
                ) : content ? (
                  <div className="space-y-4">
                    {images.length > 1 && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                        <ImageIcon size={14} className="text-indigo-400" />
                        <span className="text-xs font-bold text-indigo-400">{images.length} photos selected</span>
                      </div>
                    )}
                    <textarea 
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full h-48 bg-transparent text-slate-200 text-sm leading-relaxed font-medium resize-none focus:outline-none custom-scrollbar"
                    />
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                    <ImageIcon size={48} className="mb-4 text-slate-700" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 italic">Idle - Load Asset</p>
                  </div>
                )}
              </div>

              {content && postStatus === 'idle' && (
                <button 
                  onClick={handleApproveAndPost}
                  disabled={!isConfigReady}
                  className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl transition-all active:scale-95 shadow-xl shadow-emerald-900/20 uppercase tracking-widest text-xs disabled:opacity-20"
                >
                  <Send size={18} /> Execute Transmission
                </button>
              )}

              {postStatus === 'posting' && (
                <div className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-slate-800 text-white font-black rounded-2xl uppercase tracking-widest text-xs">
                  <Loader2 size={18} className="animate-spin" /> Transmitting to Distribution Node...
                </div>
              )}

              {postStatus === 'success' && (
                <div className="w-full flex flex-col items-center justify-center gap-3 px-8 py-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black rounded-2xl uppercase tracking-widest text-xs">
                  <div className="flex items-center gap-2"><Check size={18} /> Broadcast Confirmed</div>
                  <button onClick={clear} className="text-[9px] text-slate-500 hover:text-white mt-2">New Distribution</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialPoster;
