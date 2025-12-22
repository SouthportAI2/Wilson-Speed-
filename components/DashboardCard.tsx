
import React from 'react';
import { LucideIcon } from 'lucide-react';

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

export default DashboardCard;
