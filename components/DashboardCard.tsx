import React from 'react';
import { Mail, Mic, Share2, Star } from 'lucide-react';
import DashboardCard from './DashboardCard.tsx';
import { ViewState } from '../types.ts';

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
