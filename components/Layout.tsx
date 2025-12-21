import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Mail, 
  Mic, 
  Share2, 
  Star, 
  Settings as SettingsIcon,
  Shield,
  Menu,
  X
} from 'lucide-react';
import { ViewState } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: ViewState.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: ViewState.EMAILS, label: 'Email Intake', icon: Mail },
    { id: ViewState.AUDIO_LOGS, label: 'Audio Logger', icon: Mic },
    { id: ViewState.SOCIAL_MEDIA, label: 'Social Poster', icon: Share2 },
    { id: ViewState.REVIEWS, label: 'Review Booster', icon: Star },
    { id: ViewState.SETTINGS, label: 'Settings', icon: SettingsIcon },
  ];

  const handleNavigate = (id: ViewState) => {
    onNavigate(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-[#020617] text-slate-100 font-sans">
      {/* Desktop Sidebar */}
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
              onClick={() => handleNavigate(item.id)}
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
            <div className="text-[10px] text-slate-500 font-medium uppercase tracking-widest text-center">
              Infrastructure Core 1.0
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950 lg:hidden flex flex-col p-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center gap-3">
              <Shield className="text-blue-600" />
              <span className="font-black text-xl uppercase italic">Southport AI</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-800 rounded-lg">
              <X size={24} />
            </button>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl text-lg font-bold transition-all ${
                  currentView === item.id ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400 bg-slate-900/50'
                }`}
              >
                <item.icon size={24} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden min-h-screen flex flex-col">
        <header className="h-16 border-b border-slate-800 bg-[#020617]/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-400 hover:text-white"
            >
              <Menu size={24} />
            </button>
            <div className="text-xs lg:text-sm font-medium text-slate-400">
              Infrastructure Root / <span className="text-white capitalize">{currentView.toLowerCase().replace('_', ' ')}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-black shadow-lg shadow-blue-900/20">EW</div>
          </div>
        </header>
        
        <div className="p-6 lg:p-10 max-w-7xl mx-auto w-full flex-1">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
