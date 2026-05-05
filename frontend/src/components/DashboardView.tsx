import { useState, useEffect, useRef } from 'react';
import { BarChart2, Trash2, ChevronRight, Loader2, Sparkles, Send } from 'lucide-react';
import { ChartContainer } from './ChartContainer';
import { api } from '../lib/api';
import { Reorder } from 'framer-motion';

interface DashboardViewProps {
  project: any;
  onClose: () => void;
}

export const DashboardView = ({ project, onClose }: DashboardViewProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updatePrompt, setUpdatePrompt] = useState('');
  const [kpis, setKpis] = useState<any[]>([]);
  const [charts, setCharts] = useState<any[]>([]);

  useEffect(() => {
    const refreshData = async () => {
      if (!project || !project.config || !project.config.components) return;
      
      setIsLoading(true);
      const components = project.config.components;
      const refreshedComponents = [];

      try {
        for (const comp of components) {
          try {
            if (!comp.sql) {
              refreshedComponents.push(comp);
              continue;
            }
            const response = await api.post('/query/execute', {
              sql: comp.sql
            });
            refreshedComponents.push({
              ...comp,
              data: response.data.data,
              error: response.data.error
            });
          } catch (err) {
            console.error(`Failed to refresh data for ${comp.title}`, err);
            refreshedComponents.push(comp);
          }
        }
        
        const allComps = refreshedComponents.length > 0 ? refreshedComponents : components;
        setKpis(allComps.filter((c: any) => c.type === 'kpi'));
        setCharts(allComps.filter((c: any) => c.type === 'chart'));
      } finally {
        setIsLoading(false);
      }
    };

    refreshData();
  }, [project]);

  const handleAIUpdate = async () => {
    if (!updatePrompt.trim() || isUpdating) return;

    setIsUpdating(true);
    try {
      const currentComponents = [...kpis, ...charts];
      const response = await api.post('/project/update', {
        prompt: updatePrompt,
        table_name: project.config.table_name || 'default_table',
        current_components: currentComponents
      });

      if (response.data.components) {
        const newComponents = response.data.components;
        setKpis(newComponents.filter((c: any) => c.type === 'kpi'));
        setCharts(newComponents.filter((c: any) => c.type === 'chart'));
        
        // Auto-save the updated dashboard
        await api.put(`/dashboards/${project.id}`, {
          title: project.title,
          description: project.description,
          config: {
            ...project.config,
            components: newComponents
          }
        });

        setUpdatePrompt('');
        // Smooth scroll to bottom to see new charts
        setTimeout(() => {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }, 100);
      }
    } catch (err) {
      console.error('Failed to update dashboard with AI', err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!project || !project.config) return null;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-10 duration-700 pb-40">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-6 transition-colors duration-300">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest cursor-pointer hover:opacity-70 transition-opacity" onClick={onClose}>
            Dashboards <ChevronRight size={14} />
          </div>
          <h3 className="text-3xl font-display font-bold text-foreground">{project.title}</h3>
          <p className="text-text-muted">{project.description || 'AI-Powered Analytics Dashboard'}</p>
        </div>
        
        <div className="flex gap-3">
          {(isLoading || isUpdating) && (
            <div className="flex items-center gap-2 px-4 py-2 bg-background/50 text-text-muted rounded-xl text-xs font-bold border border-border">
              <Loader2 className="animate-spin" size={14} />
              {isUpdating ? 'AI IS UPDATING...' : 'REFRESHING DATA...'}
            </div>
          )}
          <button 
            onClick={() => {
              if (confirm('Are you sure you want to delete this dashboard?')) {
                api.delete(`/dashboards/${project.id}`).then(() => onClose());
              }
            }}
            className="p-2.5 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors border border-red-500/20"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {isLoading && kpis.length === 0 && charts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <Loader2 className="animate-spin text-primary" size={40} />
          <p className="text-text-muted font-medium italic">Fetching latest data...</p>
        </div>
      ) : (
        <>
          {/* Stats/KPI Row */}
          <Reorder.Group 
            axis="x" 
            values={kpis} 
            onReorder={setKpis}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {kpis.map((kpi: any, index: number) => (
              <Reorder.Item 
                key={`${kpi.title}-${index}`} 
                value={kpi}
                whileDrag={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgba(99, 102, 241, 0.2)" }}
                className="glass p-6 rounded-3xl space-y-2 border border-border shadow-sm transition-all duration-300 cursor-grab active:cursor-grabbing hover:border-primary/30"
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

          {/* Charts Grid */}
          <Reorder.Group 
            axis="y" 
            values={charts} 
            onReorder={setCharts}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {charts.map((comp: any, index: number) => (
              <Reorder.Item 
                key={`${comp.title}-${index}`} 
                value={comp}
                whileDrag={{ scale: 1.02, boxShadow: "0 20px 25px -5px rgba(99, 102, 241, 0.1)" }}
                className="glass rounded-[2.5rem] p-8 space-y-6 hover:shadow-2xl hover:border-primary/20 transition-all duration-500 group relative overflow-hidden cursor-grab active:cursor-grabbing"
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
                    <BarChart2 size={20} />
                  </div>
                </div>

                <ChartContainer 
                  type={comp.chart_config?.type || 'bar'}
                  data={comp.data || []}
                  mappings={comp.chart_config?.mappings || {}}
                  title={String(comp.title)}
                  error={comp.error}
                />

                {comp.insights && (
                  <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
                    <div className="flex items-center gap-2 text-primary mb-3">
                      <Sparkles size={16} />
                      <span className="text-xs font-bold uppercase tracking-widest">AI Insight</span>
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed italic font-medium">
                      "{typeof comp.insights === 'object' ? JSON.stringify(comp.insights) : String(comp.insights)}"
                    </p>
                  </div>
                )}
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </>
      )}

      {/* Floating AI Command Bar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50">
        <div className="glass bg-card/90 border border-primary/20 p-2 rounded-2xl shadow-2xl shadow-primary/20 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <div className="pl-3 text-primary">
              {isUpdating ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
            </div>
            <input 
              type="text" 
              value={updatePrompt}
              onChange={(e) => setUpdatePrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAIUpdate()}
              placeholder="Tell AI to modify this dashboard (e.g., 'Add average salary chart')..."
              className="flex-1 bg-transparent border-none outline-none py-3 text-sm text-foreground placeholder:text-text-muted/50"
              disabled={isUpdating}
            />
            <button 
              onClick={handleAIUpdate}
              disabled={!updatePrompt.trim() || isUpdating}
              className="p-2.5 bg-primary text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition-all"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
