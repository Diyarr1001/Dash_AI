import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { ChartContainer } from './ChartContainer';
import { TrendingUp, Calendar, Loader2, RefreshCw, RotateCcw } from 'lucide-react';

interface ForecastViewProps {
  tableName: string;
  columns: any[];
}

export const ForecastView = ({ tableName, columns }: ForecastViewProps) => {
  const [selectedMetric, setSelectedMetric] = useState('');
  const [timeColumn, setTimeColumn] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [forecastData, setForecastData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch available years when time column is selected
  useEffect(() => {
    const fetchYears = async () => {
      if (!timeColumn) return;
      try {
        const response = await api.post('/query/execute', {
          sql: `SELECT DISTINCT EXTRACT(YEAR FROM "${timeColumn}") as yr FROM ${tableName} ORDER BY yr`
        });
        setAvailableYears(response.data.data.map((r: any) => r.yr));
      } catch (err) {
        console.error('Failed to fetch years', err);
      }
    };
    fetchYears();
  }, [timeColumn, tableName]);

  const handleGenerateForecast = async () => {
    if (!selectedMetric || !timeColumn) return;

    setIsLoading(true);
    try {
      const response = await api.post('/analytics/forecast', {
        table_name: tableName,
        time_column: timeColumn,
        value_column: selectedMetric,
        periods: 6,
        filters: {
          year: selectedYear ? parseInt(selectedYear) : null,
          month: selectedMonth ? parseInt(selectedMonth) : null,
          day: selectedDay ? parseInt(selectedDay) : null
        }
      });
      setForecastData(response.data);
    } catch (err) {
      console.error('Forecast generation failed', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedYear('');
    setSelectedMonth('');
    setSelectedDay('');
    setForecastData(null);
  };

  const numericColumns = columns;
  const timeColumns = columns;

  return (
    <div className="glass rounded-3xl p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
            <TrendingUp size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold">Predictive Forecasting</h3>
            <p className="text-sm text-slate-500">Project future values using linear trend analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {(selectedYear || selectedMonth || selectedDay || forecastData) && (
            <button 
              onClick={handleReset}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              title="Reset Filters"
            >
              <RotateCcw size={20} />
            </button>
          )}
          <button 
            onClick={handleGenerateForecast}
            disabled={isLoading || !selectedMetric || !timeColumn}
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-indigo-100"
            title="Refresh Analysis"
          >
            <RefreshCw className={isLoading ? "animate-spin" : ""} size={20} />
          </button>
          <button 
            onClick={handleGenerateForecast}
            disabled={isLoading || !selectedMetric || !timeColumn}
            className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all disabled:opacity-50 shadow-sm"
          >
            Generate Forecast
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time Dimension</label>
          <select 
            value={timeColumn}
            onChange={(e) => setTimeColumn(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
          >
            <option value="">Select time column...</option>
            {timeColumns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Metric</label>
          <select 
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
          >
            <option value="">Select metric to forecast...</option>
            {numericColumns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Slicers Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filter Year</label>
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium"
          >
            <option value="">All Years</option>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filter Month</label>
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium"
          >
            <option value="">All Months</option>
            {Array.from({length: 12}, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{new Date(2000, m-1).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filter Day</label>
          <select 
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium"
          >
            <option value="">All Days</option>
            {Array.from({length: 31}, (_, i) => i + 1).map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {forecastData && (
        <div className="pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-top-4">
          <ChartContainer 
            type="line"
            data={[...forecastData.historical, ...forecastData.forecast]}
            mappings={{
              x: timeColumn || 'period',
              y: selectedMetric
            }}
            title={`${selectedMetric} Forecast`}
          />
          <div className="mt-4 p-4 bg-indigo-50 rounded-2xl flex items-center gap-4 border border-indigo-100">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Trend Confidence</p>
              <p className="text-sm text-indigo-900 font-medium">
                The model identifies a {forecastData.trend_slope > 0 ? 'positive' : 'negative'} trend of {Math.abs(forecastData.trend_slope).toFixed(2)} units per period.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
