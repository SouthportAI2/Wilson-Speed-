import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Mail, Search, RefreshCw, Clock, Trash2, AlertCircle, Zap, Package, Settings as SettingsIcon } from 'lucide-react';
import { getSupabaseClient } from '../services/supabaseClient';
import { EmailSummary } from '../types';

const LOCAL_CACHE_KEY = 'southport_email_cache_v2';

const categoryIcons: Record<string, React.ReactNode> = {
  URGENT: <AlertCircle size={16} className="text-red-400" />,
  CUSTOMER: <Mail size={16} className="text-blue-400" />,
  PARTS: <Package size={16} className="text-yellow-400" />,
  ADMIN: <SettingsIcon size={16} className="text-slate-400" />,
};

const categoryColors: Record<string, string> = {
  URGENT: 'bg-red-500/10 border-red-500/20 text-red-400',
  CUSTOMER: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  PARTS: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
  ADMIN: 'bg-slate-500/10 border-slate-500/20 text-slate-400',
};

const EmailSummarizer: React.FC = () => {
  const [emails, setEmails] = useState<EmailSummary[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const categories = ['ALL', 'URGENT', 'CUSTOMER', 'PARTS', 'ADMIN'];

  const deleteEmail = async (emailId: string) => {
    if (!confirm('Delete this email summary? This cannot be undone.')) {
      return;
    }

    const supabase = getSupabaseClient();
    
    // Remove from UI immediately
    setEmails(prev => prev.filter(email => email.id !== emailId));
    
    // Remove from cloud if it exists there
    if (supabase && !emailId.startsWith('email-')) {
      try {
        await supabase
          .from('email_summaries')
          .delete()
          .eq('id', emailId);
      } catch (err) {
        console.error('Failed to delete from cloud:', err);
      }
    }
    
    // Remove from local cache
    const localData = localStorage.getItem(LOCAL_CACHE_KEY);
    if (localData) {
      const cachedEmails: EmailSummary[] = JSON.parse(localData);
      const filtered = cachedEmails.filter(email => email.id !== emailId);
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(filtered));
    }
  };

  const fetchEmails = useCallback(async () => {
    setIsSyncing(true);
    const supabase = getSupabaseClient();
    let cloudEmails: EmailSummary[] = [];

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('email_summaries')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (!error && data) {
          cloudEmails = data.map(item => ({
            id: item.id.toString(),
            sender: item.sender,
            subject: item.subject,
            summary: item.summary,
            category: item.category as 'URGENT' | 'CUSTOMER' | 'PARTS' | 'ADMIN',
            timestamp: new Date(item.created_at).toLocaleString(),
          }));
        }
      } catch (err) {
        console.warn("Cloud connection limited:", err);
      }
    }

    const localData = localStorage.getItem(LOCAL_CACHE_KEY);
    const cachedEmails: EmailSummary[] = localData ? JSON.parse(localData) : [];

    const combined = [...cachedEmails, ...cloudEmails];
    const unique = combined.reduce((acc, current) => {
      if (acc.find(item => item.id === current.id)) return acc;
      return acc.concat([current]);
    }, [] as EmailSummary[]);

    setEmails(unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    setIsSyncing(false);

    if (cloudEmails.length > 0) {
      localStorage.removeItem(LOCAL_CACHE_KEY);
    }
  }, []);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const filteredEmails = useMemo(() => {
    let filtered = emails;

    if (selectedCategory !== 'ALL') {
      filtered = filtered.filter(email => email.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(email => 
        email.sender.toLowerCase().includes(query) ||
        email.subject.toLowerCase().includes(query) ||
        email.summary.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [emails, selectedCategory, searchQuery]);

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-140px)] animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-3xl p-8 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] -mr-32 -mt-32" />
        
        <div className="flex justify-between items-center mb-6 relative z-10">
          <h3 className="text-2xl font-bold text-white tracking-tight">Email Summarizer</h3>
          <button 
            onClick={fetchEmails}
            className="p-3 text-slate-400 hover:text-white transition-all active:scale-95"
          >
            <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className="relative z-10 mb-6">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            type="text" 
            placeholder="Search sender, subject, or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl p-5 pl-16 text-white font-medium outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600 shadow-inner"
          />
        </div>

        {/* CATEGORY TABS */}
        <div className="flex gap-2 relative z-10">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                selectedCategory === category 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* EMAILS LIST */}
      <div className="flex-1 bg-slate-900/20 rounded-3xl border border-slate-800/50 overflow-hidden flex flex-col shadow-inner">
        <div className="p-6 border-b border-slate-800/50 bg-slate-900/40 flex justify-between items-center">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">
            {searchQuery ? 'Search Results' : selectedCategory === 'ALL' ? 'All Emails' : `${selectedCategory} Emails`} ({filteredEmails.length})
          </h4>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {filteredEmails.length > 0 ? filteredEmails.map((email) => (
            <div 
              key={email.id}
              className="w-full text-left p-6 rounded-2xl border bg-slate-900/40 border-slate-800/40 hover:bg-slate-800/60 hover:border-slate-700 transition-all duration-300"
            >
              {/* Header with timestamp and delete */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${categoryColors[email.category]} border shadow-inner`}>
                    {categoryIcons[email.category]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{email.sender}</span>
                      <span className="text-slate-600 font-bold">•</span>
                      <span className="text-slate-500 text-xs">{email.timestamp}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteEmail(email.id)}
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  title="Delete email summary"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Subject */}
              <h5 className="text-white font-bold text-base mb-3">{email.subject}</h5>

              {/* Summary */}
              <p className="text-slate-400 text-sm leading-relaxed">{email.summary}</p>
            </div>
          )) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-700 py-20 text-center">
              <Mail size={64} className="mb-4 opacity-5" />
              <p className="text-xs font-black uppercase tracking-[0.3em] opacity-20">
                {searchQuery ? 'No matching emails' : `No ${selectedCategory === 'ALL' ? '' : selectedCategory.toLowerCase() + ' '}emails`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailSummarizer;
