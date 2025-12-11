{/* Status Bar - UPDATED: Only show errors */}
<div className="flex justify-between items-center text-xs text-slate-400">
  <div className="flex items-center gap-3">
    {/* Only show status when there's an error */}
    {system.dbError && (
      <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-500/10 text-red-400">
        <WifiOff size={12} />
        DB Offline
      </span>
    )}
    
    {/* Remove debug info completely */}
  </div>

  <button
    onClick={fetchLogs}
    className="hover:text-white flex items-center gap-1 transition-colors"
  >
    <RefreshCw size={12} /> Refresh
  </button>
</div>

{/* Server Log Terminal - UPDATED: Only show during active operations */}
{(system.isProcessing || recording.isRecording || system.serverLog.includes('Error')) && (
  <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg font-mono text-[11px] text-green-400 flex gap-3 items-center overflow-hidden">
    <Terminal size={12} className="shrink-0 text-slate-500" />
    <span className="truncate">{system.serverLog}</span>
  </div>
)}

{/* Error message stays the same */}
{system.dbError && (
  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs flex items-center gap-2">
    <AlertTriangle size={14} className="shrink-0" />
    <span>{system.dbError}</span>
  </div>
)}
