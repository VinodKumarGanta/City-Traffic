import React, { useState, useEffect } from 'react';
import {
  Search,
  MapPin,
  Clock,
  Radio,
  Volume2,
  VolumeX,
  QrCode,
  Lock,
  Unlock,
  MoreHorizontal,
  Bell,
  Atom,
} from 'lucide-react';
import { audioAlertService } from '../../services/audioAlertService';
import { CITY_OPTIONS } from '../../constants/cities';
import type { PostgresConnectionStatus } from '../../services/dbService';

interface NavbarProps {
  currentCity: string;
  onCityChange: (city: string) => void;
  onSearch: (query: string) => void;
  privacyMaskEnabled: boolean;
  onTogglePrivacyMask: () => void;
  activeAlertCount: number;
  onOpenMobileQr?: () => void;
  connection?: PostgresConnectionStatus | null;
  onOpenAlerts?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentCity,
  onCityChange,
  onSearch,
  privacyMaskEnabled,
  onTogglePrivacyMask,
  activeAlertCount,
  onOpenMobileQr,
  connection,
  onOpenAlerts,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [isAudioMuted, setIsAudioMuted] = useState(audioAlertService.getMuted());
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const unsub = audioAlertService.subscribe(() => {
      setIsAudioMuted(audioAlertService.getMuted());
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) onSearch(searchQuery.trim());
  };

  return (
    <header className="h-14 bg-slate-950/95 border-b border-slate-800 px-3 flex items-center justify-between z-30 sticky top-0 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center">
            <Radio className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:block min-w-0">
            <h1 className="text-sm font-semibold text-white leading-tight">City Traffic</h1>
            <p className="text-[10px] text-slate-500 font-mono">Command</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs">
          <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <select
            value={currentCity}
            onChange={(e) => onCityChange(e.target.value)}
            className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer max-w-[200px]"
          >
            {CITY_OPTIONS.map((g) => (
              <optgroup key={g.group} label={g.group} className="bg-slate-900">
                {g.values.map((v) => (
                  <option key={v} value={v} className="bg-slate-900">
                    {v}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      <form onSubmit={handleSearchSubmit} className="flex-1 max-w-sm hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Plate or camera ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-600 font-mono"
          />
        </div>
      </form>

      <div className="flex items-center gap-2">
        {/* Quantum QPU Coprocessor Status Pill */}
        <div className="hidden xl:flex items-center gap-1.5 bg-indigo-950/70 border border-indigo-500/40 rounded-lg px-2.5 py-1 text-[11px] font-mono text-indigo-300">
          <Atom className="w-3.5 h-3.5 text-indigo-400 animate-spin [animation-duration:8s]" />
          <span>QPU 128-Qubit: Coherent</span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 px-2">
          <span
            className={`w-2 h-2 rounded-full ${connection?.connected ? 'bg-emerald-500' : 'bg-slate-600'}`}
            title={connection?.message || 'Gateway'}
          />
          <span className="hidden lg:inline">{connection?.connected ? 'Live' : 'Offline'}</span>
        </div>

        <button
          type="button"
          onClick={onOpenAlerts}
          className="relative p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
          title="Alerts"
        >
          <Bell className="w-4 h-4" />
          {activeAlertCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] text-white font-bold flex items-center justify-center">
              {activeAlertCount}
            </span>
          )}
        </button>

        <div className="hidden sm:flex items-center gap-1 text-xs font-mono text-slate-400">
          <Clock className="w-3.5 h-3.5" />
          {timeStr}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300"
            aria-label="More"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-50">
              <button
                type="button"
                onClick={() => {
                  onTogglePrivacyMask();
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-lg"
              >
                {privacyMaskEnabled ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                {privacyMaskEnabled ? 'Unmask plates' : 'Privacy mask'}
              </button>
              <button
                type="button"
                onClick={() => {
                  audioAlertService.toggleMute();
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-lg"
              >
                {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                {isAudioMuted ? 'Unmute alerts' : 'Mute alerts'}
              </button>
              {onOpenMobileQr && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenMobileQr();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-lg"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  Mobile QR
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
