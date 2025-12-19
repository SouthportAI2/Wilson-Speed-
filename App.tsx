import React from 'react';
import { Mail, Mic, Share2, Star, LucideIcon } from 'lucide-react';
import { ViewState } from '../types.ts';

interface DashboardCardProps {
  title: string;
  description: string[];
  icon: LucideIcon;
  onClick: () => void;
  color: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, description, icon: Icon, onClick, color }) => {
  return (
    <button 
      onClick={onClick}
      className="group relative flex flex-col items-start text-left bg-slate-800/80 backdrop-blur-sm rounded-[2rem] p-8 border border-slate-700 shadow-2xl hover:shadow-blue-500/10 hover:border-blue-500/30 transition-all duration-500 hover:-translate-y-2 overflow-hidden w-full h-full"
    >
      <div className={`absolute -top-10 -right-10 w-48 h-48 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-10 blur-3xl transition-opacity duration-700 rounded-full`} />
      
      <div className={`p-5 rounded-2xl bg-slate-900 border border-slate-700 shadow-inner mb-8 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ${color.replace('from-', 'text-').split(' ')[0]}`}>
        <Icon size={36} />
      </div>

      <h3 className="text-2xl font-black text-white mb-5 tracking-tighter group-hover:text-blue-400 transition-colors duration-300">
        {title}
      </h3>

      <ul className="space-y-3 mb-8 flex-1">
        {description.slice(0, 3).map((item, index) => (
          <li key={index} className="flex items-start text-sm text-slate-400 font-medium leading-tight">
            <span className={`mr-3 mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-slate-600 group-hover:bg-blue-500 transition-colors duration-500`} />
            <span className="line-clamp-2">{item}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto w-full pt-6 border-t border-slate-700/50 flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-blue-400 transition-all duration-300">
        <span>Initialize Interface</span>
        <span className="text-xl group-hover:translate-x-2 transition-transform duration-300">→</span>
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
      color: 'from-blue-600 to-cyan-500',
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
      color: 'from-purple-600 to-pink-500',
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
      color: 'from-orange-600 to-yellow-500',
      description: [
        'Automated Facebook/Instagram content',
        'Gemini-assisted copywriting',
        'Engagement performance tracking'
      ]
    },
    {
      id: ViewState.REVIEWS,
      title: 'Review Booster',
      icon: Star,
      color: 'from-emerald-600 to-teal-500',
      description: [
        'Personalized review request generation',
        'Direct Google Business integration',
        'Rating acceleration dashboard'
      ]
    }
  ];

  return (
    <div className="space-y-12">
      <header className="max-w-4xl">
        <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tighter leading-none mb-4">
          Welcome to <span className="text-blue-500">Eric Wilsons</span> <br />
          Person AI infrastructure.
        </h1>
        <p className="text-slate-400 text-xl font-medium max-w-2xl">
          Centralized command core for automated intelligence, secure communications, and business growth engines.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {cards.map((card) => (
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

      <div className="bg-slate-900/50 border border-slate-800 rounded-[2rem] p-8 flex flex-col md:flex-row items-center gap-8 shadow-2xl">
        <div className="flex-1">
          <h4 className="text-xl font-bold text-white mb-2">Infrastructure Readiness</h4>
          <p className="text-slate-400 text-sm">All processing nodes are synchronized with the Gemini global mesh. Real-time updates are streaming through the data layer.</p>
        </div>
        <div className="flex gap-4">
          <div className="text-center px-6 py-4 bg-slate-800 rounded-2xl border border-slate-700">
            <div className="text-2xl font-black text-white">99.9%</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Uptime</div>
          </div>
          <div className="text-center px-6 py-4 bg-slate-800 rounded-2xl border border-slate-700">
            <div className="text-2xl font-black text-white">12.4k</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Ops/mo</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
