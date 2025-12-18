
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
    <div className="min-h-screen bg-[#0a0f18] text-slate-100 flex flex-col selection:bg-orange-500/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-800 p-4 shadow-2xl">
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
              <h1 className="text-xl font-black tracking-tighter bg-gradient-to-r from-slate-200 via-slate-400 to-slate-500 bg-clip-text text-transparent group-hover:from-orange-400 group-hover:to-orange-600 transition-all uppercase">
                Eric Wilsons AI
              </h1>
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={10} className="text-orange-600" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Master Control Core</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-sm font-black text-slate-200 uppercase tracking-tighter">Eric Wilson</span>
                <div className="flex items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                  </span>
                  <span className="text-[10px] font-bold text-orange-500 uppercase tracking-tighter">System Hot</span>
                </div>
             </div>
             <button 
               onClick={() => onNavigate(ViewState.SETTINGS)}
               className={`p-2.5 rounded-xl transition-all duration-300 ${currentView === ViewState.SETTINGS ? 'bg-orange-600 shadow-lg shadow-orange-900/40 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/50'}`}
             >
                <Settings size={20} />
             </button>
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 via-slate-800 to-black flex items-center justify-center shadow-lg border border-slate-700 ring-2 ring-slate-900">
                <User size={20} className="text-slate-300" />
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        <div className="animate-fade-in">
          <div className="mb-8">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-3 uppercase">
              {title}
            </h2>
            <div className="h-1.5 w-24 bg-gradient-to-r from-orange-600 to-red-800 rounded-full"></div>
          </div>
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {children}
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-slate-800/50 p-8 mt-12 bg-black/40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-xs font-bold uppercase tracking-widest">
          <p>© {new Date().getFullYear()} ERIC WILSONS PERSON AI INFRASTRUCTURE</p>
          <div className="flex gap-6">
            <span className="hover:text-orange-500 cursor-pointer transition-colors">Documentation</span>
            <span className="hover:text-orange-500 cursor-pointer transition-colors">Support</span>
            <span className="text-slate-700">V1.0.4-RUGGED</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

