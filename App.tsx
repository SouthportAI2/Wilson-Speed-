import React, { useState } from 'react';
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

  const renderView = () => {
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
