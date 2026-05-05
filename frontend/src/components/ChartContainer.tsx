import React, { useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import html2canvas from 'html2canvas';
import { Download, AlertCircle, Database } from 'lucide-react';

interface ChartContainerProps {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap';
  data: any[];
  mappings: {
    x: string;
    y: string;
    color?: string;
  };
  title: string;
  error?: string;
}

export const ChartContainer = ({ type, data, mappings, title, error }: ChartContainerProps) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  // Robust data getter that handles case-insensitive keys
  const getValue = (item: any, key: string) => {
    if (!item || !key) return null;
    if (item[key] !== undefined) return item[key];
    
    // Fallback: try case-insensitive search
    const lowerKey = key.toLowerCase();
    const actualKey = Object.keys(item).find(k => k.toLowerCase() === lowerKey);
    return actualKey ? item[actualKey] : null;
  };

  const exportChart = async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current);
    const link = document.createElement('a');
    link.download = `${title.replace(/\s+/g, '_').toLowerCase()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (error || !data || data.length === 0) {
    return (
      <div className="w-full h-80 flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
        <AlertCircle size={40} className="text-amber-400 mb-2" />
        <p className="text-sm font-bold text-slate-500">{error || 'No data available for this chart'}</p>
        <p className="text-xs text-slate-400 mt-1 italic">The query might be too specific for your dataset.</p>
      </div>
    );
  }

  const getOption = () => {
    // Multi-color palette
    const colors = isDark 
      ? ['#818cf8', '#fb7185', '#34d399', '#fbbf24', '#a78bfa', '#22d3ee']
      : ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#1e293b' : '#f1f5f9';

    let xKey = mappings?.x;
    let yKey = mappings?.y;

    if (data.length > 0) {
      const firstRow = data[0];
      const keys = Object.keys(firstRow);
      if (!xKey || getValue(firstRow, xKey) === null) {
        xKey = keys.find(k => typeof firstRow[k] === 'string') || keys[0];
      }
      if (!yKey || getValue(firstRow, yKey) === null) {
        yKey = keys.find(k => typeof firstRow[k] === 'number') || keys[1] || keys[0];
      }
    }

    const safeXKey = xKey || '';
    const safeYKey = yKey || '';
    const xData = data.map(item => getValue(item, safeXKey));
    const yData = data.map(item => getValue(item, safeYKey));

    if (type === 'pie') {
      return {
        tooltip: { trigger: 'item', padding: 10, borderRadius: 12 },
        legend: { bottom: '0%', left: 'center', itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 10, color: textColor } },
        series: [
          {
            name: title,
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 10, borderColor: isDark ? '#0f172a' : '#fff', borderWidth: 2 },
            label: { show: false },
            data: data.map((item, idx) => ({
              name: String(getValue(item, safeXKey) || 'Unknown'),
              value: getValue(item, safeYKey),
              itemStyle: { color: colors[idx % colors.length] }
            }))
          }
        ]
      };
    }

    return {
      tooltip: { 
        trigger: 'axis', 
        padding: 10, 
        borderRadius: 12,
        backgroundColor: isDark ? '#1e293b' : 'rgba(255, 255, 255, 0.9)',
        textStyle: { color: isDark ? '#f8fafc' : '#0f172a' },
        borderWidth: 0,
        shadowBlur: 10,
        shadowColor: 'rgba(0,0,0,0.1)'
      },
      grid: { left: '3%', right: '4%', bottom: '10%', top: '10%', containLabel: true },
      xAxis: {
        type: 'category',
        data: xData,
        axisLine: { lineStyle: { color: gridColor } },
        axisLabel: { color: textColor, fontSize: 10 }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { type: 'dashed', color: gridColor } },
        axisLabel: { color: textColor, fontSize: 10 }
      },
      series: [
        {
          data: yData,
          type: type,
          smooth: type === 'line',
          barMaxWidth: 40,
          itemStyle: {
            borderRadius: [6, 6, 0, 0],
            color: (params: any) => colors[params.dataIndex % colors.length]
          },
          lineStyle: { width: 3, color: colors[0] },
          areaStyle: type === 'line' ? {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: colors[0] + '33' }, { offset: 1, color: colors[0] + '00' }]
            }
          } : undefined
        }
      ]
    };
  };

  return (
    <div className="relative group/chart">
      <div ref={chartRef} className="w-full h-64">
        <ReactECharts 
          option={getOption()} 
          style={{ height: '100%', width: '100%' }}
          notMerge={true}
          lazyUpdate={true}
        />
      </div>
      <button 
        onClick={exportChart}
        className="absolute top-0 right-0 p-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-400 rounded-xl opacity-0 group-hover/chart:opacity-100 transition-all hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-primary shadow-sm border border-slate-100 dark:border-slate-700"
        title="Download as PNG"
      >
        <Download size={16} />
      </button>
    </div>
  );
};
