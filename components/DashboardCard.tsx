import React from 'react';
import { Mail, Mic, Share2, Star, LucideIcon, ArrowRight, Zap, Shield, Activity } from 'lucide-react';
import { ViewState } from '../types.ts';

interface DashboardCardProps {
  title: string;
  description: string[];
  icon: LucideIcon;
  onClick: () => void;
  color: string;
  glow: string;
  index: number;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, description, icon: Icon, onClick, color, glow, index }) => {
  return (
    <button 
      onClick={onClick}
      className={`group relative flex flex-col items-start text-left bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 border border-slate-800/50 shadow-2xl hover:border-blue-500/50 transition-all duration-700 hover:-translate-y-2 overflow-hidden w-full h-full ring-1 ring-white/5 animate-fade-in`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className={`absolute -top-12 -right-12 w-64 h-64 bg-gradient-to-br ${glow} opacity-0 group-hover:opacity-20 blur-[80px] transition-opacity duration-700 rounded-full`} />
      
      <div className="flex justify-between w-full mb-8">
        <div className={`p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ${color}`}>
          <Icon size={32} />
        </div>
        <div className="text-[10px] font-mono text-slate-600 group-hover:text-blue-500/50 transition-colors uppercase tracking-widest">
          NODE_{index + 1} // ACTIVE
        </div>
      </div>

      <h3 className="text-2xl font-black text-white mb-4 tracking-tight group-hover:text-blue-400 transition-colors duration-300">
        {title}
      </h3>

      <ul className="space-y-3 mb-8 flex-1">
        {description.map((item, i) => (
          <li key={i} className="flex items-start text-sm text-slate-400 font-medium leading-relaxed">
            <span className="mr-3 mt-2 w-1 h-1 rounded-full flex-shrink-0 bg-blue-500/50 group-hover:bg-blue-400 transition-colors duration-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto w-full pt-6 border-t border-slate-800 flex justify-between items-center text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 group-hover:text-blue-400 transition-all duration-300">
        <span className="flex items-center gap-2">
          <Zap size={10} className="animate-pulse" />
          Initialize Node
        </span>
        <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform duration-300" />
      </div>
    </button>
  );
};

interface DashboardProps {
  onNavigate: (view: ViewState) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const cards = [
    {
      id: ViewState.EMAILS,
      title: 'Email Intake',
      icon: Mail,
      color: 'text-blue-400',
      glow: 'from-blue-600 to-cyan-400',
      description: [
        'Real-time automated inbox monitoring',
        'AI triage for mission-critical requests',
        'Smart drafting and semantic summaries'
      ]
    },
    {
      id: ViewState.AUDIO_LOGS,
      title: 'Audio Logger',
      icon: Mic,
      color: 'text-purple-400',
      glow: 'from-purple-600 to-pink-400',
      description: [
        'Multi-track voice log infrastructure',
        'High-fidelity transcript processing',
        'Secure asset data mapping'
      ]
    },
    {
      id: ViewState.SOCIAL_MEDIA,
      title: 'Social Poster',
      icon: Share2,
      color: 'text-orange-400',
      glow: 'from-orange-600 to-yellow-400',
      description: [
        'Automated content distribution network',
        'Generative copy engagement logic',
        'Real-time performance metrics'
      ]
    },
    {
      id: ViewState.REVIEWS,
      title: 'Review Booster',
      icon: Star,
      color: 'text-emerald-400',
      glow: 'from-emerald-600 to-teal-400',
      description: [
        'Dynamic client feedback collection',
        'Direct business portal integration',
        'Automated sentiment reporting'
      ]
    }
  ];

  return (
    <div className="space-y-16 py-8 max-w-6xl mx-auto">
      <header className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-2 animate-fade-in">
          <Shield size={12} /> System Status: Online
        </div>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tighter leading-[1.1] animate-fade-in">
          Welcome to Eric Wilsons <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">
            Person AI infrastructure.
          </span>
        </h1>
        <p className="text-slate-500 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '100ms' }}>
          Your centralized command core for high-speed automated business intelligence and distributed infrastructure management.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10 px-4">
        {cards.map((card, idx) => (
          <DashboardCard
            key={card.id}
            title={card.title}
            description={card.description}
            icon={card.icon}
            color={card.color}
            glow={card.glow}
            index={idx}
            onClick={() => onNavigate(card.id)}
          />
        ))}
      </div>

      <footer className="bg-slate-900/40 border border-slate-800/60 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center gap-10 shadow-2xl backdrop-blur-md ring-1 ring-white/5 animate-fade-in mx-4" style={{ animationDelay: '500ms' }}>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <Activity size={18} className="text-emerald-500 animate-pulse" />
            <h4 className="text-sm font-black text-white uppercase tracking-[0.2em]">Neural Mesh Connectivity</h4>
          </div>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">All active nodes are currently synchronized with the Gemini 3 Core. Encryption active and verified.</p>
        </div>
        <div className="flex gap-6 shrink-0 w-full md:w-auto">
          <div className="flex-1 md:w-36 text-center p-5 bg-slate-950/60 rounded-2xl border border-slate-800 ring-1 ring-white/5 shadow-inner">
            <div className="text-2xl font-black text-white">42ms</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Latency</div>
          </div>
          <div className="flex-1 md:w-36 text-center p-5 bg-slate-950/60 rounded-2xl border border-slate-800 ring-1 ring-white/5 shadow-inner">
            <div className="text-2xl font-black text-emerald-500">Active</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Gateway</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
