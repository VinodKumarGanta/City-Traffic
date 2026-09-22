import React, { useState } from 'react';
import { RefreshCw, QrCode, ExternalLink, Check, Copy } from 'lucide-react';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  label?: string;
  subLabel?: string;
  className?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  size = 180,
  label,
  subLabel,
  className = ''
}) => {
  const [useFallback, setUseFallback] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Primary: Live local Python AI Gateway QR generator
  const primaryQrUrl = `http://localhost:5001/api/qrcode?data=${encodeURIComponent(value)}&format=png`;
  // Fallback: Public QR API if local server is starting
  const fallbackQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&margin=10`;

  const activeUrl = useFallback ? fallbackQrUrl : primaryQrUrl;

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div 
        className="relative bg-white p-3 rounded-2xl shadow-xl border border-slate-200 flex items-center justify-center transition-transform hover:scale-[1.02]"
        style={{ width: size + 24, height: size + 24 }}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-white/90 rounded-2xl flex flex-col items-center justify-center z-10 space-y-1">
            <RefreshCw className="w-6 h-6 text-cyan-600 animate-spin" />
            <span className="text-[10px] font-mono text-slate-600 font-bold">Encoding QR...</span>
          </div>
        )}

        <img
          src={activeUrl}
          alt={`QR Code: ${value}`}
          width={size}
          height={size}
          className="rounded-lg object-contain"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            if (!useFallback) {
              setUseFallback(true);
            } else {
              setIsLoading(false);
            }
          }}
        />
      </div>

      {label && (
        <div className="mt-2.5 text-center space-y-0.5">
          <div className="text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 font-mono">
            <QrCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>{label}</span>
          </div>
          {subLabel && (
            <p className="text-[10px] text-slate-400 font-mono">{subLabel}</p>
          )}
        </div>
      )}

      {/* Quick Action bar */}
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-mono font-semibold flex items-center gap-1 transition-colors border border-slate-700"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy Value'}</span>
        </button>

        {value.startsWith('http') && (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 text-[10px] font-mono font-semibold flex items-center gap-1 transition-colors border border-slate-700"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Test Link</span>
          </a>
        )}
      </div>
    </div>
  );
};
