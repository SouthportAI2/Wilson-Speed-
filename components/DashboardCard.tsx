import React from 'react';
import { Mail, Mic, Share2, Star, ArrowRight, Zap, Shield, Activity } from 'lucide-react';
import { ViewState } from '../types.ts';
import DashboardCard from './DashboardCard.tsx';

interface DashboardProps {
  onNavigate: (view: ViewState) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const cards = [
    {
      id: ViewState.EMAILS,
      title: 'Email Intake',
      icon: Mail,
      color: 'from-blue-600 to-cyan-400',
      description: [
        'Automated Yahoo inbox triage',
        'AI semantic classification',
        'Smart summary distribution'
      ]
    },
    {
      id: ViewState.AUDIO_LOGS,
      title: 'Audio Logger',
      icon: Mic,
      color: 'from-purple-600 to-pink-400',
      description: [
        'Shop floor voice capture',
        'Secure transcript archival',
        'Asset data mapping nodes'
      ]
    },
    {
      id: ViewState.SOCIAL_MEDIA,
      title: 'Social Poster',
      icon: Share2,
      color: 'from-orange-600 to-yellow-400',
      description: [
        'Distributed content engine',
        'Gemini engagement modeling',
        'Performance metrics sync'
      ]
    },
    {
      id: ViewState.REVIEWS,
      title: 'Review Booster',
      icon: Star,
      color: 'from-emerald-600 to-teal-400',
      description: [
        'Automated feedback outreach',
        'Direct business link routing',
        'Sentiment analytics hub'
      ]
    }
  ];

  return (
    <div className="space-y-12 py-8 max-w-6xl mx-auto">
      <header className="space-y-6 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-2">
          <Shield size={12} /> Infrastructure Gateway
        </div>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tighter leading-tight">
          Welcome to Eric Wilsons Person AI infrastructure.
        </h1>
        <p className="text-slate-500 text-lg md:text-xl font-medium max-w-2xl leading-relaxed">
          Your centralized command core for high-speed business automation and distributed intelligence management.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {cards.map((card, idx) => (
          <DashboardCard
            key={card.id}
            title={card.title}
            description={card.description}
            icon={card.icon}
            color={card.color}
            onClick={() => onNavigate(card.id)}
          />
        ))}
      </div>

      <footer className="bg-slate-900/40 border border-slate-800/60 rounded-[2rem] p-8 flex flex-col md:flex-row items-center gap-8 shadow-2xl backdrop-blur-md ring-1 ring-white/5 animate-fade-in" style={{ animationDelay: '500ms' }}>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Activity size={18} className="text-emerald-500 animate-pulse" />
            <h4 className="text-sm font-black text-white uppercase tracking-[0.2em]">Infrastructure Mesh Connectivity</h4>
          </div>
          <p className="text-slate-500 text-sm font-medium">Nodes synced with Gemini 3 Core. All security protocols verified active.</p>
        </div>
        <div className="flex gap-4 shrink-0 w-full md:w-auto">
          <div className="flex-1 md:w-32 text-center p-4 bg-slate-950/60 rounded-xl border border-slate-800 shadow-inner">
            <div className="text-xl font-black text-white">42ms</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Latency</div>
          </div>
          <div className="flex-1 md:w-32 text-center p-4 bg-slate-950/60 rounded-xl border border-slate-800 shadow-inner">
            <div className="text-xl font-black text-emerald-500">Active</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Status</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
