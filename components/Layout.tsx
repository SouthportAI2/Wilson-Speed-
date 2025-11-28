import React, { ReactNode } from 'react';
import { ViewState } from '../types';
import { ArrowLeft, Settings, User } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  title: string;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate, title }) => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {currentView !== ViewState.DASHBOARD && (
              <button 
                onClick={() => onNavigate(ViewState.DASHBOARD)}
                className="p-2 rounded-full hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
              >
                <ArrowLeft size={24} />
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Southport AI
              </h1>
              <p className="text-xs text-slate-400">Eric Wilson's Infrastructure</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-sm font-medium">Eric Wilson</span>
                <span className="text-xs text-green-400">System Online</span>
             </div>
             <button 
               onClick={() => onNavigate(ViewState.SETTINGS)}
               className={`p-2 rounded-full transition ${currentView === ViewState.SETTINGS ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'}`}
             >
                <Settings size={20} />
             </button>
             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <User size={20} className="text-white" />
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        <div className="animate-fade-in">
          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">{title}</h2>
            <div className="h-1 w-20 bg-blue-500 rounded-full"></div>
          </div>
          {children}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-slate-800 p-6 mt-12 text-center text-slate-500 text-sm">
        <p>© {new Date().getFullYear()} Southport AI Solutions. Powered by Gemini.</p>
      </footer>
    </div>
  );
};

export default Layout;