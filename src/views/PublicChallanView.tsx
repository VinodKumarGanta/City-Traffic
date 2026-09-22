import React, { useState } from 'react';
import { 
  Search, 
  CreditCard, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  Camera, 
  MapPin, 
  Clock, 
  Gauge, 
  Download, 
  ShieldAlert, 
  HelpCircle,
  X,
  ExternalLink,
  Receipt,
  QrCode,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { EChallanRecord } from '../types/traffic';
import { audioAlertService } from '../services/audioAlertService';
import { QRCodeDisplay } from '../components/common/QRCodeDisplay';

interface PublicChallanViewProps {
  challans: EChallanRecord[];
  onPayChallan: (challanId: string, txnId: string) => void;
  onDisputeChallan: (challanId: string, reason: string) => void;
}

export const PublicChallanView: React.FC<PublicChallanViewProps> = ({
  challans,
  onPayChallan,
  onDisputeChallan
}) => {
  const samplePlates = Array.from(new Set(challans.map(c => c.plateNumber.toUpperCase())));
  const [searchPlate, setSearchPlate] = useState(samplePlates[0] || 'TS07JH4821');
  const [searchedQuery, setSearchedQuery] = useState(samplePlates[0] || 'TS07JH4821');
  const [selectedChallanForPay, setSelectedChallanForPay] = useState<EChallanRecord | null>(null);
  const [disputeModalChallan, setDisputeModalChallan] = useState<EChallanRecord | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  React.useEffect(() => {
    if (samplePlates.length > 0 && !samplePlates.includes(searchedQuery)) {
      setSearchPlate(samplePlates[0]);
      setSearchedQuery(samplePlates[0]);
    }
  }, [challans]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchedQuery(searchPlate.trim().toUpperCase());
    audioAlertService.playChime();
  };

  const handleQuickSelect = (plate: string) => {
    setSearchPlate(plate);
    setSearchedQuery(plate);
    audioAlertService.playChime();
  };

  const matchedChallans = challans.filter(
    c => c.plateNumber.toUpperCase() === searchedQuery.toUpperCase()
  );

  const totalPendingAmount = matchedChallans
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + c.fineAmountInr, 0);

  const handleConfirmPayment = () => {
    if (!selectedChallanForPay) return;
    setIsProcessingPayment(true);

    setTimeout(() => {
      const txnId = `TXN-UPI-${Math.floor(100000000 + Math.random() * 900000000)}`;
      onPayChallan(selectedChallanForPay.id, txnId);
      setIsProcessingPayment(false);
      setPaymentSuccess(`Payment of ₹${selectedChallanForPay.fineAmountInr} Successful! Ref: ${txnId}`);
      setSelectedChallanForPay(null);

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // Fallback
      }

      audioAlertService.playChime();
      audioAlertService.speakAlert('Traffic fine payment successful. Receipt generated.');

      setTimeout(() => setPaymentSuccess(null), 5000);
    }, 1200);
  };

  const handleSubmitDispute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeModalChallan || !disputeReason.trim()) return;
    onDisputeChallan(disputeModalChallan.id, disputeReason.trim());
    audioAlertService.playChime();
    setDisputeModalChallan(null);
    setDisputeReason('');
  };

  return (
    <div className="p-4 space-y-5 max-w-[1920px] mx-auto text-slate-100 font-sans">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/30 border border-slate-800 p-5 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-bold tracking-wider uppercase">
                Citizen Self-Service
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                MoRTH & AP Police Traffic e-Challan Integration
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Public E-Challan & ANPR Evidence Portal</span>
              <Receipt className="w-5 h-5 text-cyan-400" />
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl">
              Inspect automated camera violation evidence, speed radar telemetry, and settle or challenge traffic fines securely.
            </p>
          </div>

          <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-950/80 border border-red-500/40 flex items-center justify-center text-red-400">
              <CreditCard className="w-4 h-4" />
            </div>
            <div className="text-right font-mono">
              <div className="text-[10px] text-slate-400">Total Pending Fines</div>
              <div className="text-base font-bold text-red-400">₹{totalPendingAmount.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {paymentSuccess && (
        <div className="p-4 bg-emerald-950/90 border border-emerald-500/50 rounded-2xl text-xs text-emerald-300 flex items-center justify-between shadow-xl animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-mono font-bold">{paymentSuccess}</span>
          </div>
          <button 
            onClick={() => setPaymentSuccess(null)}
            className="p-1 text-emerald-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Plate Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Enter vehicle registration number (e.g. AP16TY9988, TS07JH4821)..."
              value={searchPlate}
              onChange={(e) => setSearchPlate(e.target.value.toUpperCase())}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white font-mono uppercase tracking-wider focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-slate-600"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs font-mono flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/60 transition-colors"
          >
            <Search className="w-4 h-4" />
            <span>Search Challans</span>
          </button>
        </form>

        {/* Quick Demo Test Plates */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-slate-500 font-mono text-[11px]">Quick Demo Test Plates:</span>
          {samplePlates.map(plate => (
            <button
              key={plate}
              onClick={() => handleQuickSelect(plate)}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] border transition-all ${
                searchedQuery === plate
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {plate}
            </button>
          ))}
        </div>
      </div>

      {/* Results Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Violations for Registration:</span>
              <span className="text-cyan-400 font-mono text-base px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                {searchedQuery}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Found {matchedChallans.length} camera detection records in state surveillance archives
            </p>
          </div>

          <div className="text-xs font-mono text-slate-400">
            Status: <span className="text-emerald-400 font-bold">ANPR OCR Verified</span>
          </div>
        </div>

        {matchedChallans.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h4 className="text-base font-bold text-white">No Active Challans Found!</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Vehicle <strong className="text-white font-mono">{searchedQuery}</strong> has a clean driving record with zero unpaid automated camera infractions.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {matchedChallans.map((challan) => {
              const isPaid = challan.status === 'paid';
              const isDisputed = challan.status === 'disputed';
              const isPending = challan.status === 'pending';

              return (
                <div
                  key={challan.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Card Top Row */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <div className="text-[10px] font-mono text-slate-400">Challan Ref Number</div>
                        <div className="text-xs font-bold font-mono text-cyan-400">{challan.challanNumber}</div>
                      </div>

                      <div className="text-right">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase border ${
                          isPaid 
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : isDisputed
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse'
                        }`}>
                          {challan.status}
                        </span>
                      </div>
                    </div>

                    {/* Simulated High-Res ANPR Camera Snapshot */}
                    <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 h-40 flex items-center justify-center group">
                      {/* Grid background simulation */}
                      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:12px_12px] opacity-60"></div>
                      
                      {/* Bounding Box on Car Evidence */}
                      <div className="relative z-10 w-48 h-28 border-2 border-cyan-400/80 rounded-lg flex flex-col justify-between p-2 bg-slate-900/60 backdrop-blur-[1px] shadow-lg">
                        <div className="flex justify-between items-center text-[9px] font-mono text-cyan-300">
                          <span>{challan.cameraId}</span>
                          <span className="bg-red-600/80 text-white px-1 py-0.2 rounded font-bold">
                            {challan.violationType}
                          </span>
                        </div>

                        {/* License Plate STN Badge */}
                        <div className="mx-auto px-2.5 py-1 bg-white text-slate-950 font-black font-mono tracking-widest text-xs rounded border border-slate-300 shadow-md">
                          {challan.plateNumber}
                        </div>

                        <div className="flex justify-between items-center text-[9px] font-mono text-slate-400">
                          <span>CONF: 99.4%</span>
                          {challan.recordedSpeedKmh && (
                            <span className="text-red-400 font-bold">{challan.recordedSpeedKmh} KM/H</span>
                          )}
                        </div>
                      </div>

                      {/* Overlay Watermark */}
                      <div className="absolute bottom-2 left-3 text-[9px] font-mono text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                        ANPR OCR EVIDENTIAL ARCHIVE - STN TRANSFORMED
                      </div>
                    </div>

                    {/* Violation Telemetry Details */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-0.5">
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-cyan-400" />
                          <span>Location</span>
                        </div>
                        <div className="text-slate-200 text-[11px] line-clamp-1">{challan.locationName}</div>
                      </div>

                      <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-0.5">
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          <span>Timestamp</span>
                        </div>
                        <div className="text-slate-200 text-[11px]">{challan.timestamp}</div>
                      </div>

                      {challan.recordedSpeedKmh && (
                        <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-0.5">
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Gauge className="w-3 h-3 text-red-400" />
                            <span>Recorded Speed</span>
                          </div>
                          <div className="text-red-400 font-bold">
                            {challan.recordedSpeedKmh} km/h (Limit: {challan.speedLimitKmh} km/h)
                          </div>
                        </div>
                      )}

                      <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-0.5">
                        <div className="text-[10px] text-slate-500">Penalty Amount</div>
                        <div className="text-sm font-bold text-white">₹{challan.fineAmountInr.toLocaleString()}</div>
                      </div>
                    </div>

                    {isPaid && (
                      <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-[11px] font-mono text-emerald-300 flex items-center justify-between">
                        <span>Paid on {challan.paidAt}</span>
                        <span className="text-[10px] text-slate-400">{challan.paymentTxnId}</span>
                      </div>
                    )}

                    {isDisputed && (
                      <div className="p-2.5 bg-amber-950/40 border border-amber-500/30 rounded-xl text-[11px] font-mono text-amber-300 space-y-1">
                        <div className="font-bold flex items-center gap-1">
                          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                          <span>Appeal Under Review</span>
                        </div>
                        <div className="text-[10px] text-slate-400">{challan.disputeReason}</div>
                      </div>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                    {isPending ? (
                      <>
                        <button
                          onClick={() => setDisputeModalChallan(challan)}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                        >
                          Dispute Violation
                        </button>
                        <button
                          onClick={() => setSelectedChallanForPay(challan)}
                          className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 transition-colors"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Pay Fine ₹{challan.fineAmountInr}</span>
                        </button>
                      </>
                    ) : (
                      <div className="w-full flex justify-between items-center">
                        <span className="text-[11px] text-slate-400 font-mono">Receipt ready for compliance</span>
                        <button
                          onClick={() => {
                            audioAlertService.playChime();
                            alert(`Receipt downloaded for ${challan.challanNumber}`);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {selectedChallanForPay && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Instant UPI & Card Fine Settlement</h3>
              </div>
              <button 
                onClick={() => setSelectedChallanForPay(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 font-mono text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Vehicle Plate:</span>
                <span className="text-white font-bold">{selectedChallanForPay.plateNumber}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Violation:</span>
                <span className="text-red-400">{selectedChallanForPay.violationType}</span>
              </div>
              <div className="flex justify-between text-slate-400 border-t border-slate-800 pt-2 text-sm">
                <span>Total Amount:</span>
                <span className="text-emerald-400 font-bold">₹{selectedChallanForPay.fineAmountInr}</span>
              </div>
            </div>

            {/* Real UPI Payment QR */}
            <div className="py-1 flex flex-col items-center justify-center">
              <QRCodeDisplay
                value={`upi://pay?pa=trafficpolice@sbi&pn=Traffic+Police+Department&mc=9399&am=${selectedChallanForPay.fineAmountInr}&cu=INR&tn=Challan-${selectedChallanForPay.challanNumber}`}
                size={140}
                label="UPI / BharatQR Instant Settle"
                subLabel="Scan with Google Pay, PhonePe, Paytm, or BHIM"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedChallanForPay(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={handleConfirmPayment}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono flex items-center gap-1.5 shadow-lg shadow-emerald-950/60"
              >
                {isProcessingPayment ? 'Processing...' : `Simulate Pay ₹${selectedChallanForPay.fineAmountInr}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {disputeModalChallan && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <form onSubmit={handleSubmitDispute} className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Dispute & Contest Violation</h3>
              </div>
              <button 
                type="button"
                onClick={() => setDisputeModalChallan(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              If your vehicle plate was cloned, vehicle was sold, or radar reading was in error, submit an appeal for human operator audit.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Reason for Dispute *</label>
              <textarea
                required
                rows={3}
                placeholder="e.g. My car was in Vijayawada workshop at this time; suspect cloned plate..."
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDisputeModalChallan(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-950/60"
              >
                Submit Appeal
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
