import React from 'react';

const HORIZONS = [5, 10, 15];

export const HorizonSlider: React.FC<{
  value: number;
  onChange: (minutes: number) => void;
}> = ({ value, onChange }) => (
  <div className="flex items-center gap-2">
    <span className="text-[11px] font-mono text-slate-400">Horizon</span>
    <input
      type="range"
      min={0}
      max={2}
      step={1}
      value={Math.max(0, HORIZONS.indexOf(value))}
      onChange={(e) => onChange(HORIZONS[Number(e.target.value)] ?? 10)}
      className="w-28 accent-amber-500"
      aria-label="Forecast horizon"
    />
    <div className="flex gap-1">
      {HORIZONS.map((min) => (
        <button
          key={min}
          type="button"
          onClick={() => onChange(min)}
          className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold ${
            value === min ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          +{min}m
        </button>
      ))}
    </div>
  </div>
);
