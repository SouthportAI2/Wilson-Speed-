import React from 'react';
import { Zap, Database, Star, Share2, Shield, Activity } from 'lucide-react';
import { ViewState } from '../types';

interface InfraBoxProps {
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  onClick: () => void;
  status: 'ONLINE' | 'READY' | 'ACTIVE';
}

const InfraBox: React.FC<InfraBoxProps> = ({ title, subtitle, description, icon: Icon, onClick, status }) => (
  <button 
    onClick={onClick}
    className="group relative flex flex-col items-start p-8 bg-slate-900/50 backdrop-blur-sm border border-slate-800 hover:border-blue-500/50 transition-all duration-300 text-left overflow-hidden rounded-3xl shadow-xl hover:shadow-blue-500/5 active:scale-[0.98] min-h-[320px]"
  >
    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-blue-600/10 transition-colors" />

    <div className="flex justify-between w-full mb-10 relative z-10">
      <div className="p-4 bg-slate-800 rounded-2xl text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-inner group-hover:scale-110 group-hover:rotate-3">
        <Icon size={28} />
      </div>
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-800/50 rounded-full border border-slate-700/50">
          <div className={`w-1.5 h-1.5 rounded-full ${status === 'ONLINE' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-blue-500'}`} />
          <span className="text-[9px] font-bold uppercase text-slate-300 tracking-widest">{status}</span>
        </div>
      </div>
    </div>

    <div className="flex-1 relative z-10">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500/80 mb-3 block">{subtitle}</span>
      <h3 className="text-2xl font-bold text-white mb-4 tracking-tight leading-tight group-hover:text-blue-400 transition-colors">{title}</h3>
      <p className="text-slate-400 text-sm font-medium leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
        {description}
      </p>
    </div>
  </button>
);

interface DashboardProps {
  onNavigate: (view: ViewState) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-7xl mx-auto space-y-12 py-4">
      <header className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-700 text-left">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-12 gap-8">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/5 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-6">
              <Shield size={12} /> System Operational
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-[1.1]">
              Welcome to Wilson Speed's <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">AI infrastructure.</span>
            </h1>
            <p className="text-slate-400 text-lg font-medium mt-6 max-w-2xl leading-relaxed">
              Intelligent automation nodes optimized for performance, 
              secure data logging, and algorithmic distribution.
            </p>
          </div>
          
          <div className="hidden xl:flex flex-col items-end gap-2 p-8 bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-[2rem]">
            <div className="flex items-center gap-5 text-right">
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Infrastructure Status</div>
                <div className="text-sm font-bold text-emerald-400">Nodes Connected</div>
              </div>
              <Activity className="text-emerald-500 animate-pulse" size={32} />
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <InfraBox 
          title="Email Summarizer" 
          subtitle="Logic Node"
          description="Webhook-driven intake for business lead triage and automated briefing." 
          icon={Zap} 
          onClick={() => onNavigate(ViewState.EMAILS)}
          status="ONLINE"
        />
        <InfraBox 
          title="Audio Logger" 
          subtitle="Archive Node"
          description="Continuous shop-floor monitoring with secure Supabase storage and n8n processing." 
          icon={Database} 
          onClick={() => onNavigate(ViewState.AUDIO_LOGS)}
          status="ONLINE"
        />
        <InfraBox 
          title="Review Booster" 
          subtitle="Trust Core"
          description="Automated customer sentiment analysis and review growth orchestration." 
          icon={Star} 
          onClick={() => onNavigate(ViewState.REVIEWS)}
          status="READY"
        />
        <InfraBox 
          title="Social Poster" 
          subtitle="Distribution"
          description="Multichannel social engagement engine powered by n8n automation." 
          icon={Share2} 
          onClick={() => onNavigate(ViewState.SOCIAL_MEDIA)}
          status="ACTIVE"
        />
      </div>

      <div className="pt-12 flex flex-col md:flex-row items-center gap-8 border-t border-slate-800/50">
        <div className="flex -space-x-4">
          <div className="w-12 h-12 rounded-2xl border-2 border-slate-950 bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">EW</div>
          <div className="w-12 h-12 rounded-2xl border-2 border-slate-950 bg-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-xl">AI</div>
        </div>
        <div className="flex flex-col gap-1 text-left">
          <div className="text-sm text-slate-300 font-bold tracking-tight">System Core v2.1.0</div>
          <div className="text-xs text-slate-500 font-medium italic underline underline-offset-4 decoration-slate-800">Operational Heartbeat Verified</div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
