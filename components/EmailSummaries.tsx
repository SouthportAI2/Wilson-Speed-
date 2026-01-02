import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mail, RefreshCw, AlertCircle, Package, UserCheck, Clock, ShieldCheck, Zap, Activity } from 'lucide-react';
import { generateEmailSummaries } from '../services/gemini';
import { EmailSummary, InfrastructureConfig } from '../types';
import { fetchEmailSummaries as fetchFromSupabase } from '../services/supabaseClient';

const AUTO_REFRESH_INTERVAL = 20 * 60 * 1000; // 20 minutes
const STATS_STORAGE_KEY = 'southport_daily_stats';

interface DailyStats {
  pendingQuotes: number;
  partsArriving: number;
  urgentAlerts: number;
  lastResetTimestamp: number;
}

const EmailSummaries: React.FC = () => {
  const [emails, setEmails] = useState<EmailSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('Not yet updated');
  const [config, setConfig] = useState<InfrastructureConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Daily Stats State
  const [stats, setStats] = useState<DailyStats>({
    pendingQuotes: 12,
    partsArriving: 5,
    urgentAlerts: 3,
    lastResetTimestamp: Date.now()
  });

  // Initialize and check for 5 AM reset
  const checkAndResetStats = useCallback(() => {
    const savedStats = localStorage.getItem(STATS_STORAGE_KEY);
    const now = new Date();
    
    // Calculate today's 5 AM
    const today5AM = new Date();
    today5AM.setHours(5, 0, 0, 0);

    let currentStats: DailyStats;

    if (savedStats) {
      currentStats = JSON.parse(savedStats);
      const lastReset = new Date(currentStats.lastResetTimestamp);
      
      // If the last reset was BEFORE today's 5 AM, and we are now AFTER today's 5 AM, reset.
      if (lastReset < today5AM && now >= today5AM) {
        currentStats = {
          pendingQuotes: 0,
          partsArriving: 0,
          urgentAlerts: 0,
          lastResetTimestamp: now.getTime()
        };
      }
    } else {
      // First time initialization
      currentStats = {
        pendingQuotes: 12, // Initial mock values
        partsArriving: 5,
        urgentAlerts: 3,
        lastResetTimestamp: now.getTime()
      };
    }

    setStats(currentStats);
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(currentStats));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('southport_config');
    if (saved) setConfig(JSON.parse(saved));
    
    checkAndResetStats();

    // Check for reset every minute in case the app is left open past 5 AM
    const resetCheckInterval = setInterval(checkAndResetStats, 60000);
    return () => clearInterval(resetCheckInterval);
  }, [checkAndResetStats]);

  const fetchEmails = useCallback(async (isAuto = false) => {
    if (!isAuto) setLoading(true);
    setError(null);
    
    try {
      console.log(`[INFRA] Fetching email summaries from Supabase...`);
      
      const dbEmails = await fetchFromSupabase();
      
      const transformed = dbEmails.map((email: any) => ({
        id: email.id,
        sender: email.sender_name || email.sender_email,
        subject: email.subject,
        summary: email.summary,
        timestamp: new Date(email.received_at).toLocaleString('en-US', { 
          month: 'short',
          day: 'numeric',
          hour: '2-digit', 
          minute: '2-digit'
        }),
        category: email.summary.toLowerCase().includes('urgent') ? 'URGENT' : 
                  email.summary.toLowerCase().includes('part') ? 'PARTS' : 'CUSTOMER'
      }));

      setEmails(transformed);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error("Sync failed:", err);
      if (!isAuto) setError("Infrastructure handshake failed. Check Supabase connectivity.");
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    fetchEmails();
    const intervalId = setInterval(() => {
      fetchEmails(true);
    }, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [fetchEmails]);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'URGENT': return 'bg-red-500/10 border-red-500/20 text-red-400';
      case 'PARTS': return 'bg-orange-500/10 border-orange-500/20 text-orange-400';
      case 'CUSTOMER': return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
      default: return 'bg-slate-800 border-slate-700 text-slate-400';
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'URGENT': return <AlertCircle className="text-red-400" />;
      case 'PARTS': return <Package className="text-orange-400" />;
      case 'CUSTOMER': return <UserCheck className="text-blue-400" />;
      default: return <Mail className="text-slate-400" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] -mr-32 -mt-32" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 border-b border-slate-800 pb-10">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-900/20">
              <Zap size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white tracking-tight">Email Summarizer</h3>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                <p className="text-slate-400 text-xs flex items-center gap-2 font-medium">
                  <Clock size={14} className="text-blue-500" /> 
                  Last updated: <span className="text-slate-200">{lastUpdated}</span>
                </p>
                <div className="flex items-center gap-2 px-2 py-0.5 bg-blue-500/5 border border-blue-500/10 rounded-full">
                  <Activity size={10} className="text-blue-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-400/70">Auto-Sync Active (20m)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => fetchEmails(false)}
              disabled={loading}
              className="group flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl transition-all active:scale-95 shadow-xl shadow-blue-900/20 disabled:opacity-50 font-black uppercase tracking-widest text-xs"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-400">
            <AlertCircle size={20} />
            <p className="text-xs font-bold uppercase tracking-wide">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {loading && emails.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-4">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full" />
                  <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Establishing Secure Handshake...</p>
             </div>
          ) : emails.length > 0 ? (
            emails.map((email) => (
              <div 
                key={email.id} 
                className="group relative bg-slate-950/40 rounded-3xl p-6 border border-slate-800/50 hover:border-blue-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/10 cursor-pointer"
              >
                <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                  <div className="flex gap-6">
                    <div className={`p-4 rounded-2xl h-fit border shadow-inner ${getCategoryColor(email.category)}`}>
                      {getCategoryIcon(email.category)}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest border ${getCategoryColor(email.category)}`}>
                          {email.category}
                        </span>
                        <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{email.timestamp}</span>
                      </div>
                      <h4 className="font-bold text-white text-xl tracking-tight group-hover:text-blue-400 transition-colors">{email.subject}</h4>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Sender: <span className="text-slate-200 normal-case tracking-normal ml-1">{email.sender}</span></p>
                      <p className="text-slate-400 text-sm leading-relaxed font-medium mt-4 bg-slate-900/30 p-4 rounded-xl border border-slate-800/30">
                        {email.summary}
                      </p>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                    <button className="flex items-center gap-2 bg-blue-600/10 text-blue-400 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all">
                      Open <ShieldCheck size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 opacity-20">
               <Mail size={64} className="mx-auto mb-4" />
               <p className="text-xs font-black uppercase tracking-[0.3em]">No Summaries Available</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Pending Quotes" value={stats.pendingQuotes.toString()} color="text-blue-400" />
        <StatCard label="Parts Arriving" value={stats.partsArriving.toString()} color="text-orange-400" />
        <StatCard label="Urgent Alerts" value={stats.urgentAlerts.toString()} color="text-red-400" />
      </div>

      <div className="text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
          Infrastructure Reset Cycle: <span className="text-slate-400">Daily @ 05:00 AM</span>
        </p>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, color }: { label: string, value: string, color: string }) => (
  <div className="bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800 shadow-xl text-center group hover:border-blue-500/30 transition-all duration-500">
     <div className={`text-4xl font-black mb-2 tracking-tighter ${color} group-hover:scale-110 transition-transform`}>{value}</div>
     <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">{label}</div>
  </div>
);

export default EmailSummaries;
