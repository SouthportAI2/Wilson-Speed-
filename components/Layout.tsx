import React from 'react';
import { 
  LayoutDashboard, 
  Mail, 
  Mic, 
  Share2, 
  Star, 
  Settings as SettingsIcon,
  Shield,
  Activity
} from 'lucide-react';
import { ViewState } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate }) => {
  const navItems = [
    { id: ViewState.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: ViewState.EMAILS, label: 'Email Intake', icon: Mail },
    { id: ViewState.AUDIO_LOGS, label: 'Audio Logger', icon: Mic },
    { id: ViewState.SOCIAL_MEDIA, label: 'Social Poster', icon: Share2 },
    { id: ViewState.REVIEWS, label: 'Review Booster', icon: Star },
    { id: ViewState.SETTINGS, label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="flex min-h-screen bg-[#020617] text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-[#020617]/50 backdrop-blur-xl hidden lg:flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Shield size={20} className="text-white" />
            </div>
            <span className="font-black tracking-tighter text-xl uppercase italic">Southport AI</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                currentView === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span className="font-semibold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-800">
          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
            <div className="flex items-center gap-2 mb-2 text-blue-400">
              <Activity size={14} className="animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest">System Status</span>
            </div>
            <div className="text-[10px] text-slate-500 font-medium">
              Core: Online<br />
              Nodes: Active (4/4)<br />
              Latency: 42ms
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden">
        <header className="h-16 border-b border-slate-800 bg-[#020617]/50 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between px-8">
          <div className="text-sm font-medium text-slate-400">
            Infrastructure Root / <span className="text-white capitalize">{currentView.toLowerCase().replace('_', ' ')}</span>
          </div>
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold">EW</div>
        </header>
        
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
