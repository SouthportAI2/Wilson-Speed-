import React from 'react';
import { Mail, Mic, Share2, Star, Shield, Zap, ArrowRight } from 'lucide-react';
import { ViewState } from '../types';

interface BoxProps {
  title: string;
  description: string;
  icon: React.ElementType;
  onClick: () => void;
  color: string;
}

const Box: React.FC<BoxProps> = ({ title, description, icon: Icon, onClick, color }) => (
  <button 
    onClick={onClick}
    className="group relative flex flex-col items-start p-8 bg-slate-900/40 border border-slate-800 rounded-[2.5rem] hover:border-blue-500/50 hover:bg-slate-900/60 transition-all duration-500 text-left overflow-hidden shadow-2xl backdrop-blur-md h-full"
  >
    <div className={`absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-10 blur-3xl transition-opacity`} />
    <div className={`p-4 rounded-2xl bg-slate-950 border border-slate-800 mb-6 group-hover:scale-110 transition-transform ${color.replace('from-', 'text-').split(' ')[0]}`}>
      <Icon size={32} />
    </div>
    <h3 className="text-2xl font-black text-white mb-2 tracking-tight group-hover:text-blue-400 transition-colors">{title}</h3>
    <p className="text-slate-400 text-sm font-medium leading-relaxed">{description}</p>
    <div className="mt-auto pt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600 group-hover:text-blue-400 transition-colors">
      <Zap size={10} /> Access Node <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
    </div>
  </button>
);

interface DashboardProps {
  onNavigate: (view: ViewState) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-6xl mx-auto space-y-16 py-8">
      <header className="space-y-4 animate-fade-in text-left">
        <div className="flex items-center gap-2 text-blue-500 text-[10px] font-black uppercase tracking-[0.3em]">
          <Shield size={14} /> Core System / Active
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-[1.1]">
          Welcome to Eric Wilsons <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 italic">
            Person AI infrastructure.
          </span>
        </h1>
        <p className="text-slate-500 text-xl font-medium max-w-2xl leading-relaxed">
          Your command core for business automation, secure audio logs, and distributed intelligence nodes.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Box 
          title="Email Intake" 
          description="Automated triage and AI summarization of inbound business communications." 
          icon={Mail} 
          onClick={() => onNavigate(ViewState.EMAILS)}
          color="from-blue-600 to-cyan-400"
        />
        <Box 
          title="Audio Logger" 
          description="Secure voice recording and semantic transcript archival for shop operations." 
          icon={Mic} 
          onClick={() => onNavigate(ViewState.AUDIO_LOGS)}
          color="from-purple-600 to-pink-400"
        />
        <Box 
          title="Social Poster" 
          description="Generative engagement copy and content distribution network." 
          icon={Share2} 
          onClick={() => onNavigate(ViewState.SOCIAL_MEDIA)}
          color="from-orange-600 to-yellow-400"
        />
        <Box 
          title="Review Booster" 
          description="Personalized client outreach to maximize Google Business visibility." 
          icon={Star} 
          onClick={() => onNavigate(ViewState.REVIEWS)}
          color="from-emerald-600 to-teal-400"
        />
      </div>
    </div>
  );
};

export default Dashboard;
