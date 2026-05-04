import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, CheckCircle2, ChevronRight, BarChart, AlertCircle, Database } from 'lucide-react';
import { api } from '../lib/api';
import { ChartContainer } from './ChartContainer';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Reorder } from 'framer-motion';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ProjectGeneratorProps {
  tableName: string;
}

export const ProjectGenerator = ({ tableName }: ProjectGeneratorProps) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // States for interactive reordering
  const [kpis, setKpis] = useState<any[]>([]);
  const [charts, setCharts] = useState<any[]>([]);

  useEffect(() => {
    if (result && result.components) {
      setKpis(result.components.filter((c: any) => c.type === 'kpi'));
      setCharts(result.components.filter((c: any) => c.type === 'chart'));
    }
  }, [result]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setResult(null);
    setError(null);
    setSaveSuccess(false);
    try {
      const response = await api.post('/project/generate', {
        prompt: prompt,
        table_name: tableName
      });
      
      if (response.data.error) {
        setError(response.data.detail || 'Failed to generate project components.');
      } else {
        setResult(response.data);
      }
    } catch (err: any) {
      console.error('Project generation failed', err);
      setError(err.response?.data?.detail || err.message || 'Network error occurred during generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    
    setIsSaving(true);
    try {
      await api.post('/dashboards/', {
        title: result.project_title,
        description: `AI-generated analysis for ${tableName}`,
        config: {
          ...result,
          components: [...kpis, ...charts], // Save in current order
          table_name: tableName
        },
        owner_id: 1 // Default user
      });
      setSaveSuccess(true);
    } catch (err) {
      console.error('Failed to save dashboard', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-12 transition-colors duration-300">
      {/* Search/Prompt Box */}
      <div className="max-w-4xl mx-auto text-center space-y-8 py-12">
        <div className="space-y-4">
          <h2 className="text-5xl font-display font-bold tracking-tight text-foreground">
            What should we build today?
          </h2>
          <p className="text-xl text-text-muted max-w-2xl mx-auto leading-relaxed">
            Describe your analytical goal in plain English. Dash AI will handle the SQL, the charts, and the layout.
          </p>
        </div>

        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-indigo-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative flex flex-col bg-card border border-border p-4 rounded-[2rem] shadow-xl focus-within:ring-4 focus-within:ring-primary/10 transition-all">
            <div className="flex items-start w-full">
              <div className="pl-2 pr-4 pt-4 text-text-muted/50">
                <Sparkles size={24} />
              </div>
              <textarea 
                rows={prompt.split('\n').length > 3 ? 5 : 2}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your analytical goal (e.g., 'People Analytics Dashboard')..."
                className="flex-1 bg-transparent border-none outline-none py-4 text-lg text-foreground placeholder:text-text-muted/50 resize-none"
              />
            </div>
            <div className="flex justify-end p-2 border-t border-border mt-2">
              <button 
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="px-8 py-3 bg-primary text-white rounded-2xl font-bold flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
              >
                {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                Generate Project
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="max-w-4xl mx-auto p-6 bg-red-500/10 border border-red-500/20 rounded-[2rem] flex items-center gap-4 text-red-500 animate-in fade-in slide-in-from-top-4">
          <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center flex-shrink-0">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="font-bold">Generation Issue</p>
            <p className="text-sm opacity-90">{error}</p>
          </div>
          <button 
            onClick={handleGenerate}
            className="ml-auto px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Results Area */}
      {isGenerating && (
        <div className="flex flex-col items-center justify-center py-20 space-y-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-border border-t-primary rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Database className="text-primary animate-pulse" size={24} />
            </div>
          </div>
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-primary font-bold animate-pulse">
              <Sparkles size={18} />
              <span className="uppercase tracking-[0.2em] text-xs">Full Dataset Deep Scan</span>
            </div>
            <p className="text-xl font-bold text-foreground">Analyzing all rows & generating insights...</p>
            <p className="text-text-muted text-sm max-w-sm mx-auto">
              Scanning entire table for unique categories and statistical ranges to ensure 100% accuracy.
            </p>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-10 duration-700">
          <div className="flex items-center justify-between border-b border-border pb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-3xl font-display font-bold text-foreground">{result.project_title}</h3>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={handleSave}
                disabled={isSaving || saveSuccess}
                className={cn(
                  "px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 border",
                  saveSuccess 
                    ? "bg-green-500/10 text-green-500 border-green-500/20" 
                    : "border-border hover:bg-background text-foreground"
                )}
              >
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : saveSuccess ? <CheckCircle2 size={16} /> : null}
                {saveSuccess ? 'Saved' : 'Save as Dashboard'}
              </button>
              {saveSuccess && (
                <button 
                  onClick={() => window.location.reload()} 
                  className="px-5 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                >
                  View in Portfolio
                </button>
              )}
            </div>
          </div>

          {/* Reorderable KPIs */}
          <Reorder.Group axis="x" values={kpis} onReorder={setKpis} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {kpis.map((kpi: any, index: number) => (
              <Reorder.Item 
                key={`${kpi.title}-${index}`} 
                value={kpi}
                whileDrag={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgba(99, 102, 241, 0.2)" }}
                className="glass p-6 rounded-3xl space-y-2 border border-border shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/30 transition-all duration-300"
              >
                <p className="text-xs font-bold text-text-muted uppercase tracking-widest">
                  {typeof kpi.title === 'object' ? JSON.stringify(kpi.title) : String(kpi.title)}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-display font-bold text-foreground">
                    {kpi.data && kpi.data.length > 0 ? JSON.stringify(kpi.data[0]?.[Object.keys(kpi.data[0])[0]]) : '0'}
                  </span>
                </div>
                <p className="text-xs text-text-muted/80">
                  {typeof kpi.description === 'object' ? JSON.stringify(kpi.description) : String(kpi.description)}
                </p>
              </Reorder.Item>
            ))}
          </Reorder.Group>

          {/* Reorderable Charts */}
          <Reorder.Group axis="y" values={charts} onReorder={setCharts} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {charts.map((comp: any, index: number) => (
              <Reorder.Item 
                key={`${comp.title}-${index}`} 
                value={comp}
                whileDrag={{ scale: 1.02, boxShadow: "0 20px 25px -5px rgba(99, 102, 241, 0.1)" }}
                className="glass rounded-[2.5rem] p-8 space-y-6 hover:shadow-2xl transition-all duration-500 border border-border group relative overflow-hidden cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="text-xl font-bold text-foreground tracking-tight">
                      {typeof comp.title === 'object' ? JSON.stringify(comp.title) : String(comp.title)}
                    </h4>
                    <p className="text-sm text-text-muted leading-relaxed">
                      {typeof comp.description === 'object' ? JSON.stringify(comp.description) : String(comp.description)}
                    </p>
                  </div>
                  <div className="p-2.5 bg-background rounded-xl text-text-muted group-hover:text-primary transition-colors border border-border">
                    <BarChart size={20} />
                  </div>
                </div>

                <ChartContainer 
                  type={comp.chart_config?.type || 'bar'}
                  data={comp.data || []}
                  mappings={comp.chart_config?.mappings || {}}
                  title={String(comp.chart_config?.title || comp.title)}
                  error={comp.error}
                />

                {comp.insights && (
                  <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
                    <div className="flex items-center gap-2 text-primary mb-3">
                      <Sparkles size={16} />
                      <span className="text-xs font-bold uppercase tracking-widest">AI Insights</span>
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed italic font-medium">
                      "{typeof comp.insights === 'object' ? JSON.stringify(comp.insights) : String(comp.insights)}"
                    </p>
                  </div>
                )}
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>
      )}
    </div>
  );
};
