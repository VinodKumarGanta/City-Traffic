import React, { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  MapPin, 
  Camera, 
  Navigation, 
  CheckCircle2, 
  Car, 
  Droplets, 
  Flame, 
  ShieldAlert, 
  Upload,
  Copy,
  Check
} from 'lucide-react';
import { CitizenReport, CitizenReportCategory } from '../../types/traffic';
import { audioAlertService } from '../../services/audioAlertService';

interface CitizenIncidentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitReport: (report: CitizenReport) => void;
  defaultCity?: string;
}

export const CitizenIncidentReportModal: React.FC<CitizenIncidentReportModalProps> = ({
  isOpen,
  onClose,
  onSubmitReport,
  defaultCity = 'Vijayawada'
}) => {
  const [category, setCategory] = useState<CitizenReportCategory>('accident');
  const [title, setTitle] = useState('');
  const [locationName, setLocationName] = useState(defaultCity ? `${defaultCity} Corridor` : '');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState<number>(16.5002);
  const [lng, setLng] = useState<number>(80.6477);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'acquiring' | 'acquired' | 'denied'>('idle');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [reporterName, setReporterName] = useState('');
  const [submittedReport, setSubmittedReport] = useState<CitizenReport | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  if (!isOpen) return null;

  const categories: { id: CitizenReportCategory; label: string; icon: any; color: string }[] = [
    { id: 'accident', label: 'Accident / Collision', icon: AlertTriangle, color: 'text-red-400 border-red-500/40 bg-red-950/40' },
    { id: 'stalled_vehicle', label: 'Stalled / Breakdown', icon: Car, color: 'text-amber-400 border-amber-500/40 bg-amber-950/40' },
    { id: 'waterlogging', label: 'Waterlogging / Flood', icon: Droplets, color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40' },
    { id: 'signal_failure', label: 'Signal Failure', icon: Flame, color: 'text-yellow-400 border-yellow-500/40 bg-yellow-950/40' },
    { id: 'severe_pothole', label: 'Severe Pothole', icon: ShieldAlert, color: 'text-orange-400 border-orange-500/40 bg-orange-950/40' },
  ];

  const handleAcquireGPS = () => {
    if (!('geolocation' in navigator)) {
      setGpsStatus('denied');
      return;
    }
    setGpsStatus('acquiring');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(Number(pos.coords.latitude.toFixed(5)));
        setLng(Number(pos.coords.longitude.toFixed(5)));
        setGpsStatus('acquired');
        if (!locationName || locationName.includes('Corridor')) {
          setLocationName(`GPS Location (${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)})`);
        }
      },
      (err) => {
        console.warn('Geolocation failed or denied, using AP junction defaults:', err.message);
        setGpsStatus('denied');
        // Default to Vijayawada Benz Circle coords if denied
        setLat(16.5002);
        setLng(80.6477);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const token = `CIT-AP-${Math.floor(1000 + Math.random() * 9000)}`;
    const newReport: CitizenReport = {
      id: `CIT-${Date.now()}`,
      trackingId: token,
      timestamp: 'Just now',
      category,
      title: title.trim() || `${category.replace('_', ' ').toUpperCase()} Reported`,
      description: description.trim() || 'Citizen reported live hazard on arterial corridor.',
      locationName: locationName.trim() || 'Andhra Pradesh Arterial Road',
      lat,
      lng,
      photoUrl: photoPreview || undefined,
      status: 'reported',
      votes: 1,
      reportedBy: reporterName.trim() || 'Verified Citizen'
    };

    audioAlertService.playChime();
    audioAlertService.speakAlert(`Citizen incident reported at ${newReport.locationName}`);
    onSubmitReport(newReport);
    setSubmittedReport(newReport);
  };

  const handleCopyToken = () => {
    if (submittedReport) {
      navigator.clipboard.writeText(submittedReport.trackingId);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-950/80 border border-red-500/50 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Citizen Incident & Hazard Reporter</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  LIVE CROWDSOURCED
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Report live road blockage, waterlogging, or accidents</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
          {submittedReport ? (
            /* Success View */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Incident Dispatched to Command Center!</h4>
                <p className="text-slate-400 text-xs max-w-sm mx-auto">
                  Your report has been broadcast to traffic police units and mapped in real-time.
                </p>
              </div>

              {/* Tracking Token Card */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl max-w-xs mx-auto flex items-center justify-between font-mono">
                <div className="text-left">
                  <div className="text-[10px] text-slate-500">Tracking Reference:</div>
                  <div className="text-sm font-bold text-cyan-400">{submittedReport.trackingId}</div>
                </div>
                <button
                  onClick={handleCopyToken}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 text-[11px] transition-colors"
                >
                  {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedToken ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-900/50 transition-colors"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          ) : (
            /* Report Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category Pills */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Select Incident Category *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        className={`p-2.5 rounded-xl border text-left flex flex-col gap-1.5 transition-all ${
                          isSelected
                            ? `${cat.color} ring-1 ring-cyan-500 text-white shadow-md`
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[11px] font-bold leading-tight">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title & Location */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Incident Title / Summary *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stalled truck blocking left lane on Benz Circle flyover"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-300">
                      Location / Road Landmark *
                    </label>
                    <button
                      type="button"
                      onClick={handleAcquireGPS}
                      className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      <Navigation className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
                      <span>{gpsStatus === 'acquiring' ? 'Detecting GPS...' : 'Use My Current GPS'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Benz Circle Flyover, Vijayawada"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  {gpsStatus === 'acquired' && (
                    <div className="mt-1 text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      GPS Locked: {lat.toFixed(4)}, {lng.toFixed(4)}
                    </div>
                  )}
                  {gpsStatus === 'denied' && (
                    <div className="mt-1 text-[10px] font-mono text-amber-400">
                      GPS permission off. Defaulted to Andhra Pradesh junction coordinates.
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Detailed Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe lane blockage, severity, injuries, or suggested diversions..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
                  />
                </div>
              </div>

              {/* Photo Evidence Upload */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                  Attach Photo Evidence (Optional)
                </label>
                {photoPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-black/40 h-32 flex items-center justify-center">
                    <img src={photoPreview} alt="Incident preview" className="h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setPhotoPreview(null)}
                      className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="border border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-950 hover:bg-slate-900/60 transition-colors">
                    <Camera className="w-5 h-5 text-slate-400" />
                    <span className="text-[11px] text-slate-400">Click to upload photo from camera or gallery</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Reporter details */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Your Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. S. Sharma"
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Confidentiality</label>
                  <div className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Anonymous & Secure
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-red-950/60 transition-colors"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Broadcast Report</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
