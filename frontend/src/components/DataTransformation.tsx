import React, { useState } from 'react';
import { Sparkles, Play, Trash2 } from 'lucide-react';
import { api } from '../lib/api';

interface Transformation {
  id: string;
  type: 'filter' | 'sort' | 'aggregate' | 'calculated';
  config: any;
  description: string;
}

interface DataTransformationProps {
  tableName: string;
  columns: any[];
  onTransformationApplied: (newData: any) => void;
}

export const DataTransformation = ({ tableName, columns, onTransformationApplied }: DataTransformationProps) => {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [transformations, setTransformations] = useState<Transformation[]>([]);

  const handleAiTransform = async () => {
    if (!prompt.trim()) return;
    
    setIsProcessing(true);
    try {
      // In a real implementation, this would call a specific ETL AI endpoint
      // For now, we'll use the query endpoint to demonstrate the transformation
      const response = await api.post('/query', {
        prompt: `Apply this transformation: ${prompt}. Return the full resulting table.`,
        table_name: tableName
      });
      
      onTransformationApplied(response.data);
      setPrompt('');
      
      // Add to history (simulated)
      const newTransform: Transformation = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'calculated',
        config: { prompt },
        description: prompt
      };
      setTransformations([...transformations, newTransform]);
    } catch (err) {
      console.error('Transformation failed', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="glass rounded-3xl p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Sparkles size={20} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Smart Transformations</h3>
            <p className="text-sm text-slate-500">Use AI to clean, filter, or create new columns</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <input 
            type="text" 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., 'Filter for revenue > 1000' or 'Add a profit margin column'"
            className="bg-transparent border-none outline-none w-full text-slate-900 placeholder:text-slate-400"
            onKeyDown={(e) => e.key === 'Enter' && handleAiTransform()}
          />
        </div>
        <button 
          onClick={handleAiTransform}
          disabled={isProcessing || !prompt.trim()}
          className="px-6 py-3 bg-primary text-white rounded-2xl font-semibold flex items-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          {isProcessing ? <Play className="animate-spin" size={18} /> : <Play size={18} />}
          Apply
        </button>
      </div>

      {transformations.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Applied Pipeline</p>
          {transformations.map((t, i) => (
            <div key={t.id} className="flex items-center justify-between bg-white border border-slate-100 p-4 rounded-xl shadow-sm group">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-400">
                  {i + 1}
                </div>
                <span className="text-sm font-medium text-slate-700">{t.description}</span>
              </div>
              <button className="p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
