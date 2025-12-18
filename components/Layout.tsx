
import React, { ReactNode } from 'react';
import { ViewState } from '../types';
import { ArrowLeft, Settings, User, ShieldCheck, Zap } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  title: string;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate, title }) => {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col">
      {/* Heavy Duty Header */}
      <header className="sticky top-0 z-50 bg-[#020617] border-b-4 border-slate-900 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            {currentView !== ViewState.DASHBOARD && (
              <button 
                onClick={() => onNavigate(ViewState.DASHBOARD)}
                className="p-3 bg-slate-900 border-2 border-slate-800 rounded-lg hover:border-orange-600 text-slate-400 hover:text-white transition-all"
              >
                <ArrowLeft size={24} />
              </button>
            )}
            <div className="cursor-pointer group" onClick={() => onNavigate(ViewState.DASHBOARD)}>
              <h1 className="text-2xl font-[900] tracking-tighter text-white uppercase flex items-center gap-2">
                <Zap className="text-orange-600 fill-orange-600" size={24} />
                ERIC WILSONS AI
              </h1>
              <div className="flex items-center gap-2">
                <div className="h-1 w-8 bg-orange-600"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Infrastructure Core</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="hidden md:flex flex-col items-end px-4 py-1 border-r-2 border-slate-800">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Operator</span>
                <span className="text-sm font-black text-white uppercase tracking-tighter">E. WILSON</span>
             </div>
             <button 
               onClick={() => onNavigate(ViewState.SETTINGS)}
               className={`p-3 border-2 transition-all ${currentView === ViewState.SETTINGS ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-orange-600 hover:text-white'}`}
             >
                <Settings size={20} />
             </button>
             <div className="w-12 h-12 bg-slate-800 border-2 border-slate-700 flex items-center justify-center shadow-lg">
                <User size={24} className="text-slate-400" />
             </div>
          </div>
        </div>
      </header>

      {/* Rugged Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        <div className="animate-fade-in">
          <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-4xl md:text-5xl font-[900] tracking-tighter text-white uppercase">
                {title}
              </h2>
              <div className="mt-2 h-2 w-32 bg-orange-600"></div>
            </div>
            <div className="flex items-center gap-3 bg-slate-900/50 border-l-4 border-orange-600 px-4 py-2">
               <span className="relative flex h-3 w-3">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-600"></span>
               </span>
               <span className="text-[10px] font-black text-white uppercase tracking-widest">System Armed</span>
            </div>
          </div>
          <div className="animate-fade-in-up">
            {children}
          </div>
        </div>
      </main>
      
      {/* Industrial Footer */}
      <footer className="border-t-4 border-slate-900 p-8 mt-20 bg-[#010204]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em]">
            © {new Date().getFullYear()} ERIC WILSONS PERSON AI INFRASTRUCTURE // V.1.0.6-RUGGED
          </p>
          <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest">
            <span className="text-slate-500 hover:text-orange-600 cursor-pointer transition-colors underline decoration-2 underline-offset-4">Intelligence Protocol</span>
            <span className="text-slate-500 hover:text-orange-600 cursor-pointer transition-colors underline decoration-2 underline-offset-4">Encrypted Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
