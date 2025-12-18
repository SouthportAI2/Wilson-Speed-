
import React, { useState } from 'react';
import { ViewState } from './types';
import Layout from './components/Layout';
import EmailSummaries from './components/EmailSummaries';
import AudioLogger from './components/AudioLogger';
import SocialPoster from './components/SocialPoster';
import ReviewBooster from './components/ReviewBooster';
import DashboardCard from './components/DashboardCard';
import Settings from './components/Settings';
import { Mail, Mic, Share2, Star } from 'lucide-react';

function App() {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);

  const renderContent = () => {
    switch (currentView) {
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
      case ViewState.DASHBOARD:
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6 animate-fade-in-up">
            <DashboardCard 
              title="Email Intel"
              icon={Mail}
              description={[
                "Yahoo Scraper Analysis",
                "Action Items Priority",
                "Parts Log Tracking"
              ]}
              color="from-slate-800 to-black"
              onClick={() => setCurrentView(ViewState.EMAILS)}
            />
            <DashboardCard 
              title="Audio Recon"
              icon={Mic}
              description={[
                "24/7 Shop Monitoring",
                "Raw AI Transcription",
                "Voice Assist Protocol"
              ]}
              color="from-blue-950 to-slate-900"
              onClick={() => setCurrentView(ViewState.AUDIO_LOGS)}
            />
            <DashboardCard 
              title="Social Pipeline"
              icon={Share2}
              description={[
                "FB/IG Content Engine",
                "Automated Deployment",
                "Asset Management"
              ]}
              color="from-orange-950 to-orange-900"
              onClick={() => setCurrentView(ViewState.SOCIAL_MEDIA)}
            />
            <DashboardCard 
              title="Review Striker"
              icon={Star}
              description={[
                "Rating Optimization",
                "Client Recon Outreach",
                "Google Rank Defense"
              ]}
              color="from-red-950 to-black"
              onClick={() => setCurrentView(ViewState.REVIEWS)}
            />
          </div>
        );
    }
  };

  const getTitle = () => {
    switch (currentView) {
      case ViewState.EMAILS: return "Email Operations";
      case ViewState.AUDIO_LOGS: return "Audio Intel Center";
      case ViewState.SOCIAL_MEDIA: return "Content Deployment";
      case ViewState.REVIEWS: return "Review Management";
      case ViewState.SETTINGS: return "System Config";
      default: return "Welcome to Eric Wilsons Person AI infrastructure.";
    }
  };

  return (
    <Layout 
      currentView={currentView} 
      onNavigate={setCurrentView}
      title={getTitle()}
    >
      {renderContent()}
    </Layout>
  );
}

export default App;
