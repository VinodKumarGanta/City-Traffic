import React, { useState, useEffect } from 'react';
import { 
  X, 
  Smartphone, 
  QrCode, 
  Copy, 
  Check, 
  Wifi, 
  ExternalLink, 
  Navigation,
  Edit2
} from 'lucide-react';
import { audioAlertService } from '../../services/audioAlertService';
import { QRCodeDisplay } from './QRCodeDisplay';
import { getApiBaseUrl } from '../../services/apiConfig';

interface MobileAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileAccessModal: React.FC<MobileAccessModalProps> = ({ isOpen, onClose }) => {
  const [selectedMode, setSelectedMode] = useState<'citizen' | 'mobile' | 'challan'>('citizen');
  const [copied, setCopied] = useState(false);
  const [lanIp, setLanIp] = useState<string>('');
  const [isEditingIp, setIsEditingIp] = useState(false);

  // Auto-detect server's Wi-Fi / LAN IP from backend
  useEffect(() => {
    let isMounted = true;
    fetch(`${getApiBaseUrl()}/api/system/network-info`)
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (data && data.lan_ip && data.lan_ip !== '127.0.0.1') {
          setLanIp(data.lan_ip);
        }
      })
      .catch(() => {
        // Fallback to window location hostname if backend is not responding
      });
    return () => { isMounted = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  // Determine host URL (prioritizes detected Wi-Fi IP so phones can connect)
  const host = lanIp || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? window.location.hostname : '127.0.0.1');
  const port = typeof window !== 'undefined' ? window.location.port || '5173' : '5173';
  const targetUrl = `http://${host}:${port}/#${selectedMode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    audioAlertService.playChime();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Live Mobile Companion Scanner</h3>
              <p className="text-[11px] text-slate-400 font-mono">Real-time QR barcode over Wi-Fi LAN</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Selection Tabs */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setSelectedMode('citizen')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
              selectedMode === 'citizen' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Citizen Hub
          </button>
          <button
            onClick={() => setSelectedMode('mobile')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
              selectedMode === 'mobile' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Field Police
          </button>
          <button
            onClick={() => setSelectedMode('challan')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
              selectedMode === 'challan' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            E-Challans
          </button>
        </div>

        {/* Real Scannable QR Code */}
        <div className="py-2 flex flex-col items-center justify-center">
          <QRCodeDisplay
            value={targetUrl}
            size={180}
            label="Scan with Phone Camera or Google Lens"
            subLabel={`Directs phone to: ${selectedMode.toUpperCase()} VIEW`}
          />
        </div>

        {/* IP & URL Customizer Box */}
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
          <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Wifi className="w-3 h-3 text-cyan-400" />
              <span>Target Wi-Fi Address:</span>
            </span>
            <button
              onClick={() => setIsEditingIp(!isEditingIp)}
              className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
            >
              <Edit2 className="w-2.5 h-2.5" />
              <span>{isEditingIp ? 'Lock IP' : 'Change IP'}</span>
            </button>
          </div>

          {isEditingIp ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. 192.168.1.35"
                value={lanIp}
                onChange={(e) => setLanIp(e.target.value.trim())}
                className="w-full bg-slate-900 border border-cyan-500 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={targetUrl}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 font-mono focus:outline-none truncate select-all"
              />
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs font-mono flex items-center gap-1 transition-colors shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}
        </div>

        <div className="text-[10px] text-slate-500 text-center font-mono">
          Ensure your smartphone is connected to the same Wi-Fi network.
        </div>
      </div>
    </div>
  );
};
