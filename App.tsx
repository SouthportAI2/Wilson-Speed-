
import React, { ReactNode } from 'react';
import { ViewState } from '../types';
import { ArrowLeft, Settings, User, ShieldCheck } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  title: string;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate, title }) => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 flex flex-col selection:bg-blue-500/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/50 p-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {currentView !== ViewState.DASHBOARD && (
              <button 
                onClick={() => onNavigate(ViewState.DASHBOARD)}
                className="p-2 rounded-full hover:bg-slate-800 transition-all text-slate-400 hover:text-white hover:scale-110 active:scale-95"
              >
                <ArrowLeft size={24} />
              </button>
            )}
            <div className="group cursor-pointer" onClick={() => onNavigate(ViewState.DASHBOARD)}>
              <h1 className="text-xl font-black tracking-tighter bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent group-hover:brightness-125 transition-all uppercase">
                Eric Wilson AI
              </h1>
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={10} className="text-blue-500" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Core Infrastructure</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-sm font-semibold text-slate-200">Eric Wilson</span>
                <div className="flex items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-[10px] font-bold text-green-400 uppercase tracking-tighter">System Active</span>
                </div>
             </div>
             <button 
               onClick={() => onNavigate(ViewState.SETTINGS)}
               className={`p-2.5 rounded-xl transition-all duration-300 ${currentView === ViewState.SETTINGS ? 'bg-blue-600 shadow-lg shadow-blue-900/40 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/50'}`}
             >
                <Settings size={20} />
             </button>
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 flex items-center justify-center shadow-lg border border-white/10 ring-2 ring-slate-900">
                <User size={20} className="text-white" />
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        <div className="animate-fade-in">
          <div className="mb-8">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-3">
              {title}
            </h2>
            <div className="h-1.5 w-24 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full"></div>
          </div>
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {children}
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-slate-800/50 p-8 mt-12 bg-slate-950/50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-xs font-medium uppercase tracking-widest">
          <p>© {new Date().getFullYear()} ERIC WILSON PERSON AI INFRASTRUCTURE</p>
          <div className="flex gap-6">
            <span className="hover:text-slate-300 cursor-pointer transition-colors">Documentation</span>
            <span className="hover:text-slate-300 cursor-pointer transition-colors">Support</span>
            <span className="text-blue-500/50">V1.0.3-Stable</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

