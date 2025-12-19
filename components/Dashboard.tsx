import React from 'react';
import { Mail, Mic, Share2, Star, LucideIcon, ArrowRight } from 'lucide-react';
import { ViewState } from '../types.ts';

interface DashboardCardProps {
  title: string;
  description: string[];
  icon: LucideIcon;
  onClick: () => void;
  color: string;
  glow: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, description, icon: Icon, onClick, color, glow }) => {
  return (
    <button 
      onClick={onClick}
      className="group relative flex flex-col items-start text-left bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-10 border border-slate-800/50 shadow-2xl hover:border-blue-500/40 transition-all duration-500 hover:-translate-y-2 overflow-hidden w-full h-full ring-1 ring-white/5"
    >
      <div className={`absolute -top-12 -right-12 w-64 h-64 bg-gradient-to-br ${glow} opacity-0 group-hover:opacity-20 blur-[80px] transition-opacity duration-700 rounded-full`} />
      
      <div className={`p-5 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner mb-10 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ${color}`}>
        <Icon size={40} />
      </div>

      <h3 className="text-3xl font-black text-white mb-6 tracking-tight group-hover:text-blue-400 transition-colors duration-300">
        {title}
      </h3>

      <ul className="space-y-4 mb-10 flex-1">
        {description.map((item, index) => (
          <li key={index} className="flex items-start text-base text-slate-400 font-medium leading-snug">
            <span className="mr-3 mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-blue-500/50 group-hover:bg-blue-400 transition-colors duration-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto w-full pt-8 border-t border-slate-800 flex justify-between items-center text-[11px] font-black uppercase tracking-[0.25em] text-slate-500 group-hover:text-blue-400 transition-all duration-300">
        <span>Initialize Interface</span>
        <ArrowRight size={20} className="group-hover:translate-x-3 transition-transform duration-300" />
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
        'Real-time Yahoo email sync',
        'AI-powered urgency classification',
        'Customer request summarization'
      ]
    },
    {
      id: ViewState.AUDIO_LOGS,
      title: 'Audio Logger',
      icon: Mic,
      color: 'text-purple-400',
      glow: 'from-purple-600 to-pink-400',
      description: [
        'Voice transcript recording',
        'Continuous shop floor monitoring',
        'Automated vehicle data extraction'
      ]
    },
    {
      id: ViewState.SOCIAL_MEDIA,
      title: 'Social Poster',
      icon: Share2,
      color: 'text-orange-400',
      glow: 'from-orange-600 to-yellow-400',
      description: [
        'Automated multi-platform content',
        'Gemini-assisted copywriting',
        'Engagement performance tracking'
      ]
    },
    {
      id: ViewState.REVIEWS,
      title: 'Review Booster',
      icon: Star,
      color: 'text-emerald-400',
      glow: 'from-emerald-600 to-teal-400',
      description: [
        'Personalized request generation',
        'Direct Google Business integration',
        'Rating acceleration dashboard'
      ]
    }
  ];

  return (
    <div className="space-y-16 py-8">
      <header className="max-w-4xl space-y-6">
        <h1 className="text-6xl lg:text-8xl font-[900] text-white tracking-tighter leading-[0.9] mb-4">
          Welcome to <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">Eric Wilsons</span> <br />
          Person AI infrastructure.
        </h1>
        <p className="text-slate-400 text-2xl font-medium max-w-2xl leading-relaxed">
          Centralized command core for automated intelligence, secure communications, and business growth engines.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {cards.map((card) => (
          <DashboardCard
            key={card.id}
            title={card.title}
            description={card.description}
            icon={card.icon}
            color={card.color}
            glow={card.glow}
            onClick={() => onNavigate(card.id)}
          />
        ))}
      </div>

      <footer className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center gap-10 shadow-2xl backdrop-blur-sm ring-1 ring-white/5">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            <h4 className="text-xl font-bold text-white uppercase tracking-wider">Infrastructure Readiness</h4>
          </div>
          <p className="text-slate-400 text-lg">All processing nodes are synchronized with the Gemini global mesh. Real-time updates are streaming through the data layer.</p>
        </div>
        <div className="flex gap-6 shrink-0 w-full md:w-auto">
          <div className="flex-1 md:w-40 text-center px-8 py-6 bg-slate-950/50 rounded-2xl border border-slate-800 shadow-inner">
            <div className="text-3xl font-black text-white">99.9%</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Uptime</div>
          </div>
          <div className="flex-1 md:w-40 text-center px-8 py-6 bg-slate-950/50 rounded-2xl border border-slate-800 shadow-inner">
            <div className="text-3xl font-black text-white">12.4k</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Ops/mo</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
