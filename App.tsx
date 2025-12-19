
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout.tsx';
import Dashboard from './components/Dashboard.tsx';
import EmailSummaries from './components/EmailSummaries.tsx';
import AudioLogger from './components/AudioLogger.tsx';
import SocialPoster from './components/SocialPoster.tsx';
import ReviewBooster from './components/ReviewBooster.tsx';
import Settings from './components/Settings.tsx';
import { ViewState } from './types.ts';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [hasError, setHasError] = useState(false);

  // Simple runtime error catcher
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Global Infrastructure Error:", event.error);
      setHasError(true);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
        <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl max-w-md text-center">
          <h2 className="text-white font-black text-2xl mb-4">Core Infrastructure Error</h2>
          <p className="text-slate-400 mb-6 text-sm">A critical node failure has occurred. Attempting to restore connection to the mesh.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-bold transition-all"
          >
            Re-Initialize System
          </button>
        </div>
      </div>
    );
  }

  const renderView = () => {
    try {
      switch (currentView) {
        case ViewState.DASHBOARD:
          return <Dashboard onNavigate={setCurrentView} />;
        case ViewState.EMAILS:
          return <EmailSummaries />;
        case ViewState.AUDIO_LOGS:
          return <AudioLogger />;
        case ViewState.SOCIAL_MEDIA:
          return <SocialPoster />;
        case ViewState.REVIEWS:
          return <ReviewBooster />;
        case ViewState.SETTINGS:
          return <Settings />;
        default:
          return <Dashboard onNavigate={setCurrentView} />;
      }
    } catch (err) {
      console.error("View Render Failure:", err);
      return <Dashboard onNavigate={setCurrentView} />;
    }
  };

  return (
    <Layout currentView={currentView} onNavigate={setCurrentView}>
      <div className="animate-fade-in">
        {renderView()}
      </div>
    </Layout>
  );
};

export default App;
