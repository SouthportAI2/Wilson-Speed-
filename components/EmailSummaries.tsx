import React, { useState, useEffect, useCallback } from 'react';
import { Mail, RefreshCw, AlertCircle, Clock, Zap, Activity, Phone, Wrench, Square } from 'lucide-react';
import { fetchEmailSummaries as fetchFromSupabase } from '../services/supabaseClient';

const AUTO_REFRESH_INTERVAL = 20 * 60 * 1000; // 20 minutes

const EmailSummaries: React.FC = () => {
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('Not yet updated');
  const [error, setError] = useState<string | null>(null);

  const fetchEmails = useCallback(async (isAuto = false) => {
    if (!isAuto) setLoading(true);
    setError(null);
    
    try {
      console.log(`[INFRA] Fetching email summaries from Supabase...`);
      
      const dbEmails = await fetchFromSupabase();
      
      const transformed = dbEmails.map((email) => {
        // Safely parse JSON fields
        let vehicles = [];
        let actionItems = [];
        
        try {
          if (email.vehicles) {
            vehicles = typeof email.vehicles === 'string' ? JSON.parse(email.vehicles) : email.vehicles;
          }
        } catch (e) {
          console.warn('Failed to parse vehicles:', e);
        }
        
        try {
          if (email.action_items) {
            actionItems = typeof email.action_items === 'string' ? JSON.parse(email.action_items) : email.action_items;
          }
        } catch (e) {
          console.warn('Failed to parse action_items:', e);
        }
        
        return {
          id: email.id,
          sender: email.sender_name || email.sender_email,
          sender_email: email.sender_email,
          subject: email.subject,
          summary: email.summary,
          phone: email.phone,
          vehicles: vehicles,
          action_items: actionItems,
          order_number: email.order_number,
          urgency_level: email.urgency_level || 'medium',
          request_type: email.request_type || 'general',
          timestamp: new Date(email.received_at).toLocaleString('en-US', { 
            month: 'short',
            day: 'numeric',
            hour: '2-digit', 
            minute: '2-digit'
          })
        };
      });
      
      setEmails(transformed);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error("Failed to fetch email summaries:", err);
      if (!isAuto) setError("Could not load email summaries. Check Supabase configuration in Settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails();
    const intervalId = setInterval(() => {
      fetchEmails(true);
    }, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [fetchEmails]);

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'medium': return 'bg-orange-500/10 border-orange-500/30 text-orange-400';
      case 'low': return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
      default: return 'bg-slate-800 border-slate-700 text-slate-400';
    }
  };

  const getRequestTypeColor = (type: string) => {
    switch (type) {
      case 'repair': return 'bg-red-500/10 border-red-500/20 text-red-400';
      case 'parts': return 'bg-orange-500/10 border-orange-500/20 text-orange-400';
      case 'quote': return 'bg-purple-500/10 border-purple-500/20 text-purple-400';
      case 'appointment': return 'bg-green-500/10 border-green-500/20 text-green-400';
      default: return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
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

          <button 
            onClick={() => fetchEmails(false)}
            disabled={loading}
            className="group flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl transition-all active:scale-95 shadow-xl shadow-blue-900/20 disabled:opacity-50 font-black uppercase tracking-widest text-xs"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
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
                className={`group relative rounded-3xl p-6 border transition-all duration-300 hover:shadow-2xl cursor-pointer ${getUrgencyColor(email.urgency_level)}`}
              >
                {/* Header: Urgency, Type, Time */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className={`text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border ${getUrgencyColor(email.urgency_level)}`}>
                    {email.urgency_level} PRIORITY
                  </span>
                  <span className={`text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border ${getRequestTypeColor(email.request_type)}`}>
                    {email.request_type}
                  </span>
                  {email.order_number && (
                    <span className="text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border bg-purple-500/10 border-purple-500/20 text-purple-400">
                      ORDER #{email.order_number}
                    </span>
                  )}
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest ml-auto">{email.timestamp}</span>
                </div>

                {/* Subject */}
                <h4 className="font-bold text-white text-xl tracking-tight mb-3">{email.subject}</h4>

                {/* Sender + Phone */}
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                    FROM: <span className="text-slate-200 normal-case tracking-normal ml-1">{email.sender}</span>
                  </p>
                  {email.phone && (
                    <a 
                      href={`tel:${email.phone}`}
                      className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-green-500 hover:text-white transition-all"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone size={12} /> {email.phone}
                    </a>
                  )}
                </div>

                {/* Vehicles */}
                {email.vehicles && email.vehicles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {email.vehicles.map((vehicle: any, idx: number) => (
                      <span key={idx} className="flex items-center gap-2 bg-slate-900/50 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold">
                        <Wrench size={12} className="text-blue-400" />
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </span>
                    ))}
                  </div>
                )}

                {/* Summary */}
                <p className="text-slate-400 text-sm leading-relaxed font-medium mb-4 bg-slate-900/30 p-4 rounded-xl border border-slate-800/30">
                  {email.summary}
                </p>

                {/* Action Items */}
                {email.action_items && email.action_items.length > 0 && (
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3">ACTION ITEMS:</p>
                    <div className="space-y-2">
                      {email.action_items.map((item: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-3 text-sm text-slate-300">
                          <Square size={16} className="text-slate-600 mt-0.5 flex-shrink-0" />
                          <span className="font-medium">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-20 opacity-20">
               <Mail size={64} className="mx-auto mb-4" />
               <p className="text-xs font-black uppercase tracking-[0.3em]">No Summaries Available</p>
            </div>
