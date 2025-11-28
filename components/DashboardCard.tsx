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
      className="group relative flex flex-col items-start text-left bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl hover:shadow-2xl hover:border-slate-600 transition-all duration-300 hover:-translate-y-1 overflow-hidden w-full h-full"
    >
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${color} opacity-5 rounded-bl-full transition-opacity group-hover:opacity-10`} />
      
      <div className={`p-4 rounded-xl bg-slate-900/50 border border-slate-700/50 mb-6 ${color.replace('from-', 'text-').split(' ')[0]}`}>
        <Icon size={32} />
      </div>

      <h3 className="text-xl font-bold text-white mb-4 group-hover:text-blue-400 transition-colors">
        {title}
      </h3>

      <ul className="space-y-2 mb-4 flex-1">
        {description.slice(0, 3).map((item, index) => (
          <li key={index} className="flex items-start text-sm text-slate-400">
            <span className="mr-2 mt-1.5 w-1 h-1 bg-slate-500 rounded-full flex-shrink-0" />
            <span className="line-clamp-2">{item}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto w-full pt-4 border-t border-slate-700/50 flex justify-between items-center text-sm font-medium text-slate-500 group-hover:text-white transition-colors">
        <span>Open Module</span>
        <span className="text-lg">→</span>
      </div>
    </button>
  );
};

export default DashboardCard;