
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 animate-fade-in-up">
            <DashboardCard 
              title="Intel Logs"
              icon={Mail}
              description={[
                "Yahoo Secure Harvesting",
                "Action Items Extraction",
                "Operational Summary"
              ]}
              color="border-slate-800"
              iconColor="text-slate-400"
              onClick={() => setCurrentView(ViewState.EMAILS)}
            />
            <DashboardCard 
              title="Acoustic Recon"
              icon={Mic}
              description={[
                "Continuous Environment Capture",
                "Strategic Intelligence Feed",
                "Voice Interface Ready"
              ]}
              color="border-blue-900/50"
              iconColor="text-blue-500"
              onClick={() => setCurrentView(ViewState.AUDIO_LOGS)}
            />
            <DashboardCard 
              title="Media Engine"
              icon={Share2}
              description={[
                "FB & IG Content Pipeline",
                "Automated Deployment",
                "Engagement Analytics"
              ]}
              color="border-orange-900/50"
              iconColor="text-orange-600"
              onClick={() => setCurrentView(ViewState.SOCIAL_MEDIA)}
            />
            <DashboardCard 
              title="Review Force"
              icon={Star}
              description={[
                "Google Rating Defense",
                "Automated Outreach Protocol",
                "Rank Optimization"
              ]}
              color="border-red-900/50"
              iconColor="text-red-600"
              onClick={() => setCurrentView(ViewState.REVIEWS)}
            />
          </div>
        );
    }
  };

  const getTitle = () => {
    switch (currentView) {
      case ViewState.EMAILS: return "Intelligence Operations";
      case ViewState.AUDIO_LOGS: return "Acoustic Intelligence";
      case ViewState.SOCIAL_MEDIA: return "Social Deployment";
      case ViewState.REVIEWS: return "Review Tactical";
      case ViewState.SETTINGS: return "Core Configuration";
      default: return "ERIC WILSONS PERSON AI INFRASTRUCTURE";
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
