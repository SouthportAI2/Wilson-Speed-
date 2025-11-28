import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, AlertCircle, Package, UserCheck, Clock } from 'lucide-react';
import { generateEmailSummaries } from '../services/gemini';
import { EmailSummary } from '../types';

const EmailSummaries: React.FC = () => {
  const [emails, setEmails] = useState<EmailSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('Not yet updated');

  const fetchEmails = async () => {
    setLoading(true);
    const results = await generateEmailSummaries();
    setEmails(results);
    setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setLoading(false);
  };

  useEffect(() => {
    // Initial fetch simulation
    fetchEmails();
  }, []);

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'URGENT': return <AlertCircle className="text-red-400" />;
      case 'PARTS': return <Package className="text-orange-400" />;
      case 'CUSTOMER': return <UserCheck className="text-blue-400" />;
      default: return <Mail className="text-slate-400" />;
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'URGENT': return 'bg-red-500/10 border-red-500/20 text-red-400';
      case 'PARTS': return 'bg-orange-500/10 border-orange-500/20 text-orange-400';
      case 'CUSTOMER': return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
      default: return 'bg-slate-800 border-slate-700 text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 backdrop-blur-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Yahoo Email Intake</h3>
            <p className="text-slate-400 text-sm flex items-center gap-2 mt-1">
              <Clock size={14} /> 
              Next auto-sync: 4:00 PM • Last sync: {lastUpdated}
            </p>
          </div>
          <button 
            onClick={fetchEmails}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Analyzing...' : 'Sync Now'}
          </button>
        </div>

        <div className="space-y-4">
          {loading && emails.length === 0 ? (
             <div className="text-center py-12 text-slate-500">Connecting to secure email gateway...</div>
          ) : (
            emails.map((email) => (
              <div 
                key={email.id} 
                className="group relative bg-slate-800 rounded-lg p-5 border border-slate-700 hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-900/20 cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className={`p-3 rounded-lg h-fit ${getCategoryColor(email.category)}`}>
                      {getCategoryIcon(email.category)}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getCategoryColor(email.category)} border-0`}>
                          {email.category}
                        </span>
                        <span className="text-slate-400 text-xs">{email.timestamp}</span>
                      </div>
                      <h4 className="font-semibold text-white text-lg">{email.subject}</h4>
                      <p className="text-sm text-slate-300 font-medium mb-1">From: {email.sender}</p>
                      <p className="text-slate-400 text-sm leading-relaxed">{email.summary}</p>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="text-blue-400 text-sm font-medium hover:underline">View Full</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
           <div className="text-2xl font-bold text-white mb-1">12</div>
           <div className="text-sm text-slate-400">Pending Quotes</div>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
           <div className="text-2xl font-bold text-white mb-1">5</div>
           <div className="text-sm text-slate-400">Parts Arriving Today</div>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
           <div className="text-2xl font-bold text-white mb-1">3</div>
           <div className="text-sm text-slate-400">Urgent Customer Issues</div>
        </div>
      </div>
    </div>
  );
};

export default EmailSummaries;