import React, { useState } from 'react';
import { FileText, Download, Calendar, Filter, CheckCircle2, FileSpreadsheet, FileCode, Printer } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const [selectedReportType, setSelectedReportType] = useState('daily_traffic');
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const reportOptions = [
    { id: 'daily_traffic', title: 'Daily City Traffic Summary Report', desc: 'Aggregated volume counts, mean corridor speeds, and peak-hour congestion index.' },
    { id: 'anpr_stats', title: 'ANPR & OCR Accuracy Audit Report', desc: 'STN skew correction metrics, CRNN character accuracy (>90%), and camera performance.' },
    { id: 'incidents_log', title: 'Incident & Watchlist Anomaly Log', desc: 'Blacklist hits, cloned plate teleportation instances, and speeding violations.' },
    { id: 'od_matrix', title: 'Origin-Destination (O-D) Matrix Report', desc: 'Zone-to-zone vehicle movement patterns for public transit & urban planning.' },
    { id: 'predictive_audit', title: 'Predictive Intelligence Model Audit', desc: 'XGBoost forecast accuracy, MAE/RMSE travel-time metrics, and operator approvals.' },
  ];

  const handleExport = (format: string) => {
    setExportSuccess(`Successfully generated and exported ${selectedReportType.toUpperCase()}_REPORT.${format}`);
    setTimeout(() => setExportSuccess(null), 4000);
  };

  return (
    <div className="p-4 space-y-4 max-w-[1920px] mx-auto">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Smart City Traffic Reporting & Compliance Generator</h2>
            <p className="text-[11px] text-slate-400 font-mono">Export PDF, CSV, & JSON Operational Telemetry Audits</p>
          </div>
        </div>
      </div>

      {exportSuccess && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2 font-mono animate-pulse">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {exportSuccess}
        </div>
      )}

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Report Type Selection (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 shadow-xl">
          <div className="text-xs font-bold text-slate-200 border-b border-slate-800 pb-2">
            Select Report Template
          </div>

          <div className="space-y-2">
            {reportOptions.map(rep => (
              <button
                key={rep.id}
                onClick={() => setSelectedReportType(rep.id)}
                className={`w-full text-left p-3 rounded-xl border text-xs transition-all space-y-1 ${
                  selectedReportType === rep.id
                    ? 'bg-cyan-950/60 border-cyan-500 text-slate-100 shadow-md ring-1 ring-cyan-500/40'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                }`}
              >
                <div className="font-bold text-slate-100">{rep.title}</div>
                <p className="text-[11px] text-slate-400 leading-tight">{rep.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Export Controls & Preview (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-xl space-y-4">
          <div className="space-y-4">
            <div className="text-xs font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center justify-between">
              <span>Report Export Configuration</span>
              <span className="text-[10px] font-mono text-cyan-400 uppercase">Target System: ITS Command</span>
            </div>

            {/* Date & Sector Filters */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-mono">Date Range:</label>
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  <span>2026-09-09 to 2026-09-10</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-mono">City Sector:</label>
                <select className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono focus:outline-none">
                  <option>All City Sectors (Metropolitan)</option>
                  <option>Cyberabad IT Sector</option>
                  <option>Secunderabad North Sector</option>
                </select>
              </div>
            </div>

            {/* Report Preview Box */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-2">
              <div className="text-cyan-400 font-bold">REPORT SPECIFICATION PREVIEW</div>
              <div className="text-[11px] text-slate-400 leading-relaxed">
                ● Title: {reportOptions.find(r => r.id === selectedReportType)?.title}<br />
                ● Compliance: SHA-256 Privacy Preserving Masking Applied<br />
                ● Estimated Data Points: 428,563 vehicle detection events<br />
                ● Generated By: Command Center Operator (Cmdr. V. Rao)
              </div>
            </div>
          </div>

          {/* Export Action Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all flex items-center gap-1.5 border border-slate-700 font-mono"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Export CSV
            </button>

            <button
              onClick={() => handleExport('json')}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all flex items-center gap-1.5 border border-slate-700 font-mono"
            >
              <FileCode className="w-4 h-4 text-cyan-400" /> Export GeoJSON
            </button>

            <button
              onClick={() => handleExport('pdf')}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-cyan-600/30 font-mono"
            >
              <Download className="w-4 h-4" /> Export Executive PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
