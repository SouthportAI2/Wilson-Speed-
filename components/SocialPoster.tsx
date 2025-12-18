
import React, { useState, useRef } from 'react';
import { Facebook, Instagram, Calendar, CheckCircle, PenTool, Image as ImageIcon, Upload, X, Send, Loader2 } from 'lucide-react';
import { generateSocialPost } from '../services/gemini';
import { SocialPost } from '../types';

const MOCK_HISTORY: SocialPost[] = [
  {
    id: '1',
    platform: 'Facebook',
    content: "Big transformation today! Kept this 1967 Mustang purring like a kitten. 🚗💨 Swipe to see the engine rebuild progress. #ClassicCars #MechanicLife",
    status: 'Published',
    scheduledFor: 'Today, 9:00 AM',
    engagement: '24 Likes • 3 Comments',
    imageUrl: 'https://images.unsplash.com/photo-1532581140115-3e355d1ed1de?auto=format&fit=crop&q=80&w=300'
  },
  {
    id: '2',
    platform: 'Instagram',
    content: "Winter is coming! ❄️ Don't forget to check your tire tread and battery health. Stop by Southport AI for a quick check-up!",
    status: 'Scheduled',
    scheduledFor: 'Tomorrow, 10:00 AM'
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
      platform: 'Facebook', // Default for demo
      content: generatedDraft,
      status: 'Scheduled',
      scheduledFor: 'Tomorrow, 9:00 AM',
      imageUrl: selectedImage || undefined
    };

    try {
      // Retrieve config
      const storedConfig = localStorage.getItem('southport_config');
      const config = storedConfig ? JSON.parse(storedConfig) : {};
      const webhookUrl = config.n8nWebhookSocial;

      if (webhookUrl) {
        // Send to n8n/Backend
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform: newPost.platform,
            content: newPost.content,
            scheduledFor: newPost.scheduledFor,
            image: selectedImage // Base64 string
          })
        });

        if (!response.ok) {
          throw new Error('Failed to send to webhook');
        }
      } else {
        // Fallback simulation
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Update UI
      setPosts([newPost, ...posts]);
      setGeneratedDraft('');
      setTopic('');
      setSelectedImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

    } catch (error) {
      console.error("Social schedule error:", error);
      alert("Failed to schedule post. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Creator Panel */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <PenTool className="text-purple-400" /> Content Creator
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">What happened in the shop today?</label>
            <textarea 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Replaced a timing belt on a Honda Civic..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none min-h-[100px]"
            />
          </div>
          
          <div>
             <label className="block text-sm text-slate-400 mb-2">Add Photo (Optional)</label>
             {!selectedImage ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-600 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 hover:bg-slate-700/30 transition-all group"
                >
                   <div className="p-3 bg-slate-800 rounded-full mb-3 group-hover:scale-110 transition-transform">
                      <Upload size={24} className="text-slate-400 group-hover:text-purple-400" />
                   </div>
                   <span className="text-sm text-slate-400 group-hover:text-slate-300">Click to upload photo</span>
                </div>
             ) : (
                <div className="relative rounded-lg overflow-hidden border border-slate-600 bg-slate-900">
                   <img src={selectedImage} alt="Selected" className="w-full h-48 object-cover opacity-80" />
                   <button 
                     onClick={handleRemoveImage}
                     className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-red-600/80 rounded-full text-white transition-colors backdrop-blur-sm"
                   >
                     <X size={16} />
                   </button>
                   <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white backdrop-blur-sm flex items-center gap-1">
                     <ImageIcon size={12} /> Photo Added
                   </div>
                </div>
             )}
             <input 
               type="file" 
               ref={fileInputRef}
               className="hidden" 
               accept="image/*"
               onChange={handleImageUpload}
             />
          </div>

          <button 
            onClick={handleGenerate}
            disabled={isGenerating || (!topic && !selectedImage)}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold rounded-lg transition-all disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Creating Magic...
              </>
            ) : (
              'Generate Engaging Post'
            )}
          </button>

          {generatedDraft && (
            <div className="mt-6 bg-slate-900 rounded-lg p-4 border border-purple-500/30 animate-fade-in">
              <div className="flex gap-2 mb-3">
                 <button className="px-3 py-1 bg-blue-600 text-xs rounded text-white flex items-center gap-1"><Facebook size={12}/> Facebook</button>
                 <button className="px-3 py-1 bg-pink-600 text-xs rounded text-white flex items-center gap-1"><Instagram size={12}/> Instagram</button>
              </div>
              
              <div className="flex gap-3 mb-3">
                {selectedImage && (
                  <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-slate-700">
                    <img src={selectedImage} alt="Draft" className="w-full h-full object-cover" />
                  </div>
                )}
                <p className="text-slate-300 text-sm whitespace-pre-wrap flex-1">{generatedDraft}</p>
              </div>
              
              <div className="mt-4 flex gap-3">
                <button 
                  onClick={() => setGeneratedDraft('')} // Simple edit/cancel for now
                  className="flex-1 py-2 bg-slate-800 border border-slate-600 hover:bg-slate-700 rounded-lg text-sm text-white"
                >
                  Discard
                </button>
                <button 
                  onClick={handleSchedule}
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm text-white font-medium flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Scheduling...
                    </>
                  ) : (
                    <>
                      <Send size={16} /> Schedule Post
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History & Schedule */}
      <div className="space-y-6">
         <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
           <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
             <Calendar className="text-blue-400" /> Upcoming & Recent
           </h3>
           <div className="space-y-4">
             {posts.map(post => (
               <div key={post.id} className="bg-slate-900 p-4 rounded-lg border border-slate-800 flex gap-4">
                 <div className="shrink-0 flex flex-col items-center gap-2">
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center ${post.platform === 'Facebook' ? 'bg-blue-900 text-blue-400' : 'bg-pink-900 text-pink-400'}`}>
                     {post.platform === 'Facebook' ? <Facebook size={20} /> : <Instagram size={20} />}
                   </div>
                 </div>
                 <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${post.status === 'Published' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        {post.status}
                      </span>
                      <span className="text-xs text-slate-500">{post.scheduledFor}</span>
                    </div>
                    
                    {post.imageUrl && (
                      <div className="mb-2 w-full h-32 rounded-lg overflow-hidden border border-slate-800 relative group">
                        <img src={post.imageUrl} alt="Post Attachment" className="w-full h-full object-cover" />
                        <div className="absolute bottom-1 right-1 bg-black/50 px-1.5 rounded text-[10px] text-white backdrop-blur-md">IMG</div>
                      </div>
                    )}
                    
                    <p className="text-sm text-slate-300 line-clamp-3 mb-2 whitespace-pre-wrap">{post.content}</p>
                    
                    {post.engagement && (
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <CheckCircle size={12} /> {post.engagement}
                      </div>
                    )}
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

