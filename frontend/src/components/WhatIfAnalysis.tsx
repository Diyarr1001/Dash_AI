import { useState, useMemo } from 'react';
import { TrendingUp, Zap, ArrowRight } from 'lucide-react';

interface WhatIfAnalysisProps {
  data: any[];
  metrics: string[];
}

export const WhatIfAnalysis = ({ data, metrics }: WhatIfAnalysisProps) => {
  const [multiplier, setMultiplier] = useState(1.1); // 10% increase default
  const [selectedMetric, setSelectedMetric] = useState(metrics[0] || '');

  const stats = useMemo(() => {
    if (!selectedMetric || !data.length) return null;

    const currentTotal = data.reduce((sum, row) => sum + (parseFloat(row[selectedMetric]) || 0), 0);
    const projectedTotal = currentTotal * multiplier;
    const difference = projectedTotal - currentTotal;

    return {
      current: currentTotal,
      projected: projectedTotal,
      diff: difference,
      percent: ((multiplier - 1) * 100).toFixed(1)
    };
  }, [data, selectedMetric, multiplier]);

  return (
    <div className="glass rounded-3xl p-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
          <Zap size={20} className="text-amber-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">What-If Modeling</h3>
          <p className="text-sm text-slate-500">Simulate scenarios by adjusting key variables</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Controls */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Metric</label>
            <select 
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium outline-none focus:ring-2 focus:ring-primary/20"
            >
              {metrics.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Adjustment Multiplier</label>
              <span className="text-lg font-bold text-primary">{stats?.percent}%</span>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="2.0" 
              step="0.01"
              value={multiplier}
              onChange={(e) => setMultiplier(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
              <span>-50%</span>
              <span>Baseline</span>
              <span>+100%</span>
            </div>
          </div>
        </div>

        {/* Impact Cards */}
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-slate-900 rounded-[2rem] p-6 text-white space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <TrendingUp size={80} />
            </div>
            <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest">Projected Impact</p>
            <div className="flex items-center gap-4">
              <div className="text-3xl font-display font-bold">
                {stats?.projected.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className="flex items-center gap-1 bg-green-500/20 text-green-400 px-2 py-1 rounded-lg text-xs font-bold">
                <TrendingUp size={12} />
                +{stats?.diff.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <span>Current: {stats?.current.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              <ArrowRight size={14} />
              <span className="text-white">Goal</span>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">Strategic Insight</p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Increasing {selectedMetric} by {stats?.percent}% would result in a total value of {stats?.projected.toLocaleString()}. 
              This simulation assumes a linear correlation across all segments.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
