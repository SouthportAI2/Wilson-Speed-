import React, { useState, useEffect, useCallback } from 'react';
import { Mail, RefreshCw, AlertCircle, Clock, Zap, Activity, Phone, Wrench, Square, List, Trash2 } from 'lucide-react';
import { fetchEmailSummaries as fetchFromSupabase } from '../services/supabaseClient';
import { getSupabaseClient } from '../services/supabaseClient';

const AUTO_REFRESH_INTERVAL = 20 * 60 * 1000; // 20 minutes

const EmailSummaries: React.FC = () => {
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('Not yet updated');
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>('TODAY');

  const deleteEmail = async (emailId: string) => {
    if (!confirm('Delete this email summary? This cannot be undone.')) {
      return;
    }

    const supabase = getSupabaseClient();
    
    // Remove from UI immediately
    setEmails(prev => prev.filter(email => email.id !== emailId));
    
    // Remove from cloud
    if (supabase) {
      try {
        await supabase
          .from('email_summaries')
          .delete()
          .eq('id', emailId);
      } catch (err) {
        console.error('Failed to delete from cloud:', err);
      }
    }
  };

  const fetchEmails = useCallback(async (isAuto = false) => {
    if (!isAuto) setLoading(true);
    setError(null);
    
    try {
      console.log(`[INFRA] Fetching email summaries from Supabase...`);
      
      const dbEmails = await fetchFromSupabase();
      
      const transformed = dbEmails.map((email) => {
        let vehicles = [];
        let actionItems = [];
        
        try {
          if (email.vehicles) {
            let vehicleData = typeof email.vehicles === 'string' ? email.vehicles.trim() : email.vehicles;
            if (typeof vehicleData === 'string') {
              vehicleData = vehicleData.replace(/^[^[\{]+/, '');
              vehicles = JSON.parse(vehicleData);
            } else {
              vehicles = vehicleData;
            }
          }
        } catch (e) {
          console.warn('Failed to parse vehicles:', e);
        }
        
        try {
          if (email.action_items) {
            let actionData = typeof email.action_items === 'string' ? email.action_items.trim() : email.action_items;
            if (typeof actionData === 'string') {
              actionData = actionData.replace(/^[^[\{]+/, '');
              actionItems = JSON.parse(actionData);
            } else {
              actionItems = actionData;
            }
          }
        } catch (e) {
          console.warn('Failed to parse action_items:', e);
        }
        
        return {
          id: email.id,
          gmail_id: email.gmail_id,
          sender: email.sender_name || email.sender_email,
          sender_email: email.sender_email,
          subject: email.subject,
          summary: email.summary,
          phone: email.phone && email.phone !== '=' && email.phone !== 'null' ? email.phone : null,
          vehicles: vehicles,
          action_items: actionItems,
          urgency_level: email.urgency_level || 'medium',
          request_type: email.request_type || 'general',
          received_at: new Date(email.received_at),
          timestamp: new Date(email.received_at).toLocaleString('en-US', { 
            month: 'short',
            day: 'numeric',
            hour: '2-digit', 
            minute: '2-digit'
          })
        };
      });
      
      // FIX: Robust deduplication based on sender, subject, and timestamp (within 1 minute)
      const uniqueEmails: any[] = [];
      transformed.forEach((email) => {
        const duplicateIndex = uniqueEmails.findIndex(existing => 
          existing.sender_email === email.sender_email &&
          existing.subject === email.subject &&
          Math.abs(existing.received_at.getTime() - email.received_at.getTime()) < 60000
        );

        if (duplicateIndex === -1) {
          uniqueEmails.push(email);
        } else if (email.received_at > uniqueEmails[duplicateIndex].received_at) {
          // Keep the newer entry if multiple instances of the same email exist
          uniqueEmails[duplicateIndex] = email;
        }
      });
      
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const sorted = uniqueEmails.sort((a, b) => {
        const priorityDiff = priorityOrder[a.urgency_level] - priorityOrder[b.urgency_level];
        if (priorityDiff !== 0) return priorityDiff;
        return b.received_at.getTime() - a.received_at.getTime();
      });
      
      setEmails(sorted);
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

  const getDateGroup = (date: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const emailDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Calculate difference in days
    const diffTime = today.getTime() - emailDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'TODAY';
    if (diffDays === 1) return 'YESTERDAY';
    if (diffDays >= 2 && diffDays <= 7) return 'LAST WEEK';
    return 'OLDER';
  };

  const filteredEmails = emails.filter(email => getDateGroup(email.received_at) === selectedTab);

  const getCardBorderColor = (level: string) => {
    switch (level) {
      case 'high': return 'border-red-500/50 bg-slate-900/40';
      case 'medium': return 'border-yellow-500/50 bg-slate-900/40';
      case 'low': return 'border-slate-600 bg-slate-900/40';
      default: return 'border-slate-700 bg-slate-900/40';
    }
  };

  const getTitleColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-slate-400';
      default: return 'text-white';
    }
  };

  const getBulletColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-slate-500';
      default: return 'text-slate-400';
    }
  };

  const cleanSummary = (summary: string) => {
    if (!summary) return '';
    
    let result = summary.trim();
    
    // Remove exact prefix matches (most explicit approach possible)
    if (result.startsWith('=LOW:')) result = result.substring(5).trim();
    else if (result.startsWith('=MEDIUM:')) result = result.substring(8).trim();
    else if (result.startsWith('=HIGH:')) result = result.substring(6).trim();
    else if (result.startsWith('LOW:')) result = result.substring(4).trim();
    else if (result.startsWith('MEDIUM:')) result = result.substring(7).trim();
    else if (result.startsWith('HIGH:')) result = result.substring(5).trim();
    
    // Strip any remaining leading = characters
    while (result.startsWith('=')) {
      result = result.substring(1).trim();
    }
    
    return result;
  };

  const getQuickSummary = (email: any) => {
    const vehicleText = email.vehicles && email.vehicles.length > 0 
      ? `${email.vehicles[0].year} ${email.vehicles[0].make} ${email.vehicles[0].model}` 
      : '';
    
    const phoneText = email.phone ? ` - ${email.phone}` : '';
    const cleanedSummary = cleanSummary(email.summary);
    
    return `${vehicleText ? vehicleText + ' - ' : ''}${cleanedSummary}${phoneText}`;
  };

  const tabs = ['TODAY', 'YESTERDAY', 'LAST WEEK', 'OLDER'];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] -mr-32 -mt-32 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-slate-800 pb-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-xl text-white shadow-xl shadow-blue-900/20">
              <Zap size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Email Summarizer</h3>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                <p className="text-slate-400 text-xs flex items-center gap-2 font-medium">
                  <Clock size={12} className="text-blue-500" /> 
                  Last updated: <span className="text-slate-200">{lastUpdated}</span>
                </p>
                <div className="flex items-center gap-2 px-2 py-0.5 bg-blue-500/5 border border-blue-500/10 rounded-full">
                  <Activity size={10} className="text-blue-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-400/70">Auto-Sync (20m)</span>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={() => fetchEmails(false)}
            disabled={loading}
            className="group flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all active:scale-95 shadow-xl shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs relative z-20"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="flex gap-2 mb-6 relative z-10">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                selectedTab === tab 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-4 text-red-400 relative z-10">
            <AlertCircle size={18} />
            <p className="text-xs font-bold">{error}</p>
          </div>
        )}

        {loading && emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4 relative z-10">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full" />
              <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Loading...</p>
          </div>
        ) : filteredEmails.length > 0 ? (
          <div className="relative z-10">
            <div className="bg-slate-950/60 border border-slate-700 rounded-2xl p-5 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <List size={20} className="text-blue-400" />
                <h4 className="text-sm font-black text-white uppercase tracking-wider">Quick Summary - {selectedTab}</h4>
              </div>
              <div className="space-y-3">
                {filteredEmails.map((email) => (
                  <div key={email.id} className="flex items-start gap-3">
                    <span className={`mt-1 font-black text-lg ${getBulletColor(email.urgency_level)}`}>•</span>
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed">
                        <span className={`font-bold ${getTitleColor(email.urgency_level)}`}>
                          {email.urgency_level.toUpperCase()}:
                        </span>
                        <span className="text-slate-300"> {getQuickSummary(email)}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">Detailed View</h4>
              {filteredEmails.map((email) => (
               <div 
  key={email.id} 
  className={`group relative rounded-2xl p-4 pr-12 border transition-all duration-300 hover:shadow-xl ${getCardBorderColor(email.urgency_level)}`}
>
  {/* Delete button - top right corner */}
  <button
    onClick={(e) => {
      e.stopPropagation();
      deleteEmail(email.id);
    }}
    className="absolute top-2 right-2 p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all z-10 opacity-0 group-hover:opacity-100"
    title="Delete email summary"
  >
    <Trash2 size={14} />
  </button>

  <div className="flex flex-wrap items-center gap-2 mb-3 pr-8">
                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${email.urgency_level === 'high' ? 'bg-red-500/20 text-red-400' : email.urgency_level === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-500/20 text-slate-400'}`}>
                      {email.urgency_level.toUpperCase()} PRIORITY
                    </span>
                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${email.request_type === 'repair' ? 'bg-red-500/20 text-red-400' : email.request_type === 'parts' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {email.request_type.toUpperCase()}
                    </span>
                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider ml-auto">{email.timestamp}</span>
                  </div>

                  <h4 className={`font-bold text-lg tracking-tight mb-2 ${getTitleColor(email.urgency_level)}`}>{email.subject}</h4>

                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                      FROM: <span className="text-slate-200 normal-case tracking-normal ml-1">{email.sender}</span>
                    </p>
                    {email.phone && (
                      <a 
                        href={`tel:${email.phone}`}
                        className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 px-2.5 py-1 rounded-lg text-xs font-bold hover:bg-green-500 hover:text-white transition-all"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone size={12} /> {email.phone}
                      </a>
                    )}
                  </div>

                  {email.vehicles && email.vehicles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {email.vehicles.map((vehicle: any, idx: number) => (
                        <span key={idx} className="flex items-center gap-2 bg-slate-900/50 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-lg text-xs font-bold">
                          <Wrench size={12} className="text-blue-400" />
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-slate-400 text-sm leading-relaxed font-medium mb-3 bg-slate-900/30 p-3 rounded-xl border border-slate-800/30">
                    {cleanSummary(email.summary)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 opacity-20 relative z-10">
            <Mail size={48} className="mx-auto mb-3" />
            <p className="text-xs font-black uppercase tracking-[0.3em]">No Emails in {selectedTab}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailSummaries;
