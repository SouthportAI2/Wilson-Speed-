
import React, { useState, useRef } from 'react';
import { Facebook, Instagram, Calendar, CheckCircle, PenTool, Image as ImageIcon, Upload, X, Send, Loader2 } from 'lucide-react';
import { generateSocialPost } from '../services/gemini';
import { SocialPost } from '../types';

const MOCK_HISTORY: SocialPost[] = [
  {
    id: '1',
    platform: 'Facebook',
    content: "Engine rebuild complete. Southport rugged quality. 🚗💨 #ClassicCars #EricWilsonsAI",
    status: 'Published',
    scheduledFor: 'Today, 9:00 AM',
    engagement: '24 Likes • 3 Comments',
    imageUrl: 'https://images.unsplash.com/photo-1532581140115-3e355d1ed1de?auto=format&fit=crop&q=80&w=300'
  }
];

const SocialPoster: React.FC = () => {
  const [posts, setPosts] = useState<SocialPost[]>(MOCK_HISTORY);
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!topic && !selectedImage) return;
    setIsGenerating(true);
    const result = await generateSocialPost(topic, selectedImage || undefined);
    setGeneratedDraft(result);
    setIsGenerating(false);
  };

  const handleSchedule = async () => {
    if (!generatedDraft) return;
    setIsSubmitting(true);

    const newPost: SocialPost = {
      id: Date.now().toString(),
      platform: 'Facebook',
      content: generatedDraft,
      status: 'Scheduled',
      scheduledFor: 'Tomorrow, 9:00 AM',
      imageUrl: selectedImage || undefined
    };

    try {
      const storedConfig = localStorage.getItem('southport_config');
      const config = storedConfig ? JSON.parse(storedConfig) : {};
      const webhookUrl = config.n8nWebhookSocial;

      if (webhookUrl) {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform: newPost.platform,
            content: newPost.content,
            scheduledFor: newPost.scheduledFor,
            image: selectedImage
          })
        });
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setPosts([newPost, ...posts]);
      setGeneratedDraft('');
      setTopic('');
      setSelectedImage(null);
    } catch (error) {
      console.error("Social schedule error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6 shadow-xl">
        <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2 uppercase tracking-tighter">
          <PenTool className="text-orange-600" /> Content Generator
        </h3>
        
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Operational Context</label>
            <textarea 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Deploying new lift system today..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-4 text-white focus:ring-2 focus:ring-orange-600 focus:outline-none min-h-[120px] shadow-inner"
            />
          </div>
          
          <div>
             <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Visual Asset</label>
             {!selectedImage ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-800 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-orange-600 hover:bg-slate-900/50 transition-all group"
                >
                   <Upload size={24} className="text-slate-600 group-hover:text-orange-600 mb-2" />
                   <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Attach Media</span>
                </div>
             ) : (
                <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
                   <img src={selectedImage} alt="Selected" className="w-full h-48 object-cover opacity-60 grayscale" />
                   <button 
                     onClick={handleRemoveImage}
                     className="absolute top-2 right-2 p-1.5 bg-black/80 hover:bg-red-900 rounded-full text-white transition-colors"
                   >
                     <X size={16} />
                   </button>
                </div>
             )}
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          </div>

          <button 
            onClick={handleGenerate}
            disabled={isGenerating || (!topic && !selectedImage)}
            className="w-full py-4 bg-orange-700 hover:bg-orange-600 text-white font-black uppercase tracking-widest rounded-lg transition-all disabled:opacity-30 flex justify-center items-center gap-2 shadow-lg shadow-orange-950/20"
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : 'Execute Drafting'}
          </button>

          {generatedDraft && (
            <div className="mt-8 bg-black/40 rounded-lg p-5 border border-orange-900/50 animate-fade-in">
              <p className="text-slate-300 text-sm font-medium whitespace-pre-wrap mb-6">{generatedDraft}</p>
              <div className="flex gap-4">
                <button onClick={() => setGeneratedDraft('')} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded text-xs font-black uppercase tracking-widest text-white">Discard</button>
                <button onClick={handleSchedule} disabled={isSubmitting} className="flex-1 py-3 bg-orange-700 hover:bg-orange-600 rounded text-xs font-black uppercase tracking-widest text-white flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Deploy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
         <div className="bg-slate-900/30 p-6 rounded-xl border border-slate-800 shadow-xl">
           <h3 className="text-sm font-black text-slate-400 mb-6 flex items-center gap-2 uppercase tracking-widest">
             <Calendar className="text-orange-600" /> Operational History
           </h3>
           <div className="space-y-4">
             {posts.map(post => (
               <div key={post.id} className="bg-slate-950/50 p-4 rounded-lg border border-slate-900 flex gap-4">
                 <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded ${post.status === 'Published' ? 'bg-orange-900/30 text-orange-500' : 'bg-slate-800 text-slate-500'}`}>
                        {post.status}
                      </span>
                      <span className="text-[10px] font-bold text-slate-600">{post.scheduledFor}</span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium line-clamp-2">{post.content}</p>
                 </div>
               </div>
             ))}
           </div>
         </div>
      </div>
    </div>
  );
};

export default SocialPoster;
