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
              title="Email Summaries"
              icon={Mail}
              description={[
                "Auto-collect emails at 9AM & 4PM",
                "Summarize requests & parts updates",
                "Action items dashboard"
              ]}
              color="from-blue-500 to-cyan-400"
              onClick={() => setCurrentView(ViewState.EMAILS)}
            />
            <DashboardCard 
              title="Real-Time Audio Log"
              icon={Mic}
              description={[
                "Continuous audio intake",
                "Auto-transcribe shop conversations",
                "Search by vehicle or symptom",
                "AI Voice Assistant support"
              ]}
              color="from-indigo-500 to-purple-400"
              onClick={() => setCurrentView(ViewState.AUDIO_LOGS)}
            />
            <DashboardCard 
              title="AI Social Poster"
              icon={Share2}
              description={[
                "Auto-create FB & Insta posts",
                "Convert shop activity to content",
                "Schedule & publish automatically"
              ]}
              color="from-pink-500 to-rose-400"
              onClick={() => setCurrentView(ViewState.SOCIAL_MEDIA)}
            />
            <DashboardCard 
              title="Review Booster"
              icon={Star}
              description={[
                "Enter client email",
                "Send personalized requests",
                "Direct Google Review link",
                "Increase rating velocity"
              ]}
              color="from-yellow-400 to-orange-400"
              onClick={() => setCurrentView(ViewState.REVIEWS)}
            />
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
      default: return "Welcome, Eric.";
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