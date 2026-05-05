import { useState } from 'react';
import { Plus, Trash2, Layout, BarChart3, Save, X } from 'lucide-react';
import { ChartContainer } from './ChartContainer';
import { api } from '../lib/api';

interface Visual {
  id: string;
  type: "line" | "bar" | "pie" | "scatter" | "heatmap";
  title: string;
  table: string;
  mappings: any;
  data: any[];
}

export const ManualDashboardCreator = ({ tables, onSave, onClose }: any) => {
  const [visuals, setVisuals] = useState<Visual[]>([]);
  const [dashboardName, setDashboardName] = useState('New Manual Dashboard');
  const [isAdding, setIsAdding] = useState(false);
  const [newVisual, setNewVisual] = useState<any>({
    type: 'bar',
    table: tables[0] || '',
    title: 'New Visual',
    mappings: { x: '', y: '' }
  });
  const [tableColumns, setTableColumns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchColumns = async (tableName: string) => {
    try {
      const res = await api.get(`/data/preview/${tableName}`);
      setTableColumns(res.data.columns);
    } catch (err) {
      console.error("Failed to fetch columns", err);
    }
  };

  const handleAddVisual = async () => {
    setLoading(true);
    try {
      // Fetch data for the visual
      const res = await api.get(`/data/preview/${newVisual.table}`);
      const visual: Visual = {
        id: Math.random().toString(36).substr(2, 9),
        ...newVisual,
        data: res.data.data
      };
      setVisuals([...visuals, visual]);
      setIsAdding(false);
    } catch (err) {
      alert("Failed to add visual");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDashboard = async () => {
    setLoading(true);
    try {
      const payload = {
        name: dashboardName,
        description: 'Manually created dashboard',
        charts: visuals.map(v => ({
          type: v.type,
          title: v.title,
          description: '',
          mappings: v.mappings,
          sql: `SELECT * FROM ${v.table}` // Simplified
        }))
      };
      await api.post('/dashboards/', payload);
      onSave();
    } catch (err) {
      alert("Failed to save dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-card border border-border w-full max-w-6xl h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="px-8 py-6 border-b border-border flex items-center justify-between bg-background/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary">
              <Layout size={24} />
            </div>
            <input 
              value={dashboardName}
              onChange={e => setDashboardName(e.target.value)}
              className="text-xl font-bold bg-transparent border-none outline-none focus:ring-2 focus:ring-primary/20 rounded-lg px-2"
            />
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-background border border-border rounded-xl font-bold text-sm hover:bg-muted transition-all"
            >
              <Plus size={18} />
              Add Visual
            </button>
            <button 
              onClick={handleSaveDashboard}
              disabled={visuals.length === 0 || loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              <Save size={18} />
              {loading ? 'Saving...' : 'Save Dashboard'}
            </button>
            <button onClick={onClose} className="p-2.5 hover:bg-muted rounded-xl transition-colors border border-border">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-background/30">
          {visuals.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-20 h-20 bg-muted rounded-[2rem] flex items-center justify-center text-text-muted opacity-50">
                <BarChart3 size={40} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Empty Canvas</h3>
                <p className="text-text-muted text-sm max-w-xs">Start by adding a visual to your dashboard using the button above.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {visuals.map(v => (
                <div key={v.id} className="glass rounded-3xl p-6 relative group">
                  <button 
                    onClick={() => setVisuals(visuals.filter(vi => vi.id !== v.id))}
                    className="absolute top-4 right-4 p-2 bg-red-500/10 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                  >
                    <Trash2 size={16} />
                  </button>
                  <h4 className="font-bold mb-4">{v.title}</h4>
                  <div className="h-64">
                    <ChartContainer 
                      type={v.type}
                      data={v.data}
                      mappings={v.mappings}
                      title={v.title}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Visual Modal */}
        {isAdding && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsAdding(false)} />
            <div className="relative bg-card border border-border w-full max-w-lg rounded-[2rem] shadow-2xl p-8 animate-in slide-in-from-bottom-4 duration-300">
              <h3 className="text-xl font-bold mb-6">Configure Visual</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Title</label>
                  <input 
                    value={newVisual.title}
                    onChange={e => setNewVisual({...newVisual, title: e.target.value})}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl mt-1 outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Chart Type</label>
                    <select 
                      value={newVisual.type}
                      onChange={e => setNewVisual({...newVisual, type: e.target.value})}
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl mt-1 outline-none"
                    >
                      <option value="bar">Bar Chart</option>
                      <option value="line">Line Chart</option>
                      <option value="pie">Pie Chart</option>
                      <option value="area">Area Chart</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Source Table</label>
                    <select 
                      value={newVisual.table}
                      onChange={e => {
                        setNewVisual({...newVisual, table: e.target.value});
                        fetchColumns(e.target.value);
                      }}
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl mt-1 outline-none"
                    >
                      <option value="">Select Table</option>
                      {tables.map((t: string) => (
                        <option key={t} value={t}>{t.split('.').pop()}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {tableColumns.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">X Axis / Dimension</label>
                      <select 
                        value={newVisual.mappings.x}
                        onChange={e => setNewVisual({...newVisual, mappings: {...newVisual.mappings, x: e.target.value}})}
                        className="w-full px-4 py-3 bg-background border border-border rounded-xl mt-1 outline-none"
                      >
                        <option value="">Select Column</option>
                        {tableColumns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Y Axis / Measure</label>
                      <select 
                        value={newVisual.mappings.y}
                        onChange={e => setNewVisual({...newVisual, mappings: {...newVisual.mappings, y: e.target.value}})}
                        className="w-full px-4 py-3 bg-background border border-border rounded-xl mt-1 outline-none"
                      >
                        <option value="">Select Column</option>
                        {tableColumns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                <button 
                  onClick={handleAddVisual}
                  disabled={!newVisual.table || !newVisual.mappings.x || !newVisual.mappings.y}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50 mt-4"
                >
                  Add to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
