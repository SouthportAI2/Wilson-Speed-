
import React from 'react';
import { LucideIcon, ChevronRight } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  description: string[];
  icon: LucideIcon;
  onClick: () => void;
  color: string;
  iconColor: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, description, icon: Icon, onClick, color, iconColor }) => {
  return (
    <button 
      onClick={onClick}
      className={`group relative flex flex-col items-start text-left bg-slate-900/80 border-4 ${color} p-8 transition-all hover:bg-slate-900 hover:border-orange-600 w-full h-full min-h-[350px]`}
    >
      <div className={`p-4 bg-black/50 border-2 border-slate-800 mb-8 group-hover:border-orange-600 transition-all ${iconColor}`}>
        <Icon size={32} />
      </div>

      <h3 className="text-2xl font-[900] text-white mb-6 uppercase tracking-tighter">
        {title}
      </h3>

      <div className="space-y-4 mb-8 flex-1">
        {description.map((item, index) => (
          <div key={index} className="flex items-start text-xs text-slate-400 font-black uppercase tracking-widest leading-tight">
            <span className="mr-3 text-orange-600 font-black">//</span>
            <span>{item}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto w-full pt-4 border-t-2 border-slate-800 flex justify-between items-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 group-hover:text-orange-600 transition-colors">
        <span>Engage Interface</span>
        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
      </div>
    </button>
  );
};

export default DashboardCard;
