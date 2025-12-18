
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
          <div className="space-y-8">
            <p className="text-slate-400 font-bold text-2xl tracking-tight animate-in fade-in slide-in-from-left-4 duration-700">
              Welcome Eric
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6 animate-fade-in-up">
              <DashboardCard 
                title="Email Summaries"
                icon={Mail}
                description={[
                  "Auto-collect emails from Yahoo",
                  "Summarize requests & parts updates",
                  "Daily Action items dashboard"
                ]}
                color="from-blue-500 to-cyan-400"
                onClick={() => setCurrentView(ViewState.EMAILS)}
              />
              <DashboardCard 
                title="Shop Audio Intelligence"
                icon={Mic}
                description={[
                  "Continuous audio intake/monitoring",
                  "Auto-transcribe shop conversations",
                  "AI Voice Assistant support"
                ]}
                color="from-indigo-500 to-purple-400"
                onClick={() => setCurrentView(ViewState.AUDIO_LOGS)}
              />
              <DashboardCard 
                title="Social Media Autopilot"
                icon={Share2}
                description={[
                  "Auto-create FB & Insta posts",
                  "Convert shop activity to content",
                  "Scheduled AI-generated media"
                ]}
                color="from-pink-500 to-rose-400"
                onClick={() => setCurrentView(ViewState.SOCIAL_MEDIA)}
              />
              <DashboardCard 
                title="Review Booster"
                icon={Star}
                description={[
                  "Direct client review generation",
                  "Personalized AI outreach emails",
                  "Google Rating acceleration"
                ]}
                color="from-yellow-400 to-orange-400"
                onClick={() => setCurrentView(ViewState.REVIEWS)}
              />
            </div>
          </div>
        );
    }
  };

  const getTitle = () => {
    switch (currentView) {
      case ViewState.EMAILS: return "Daily Email Summaries";
      case ViewState.AUDIO_LOGS: return "Shop Audio Intelligence";
      case ViewState.SOCIAL_MEDIA: return "Social Media Autopilot";
      case ViewState.REVIEWS: return "Google Review Booster";
      case ViewState.SETTINGS: return "System Configuration";
      default: return "Welcome Eric";
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

