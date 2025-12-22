
import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Critical System Failure:", error, errorInfo);
  }

  handleReset = () => {
    localStorage.removeItem('southport_config');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/50 rounded-[2rem] p-10 shadow-2xl">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl text-red-500 font-black">!</span>
            </div>
            <h1 className="text-2xl font-black text-white mb-4 uppercase tracking-tighter italic">Infrastructure Breach</h1>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed font-medium">
              The Personal AI Core encountered a fatal error during handshake. This is usually caused by an invalid Supabase URL or Gemini configuration.
            </p>
            <div className="bg-slate-950 p-4 rounded-xl mb-8 border border-slate-800 text-left overflow-auto max-h-32">
              <code className="text-[10px] text-red-400 font-mono">{this.state.error?.message}</code>
            </div>
            <button 
              onClick={this.handleReset}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-red-900/20 uppercase tracking-widest text-xs"
            >
              Reset All Config & Reboot
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root target missing");

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
