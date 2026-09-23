import React, { useState, useEffect } from 'react';
import { 
  Atom, 
  Cpu, 
  Zap, 
  TrendingDown, 
  Activity, 
  CheckCircle2, 
  Play, 
  RefreshCw, 
  ShieldCheck, 
  Sparkles, 
  Compass, 
  Layers, 
  ArrowRight,
  Clock,
  Fuel,
  Leaf
} from 'lucide-react';
import { quantumService } from '../services/quantumService';
import { 
  QuantumQpuStatus, 
  QuantumOptimizationResult, 
  QuantumPredictionResult 
} from '../types/traffic';

export const QuantumOptimizationView: React.FC = () => {
  const [qpuStatus, setQpuStatus] = useState<QuantumQpuStatus | null>(null);
  const [selectedCorridor, setSelectedCorridor] = useState('CORR-AP-VJA01');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optResult, setOptResult] = useState<QuantumOptimizationResult | null>(null);
  const [qmlPrediction, setQmlPrediction] = useState<QuantumPredictionResult | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  const CORRIDORS = [
    { id: 'CORR-AP-VJA01', name: 'Vijayawada MG Road Expressway', junctions: 5 },
    { id: 'CORR-AP-AMR01', name: 'Amaravati Capital Transit Arterial', junctions: 4 },
    { id: 'CORR-TG-HYD01', name: 'Hyderabad Financial District Corridor', junctions: 6 },
    { id: 'CORR-AP-VZG01', name: 'Visakhapatnam Coastal IT Highway', junctions: 5 }
  ];

  // Load Initial Status & Default Optimization
  useEffect(() => {
    quantumService.getStatus().then(status => setQpuStatus(status));
    runOptimization('CORR-AP-VJA01');
    quantumService.predictCongestion({ speed: 28.5, density: 82.0, inflow: 1100.0 }).then(pred => setQmlPrediction(pred));
  }, []);

  const runOptimization = async (corridorId: string) => {
    setIsOptimizing(true);
    setStepIndex(0);
    try {
      const result = await quantumService.optimizeCorridor(corridorId);
      setOptResult(result);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Animated sweep across nodes
  useEffect(() => {
    if (!optResult?.nodes?.length) return;
    const interval = setInterval(() => {
      setStepIndex(prev => (prev + 1) % optResult.nodes.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [optResult]);

  return (
    <div className="p-4 space-y-4 max-w-[1920px] mx-auto text-slate-100">
      {/* Top Quantum Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/40 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-3.5 z-10">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-400/50 flex items-center justify-center text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
            <Atom className="w-6 h-6 animate-spin [animation-duration:12s]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>QUANTUM TRAFFIC OPTIMIZATION & ACCURACY ENGINE</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                QAOA / SQA v3.1
              </span>
            </h2>
            <p className="text-xs text-slate-300">
              Ising Spin QUBO Formulation & Variational Quantum Eigensolver for Urban Arterial Synchronization
            </p>
          </div>
        </div>

        {/* QPU Hardware State Pill */}
        <div className="flex items-center gap-3 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 z-10 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            <span className="font-bold text-white">{qpuStatus?.qpu_name || 'QPU-Helios-128'}</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="text-slate-300">
            Gate Fidelity: <strong className="text-cyan-400">{qpuStatus?.gate_fidelity_percent || 99.85}%</strong>
          </div>
          <span className="text-slate-600">|</span>
          <div className="text-slate-300">
            Qubits: <strong className="text-indigo-400">{qpuStatus?.logical_qubits_active || 128} Active</strong>
          </div>
        </div>
      </div>

      {/* Corridor Selector & Execution Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-2 overflow-x-auto select-none py-1">
          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider shrink-0 pr-1">
            Arterial Corridors:
          </span>
          {CORRIDORS.map(c => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCorridor(c.id);
                runOptimization(c.id);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border shrink-0 ${
                selectedCorridor === c.id
                  ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-950'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {c.name} ({c.junctions} Junc)
            </button>
          ))}
        </div>

        <button
          onClick={() => runOptimization(selectedCorridor)}
          disabled={isOptimizing}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-slate-950 font-bold text-xs font-mono transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-2 disabled:opacity-50"
        >
          {isOptimizing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Simulating Quantum Annealing...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Execute QAOA Quantum Annealing</span>
            </>
          )}
        </button>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: KPI Metric Strip & Energy Decay Graph (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Key Optimization Impact KPI Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-xl">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Latency Reduction</span>
                <TrendingDown className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
                -{optResult?.summary.latencyImprovementPercent || 39.2}%
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-1">
                Classical: <span className="line-through">{optResult?.summary.classicalAvgDelaySec || 61.0}s</span> → <strong className="text-white">{optResult?.summary.quantumAvgDelaySec || 37.1}s</strong>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-xl">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Green Wave Bandwidth</span>
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black font-mono text-amber-400 mt-1">
                {optResult?.summary.greenWaveBandwidthPercent || 94.2}%
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-1">
                Continuous Platoon Flow Synchronized
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-xl">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Fuel Conserved</span>
                <Fuel className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-black font-mono text-cyan-400 mt-1">
                {optResult?.summary.estimatedFuelSavedLitersPerHour || 74.5} <span className="text-xs font-normal">L/hr</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-1">
                Eliminated Stop-and-Go Cycles
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-xl">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>CO₂ Cut</span>
                <Leaf className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
                {optResult?.summary.co2EmissionReductionKgPerHour || 172.4} <span className="text-xs font-normal">kg/hr</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-1">
                Direct Tailpipe Emissions Avoided
              </div>
            </div>
          </div>

          {/* Hamiltonian Ground-State Energy Decay Curve */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Activity className="w-4 h-4 text-indigo-400" />
                <span>Ising Hamiltonian Ground-State Energy Curve (ΔE → E₀)</span>
              </div>
              <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/30">
                E₀ = {optResult?.groundStateEnergy || -6.482}
              </span>
            </div>

            <div className="h-36 flex items-end gap-1.5 pt-4 px-2 bg-slate-950/80 rounded-lg border border-slate-800">
              {optResult?.energyHistory?.map((val, idx) => {
                const minVal = -7.5;
                const maxVal = 2.0;
                const heightPercent = Math.max(10, Math.min(100, ((maxVal - val) / (maxVal - minVal)) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t transition-all ${
                        idx === optResult.energyHistory.length - 1
                          ? 'bg-gradient-to-t from-indigo-600 to-cyan-400 shadow-[0_0_10px_rgba(99,102,241,0.8)]'
                          : 'bg-indigo-900/60 group-hover:bg-indigo-700'
                      }`}
                    />
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-7 text-[9px] font-mono bg-slate-900 px-1 py-0.5 rounded border border-slate-700 pointer-events-none z-20">
                      Step {idx+1}: {val}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>Step 0 (Random Spin Superposition)</span>
              <span>Step 40 (Quantum Ground State Reached)</span>
            </div>
          </div>

          {/* Quantum Machine Learning Hilbert Space State Card */}
          {qmlPrediction && (
            <div className="bg-gradient-to-b from-slate-900 to-indigo-950/30 border border-indigo-500/30 rounded-xl p-4 space-y-2.5 shadow-xl">
              <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
                <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  QML Variational State Fidelity (8-Qubit Hilbert Space)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  +{qmlPrediction.quantumAccuracyBoostPercent}% Accuracy Gain
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400">Quantum State Fidelity:</div>
                  <div className="text-base font-bold text-cyan-400 mt-0.5">
                    {qmlPrediction.blochSphere.stateFidelityPercent}%
                  </div>
                </div>
                <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400">Bloch Coordinates:</div>
                  <div className="text-xs font-bold text-indigo-300 mt-0.5">
                    θ: {qmlPrediction.blochSphere.polarAngleThetaRad} | φ: {qmlPrediction.blochSphere.azimuthalAnglePhiRad}
                  </div>
                </div>
              </div>

              <p className="text-[11px] font-mono text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 leading-relaxed">
                💡 <strong>Quantum Policy:</strong> {qmlPrediction.quantumRecommendation}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Intersections & Qubit Allocation Table (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  Corridor Intersections Qubit Assignment & Phase Splits
                </h3>
                <p className="text-[11px] font-mono text-slate-400">
                  Transverse Field Annealing optimized timing against classical Webster cycle
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Nodes: <strong className="text-cyan-400">{optResult?.nodes?.length || 0}</strong>
              </span>
            </div>

            <div className="space-y-2.5">
              {optResult?.nodes?.map((node, idx) => {
                const isActive = idx === stepIndex;
                return (
                  <div
                    key={node.intersectionId}
                    className={`p-3 rounded-xl border text-xs transition-all ${
                      isActive
                        ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg ring-1 ring-indigo-500/30'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                          {node.qubitAssigned}
                        </span>
                        <span className="font-bold text-white text-sm">{node.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">({node.intersectionId})</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          node.groundStateSpin > 0
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        }`}>
                          Spin: {node.groundStateSpin > 0 ? '↑ (+1)' : '↓ (-1)'}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/40">
                          -{node.delayReductionPercent}% Delay
                        </span>
                      </div>
                    </div>

                    {/* Split & Timing Comparison Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2.5 pt-2 border-t border-slate-800/80 font-mono text-[11px]">
                      <div className="bg-slate-900/80 p-2 rounded-lg">
                        <div className="text-slate-400 text-[10px]">Green Phase Split:</div>
                        <div className="mt-0.5 flex items-baseline gap-1.5">
                          <span className="text-slate-400 line-through">{node.classicalGreenSec}s</span>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <strong className="text-indigo-400 text-sm">{node.quantumGreenSec}s (Quantum)</strong>
                        </div>
                      </div>

                      <div className="bg-slate-900/80 p-2 rounded-lg">
                        <div className="text-slate-400 text-[10px]">Per-Vehicle Wait Delay:</div>
                        <div className="mt-0.5 flex items-baseline gap-1.5">
                          <span className="text-slate-400 line-through">{node.classicalDelaySec}s</span>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <strong className="text-emerald-400 text-sm">{node.quantumDelaySec}s</strong>
                        </div>
                      </div>

                      <div className="bg-slate-900/80 p-2 rounded-lg">
                        <div className="text-slate-400 text-[10px]">Green Wave Offset:</div>
                        <div className="mt-0.5 flex items-baseline gap-1.5">
                          <strong className="text-amber-400 text-sm">+{node.greenWaveOffsetSec}s Coordinated</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
