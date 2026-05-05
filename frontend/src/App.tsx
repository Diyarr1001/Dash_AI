import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  BarChart3, 
  Database, 
  MessageSquare, 
  Settings as SettingsIcon,
  Share2,
  TrendingUp,
  Plus,
  Search,
  Zap,
  X,
  Sun,
  Moon,
  CheckCircle2,
  Network,
  Save
} from 'lucide-react';
import { ERDiagramView } from './components/ERDiagramView';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { FileUploader } from './components/FileUploader';
import { DataTransformation } from './components/DataTransformation';
import { ChartContainer } from './components/ChartContainer';
import { ProjectGenerator } from './components/ProjectGenerator';
import { Portfolio } from './components/Portfolio';
import { WhatIfAnalysis } from './components/WhatIfAnalysis';
import { ForecastView } from './components/ForecastView';
import { LoginPage } from './components/LoginPage';
import { LogOut } from 'lucide-react';
import { DashboardView } from './components/DashboardView';
import { GetDataModal } from './components/GetDataModal';
import { ManualDashboardCreator } from './components/ManualDashboardCreator';
import { api } from './lib/api';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const SidebarItem = ({ icon: Icon, label, active, onClick }: SidebarItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center rounded-xl transition-all duration-200 group",
      label ? "gap-3 px-4 py-3" : "justify-center p-3",
      active 
        ? "bg-primary text-white shadow-lg shadow-primary/30" 
        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
    )}
  >
    <Icon size={20} className={cn("transition-transform group-hover:scale-110", active ? "text-white" : "text-slate-400")} />
    {label && <span className="font-medium animate-in fade-in slide-in-from-left-2 duration-300">{label}</span>}
  </button>
);

const App = () => {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [user, setUser] = useState<any>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentDataset, setCurrentDataset] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [showGetData, setShowGetData] = useState(false);
  const [showManualCreator, setShowManualCreator] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 5000);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const handleUploadSuccess = (data: any) => {
    setCurrentDataset(data);
    setShowUploader(false);
    setActiveTab('analytics');
    if (data.total_db_rows !== undefined && data.tables !== undefined) {
      showToast(`All ${data.tables.length} tables and their ${data.total_db_rows.toLocaleString()} rows are scanned and analyzed.`);
    } else if (data.total_rows !== undefined) {
      showToast(`Successfully scanned and analyzed ${data.total_rows.toLocaleString()} rows from ${data.filename}.`);
    }
  };

  const handleDatabaseConnected = (data: any) => {
    setCurrentDataset({
      id: 'postgres_source',
      filename: `DB: ${data.database}`,
      table_name: `${data.alias}.${data.tables[0]}`, // Full path for DuckDB
      columns: data.columns,
      preview: data.preview,
      tables: data.tables.map((t: string) => `${data.alias}.${t}`)
    });
    setActiveTab('analytics');
    setShowGetData(false);
    if (data.total_db_rows !== undefined && data.tables !== undefined) {
      showToast(`All ${data.tables.length} tables and their ${data.total_db_rows.toLocaleString()} rows are scanned and analyzed.`);
    } else if (data.total_rows !== undefined) {
      showToast(`Successfully scanned and analyzed ${data.total_rows.toLocaleString()} rows from ${data.tables[0]}.`);
    }
  };

  const handleSelectProject = (project: any) => {
    // Navigate directly to the dashboard view
    // DashboardView.tsx will handle refreshing the data for its own components
    setSelectedProject(project);
    setActiveTab('view_dashboard');
  };

  if (!user) {
    return <LoginPage onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground transition-colors duration-300 overflow-hidden">
      <GetDataModal 
        isOpen={showGetData}
        onClose={() => setShowGetData(false)}
        onSourceConnected={handleDatabaseConnected}
      />

      {/* Professional Power BI Ribbon Header - Full Width */}
      <header className="border-b border-border bg-card/95 backdrop-blur-md z-30 transition-colors duration-300 select-none">
        {/* Tier 1: Project Bar */}
        <div className="h-9 border-b border-border/40 flex items-center px-4 justify-between bg-muted/20">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-1.5 hover:bg-background rounded text-text-muted hover:text-primary transition-colors"
                title="Toggle Sidebar"
              >
                <LayoutDashboard size={14} />
              </button>
              <div className="flex items-center gap-1">
                <button className="px-3 py-1 text-[11px] font-bold hover:bg-background rounded transition-colors text-primary border border-transparent hover:border-primary/20">
                  File
                </button>
                <button className="p-1.5 hover:bg-background rounded text-text-muted hover:text-primary transition-colors" title="Save">
                  <Save size={14} />
                </button>
              </div>
            </div>
            <div className="h-4 w-[1px] bg-border/60" />
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-tight text-foreground/80">
                {currentDataset?.filename || 'Untitled Analysis'} - Dash AI
              </span>
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500/10 rounded border border-green-500/20 shadow-sm scale-90">
                <span className="text-[9px] font-black text-green-600 uppercase">Saved</span>
                <CheckCircle2 size={8} className="text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-background/50 px-3 py-1 rounded-lg border border-border focus-within:ring-1 focus-within:ring-primary/30 transition-all">
              <Search size={12} className="text-text-muted" />
              <input 
                type="text" 
                placeholder="Tell AI what to do..." 
                className="bg-transparent border-none outline-none text-[10px] w-48 text-foreground placeholder:text-text-muted"
              />
            </div>
            <div className="h-4 w-[1px] bg-border/60" />
            <button className="text-text-muted hover:text-foreground transition-colors">
              <SettingsIcon size={14} />
            </button>
          </div>
        </div>

        {/* Tier 2: Ribbon Tabs & Content */}
        <div className="flex flex-col">
          {/* Tab Selectors */}
          <div className="flex items-center px-6 gap-1 h-8 bg-muted/10 border-b border-border/20">
            <button className="px-4 h-full text-[10px] font-bold border-b-2 border-primary text-primary transition-all">Home</button>
            <button className="px-4 h-full text-[10px] font-bold text-text-muted hover:text-foreground transition-all">Insert</button>
            <button className="px-4 h-full text-[10px] font-bold text-text-muted hover:text-foreground transition-all">Modeling</button>
            <button className="px-4 h-full text-[10px] font-bold text-text-muted hover:text-foreground transition-all">View</button>
            <button className="px-4 h-full text-[10px] font-bold text-text-muted hover:text-foreground transition-all">Help</button>
          </div>

          {/* Active Ribbon Content */}
          <div className="h-20 flex items-center px-6 gap-6 overflow-x-auto no-scrollbar">
            {/* Group: Clipboard/Basic (Empty for now) */}
            <div className="flex flex-col gap-1 items-center px-2">
              <div className="flex items-center gap-2 opacity-30 grayscale cursor-not-allowed">
                <button className="p-2 rounded-lg"><Share2 size={20} /></button>
              </div>
              <span className="text-[8px] font-black uppercase tracking-tighter text-text-muted">Clipboard</span>
            </div>

            <div className="h-10 w-[1px] bg-border/40" />

            {/* Group: Data Selection */}
            <div className="flex flex-col gap-1 items-center px-2 border-r border-border/40">
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setShowGetData(true)}
                  className="flex flex-col items-center gap-1 px-4 py-1 hover:bg-background rounded-xl transition-all group border border-transparent hover:border-border"
                >
                  <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-colors shadow-sm">
                    <Database size={20} />
                  </div>
                  <span className="text-[9px] font-bold">Get Data</span>
                </button>
                <button 
                  onClick={() => setActiveTab('analytics')}
                  className="flex flex-col items-center gap-1 px-4 py-1 hover:bg-background rounded-xl transition-all group border border-transparent hover:border-border"
                >
                  <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors shadow-sm">
                    <TrendingUp size={20} />
                  </div>
                  <span className="text-[9px] font-bold">Transform</span>
                </button>
              </div>
              <span className="text-[8px] font-black uppercase tracking-tighter text-text-muted">Data</span>
            </div>

            {/* Group: Visuals */}
            <div className="flex flex-col gap-1 items-center px-2 border-r border-border/40">
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setShowManualCreator(true)}
                  className="flex flex-col items-center gap-1 px-4 py-1 hover:bg-background rounded-xl transition-all group border border-transparent hover:border-border"
                >
                  <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors shadow-sm">
                    <BarChart3 size={20} />
                  </div>
                  <span className="text-[9px] font-bold">New Visual</span>
                </button>
                <button 
                  onClick={() => setActiveTab('chat')}
                  className="flex flex-col items-center gap-1 px-4 py-1 hover:bg-background rounded-xl transition-all group border border-transparent hover:border-border"
                >
                  <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors shadow-sm">
                    <MessageSquare size={20} />
                  </div>
                  <span className="text-[9px] font-bold">AI Insight</span>
                </button>
              </div>
              <span className="text-[8px] font-black uppercase tracking-tighter text-text-muted">Insert</span>
            </div>

            {/* Group: Modeling */}
            <div className="flex flex-col gap-1 items-center px-2">
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setActiveTab('er')}
                  className="flex flex-col items-center gap-1 px-4 py-1 hover:bg-background rounded-xl transition-all group border border-transparent hover:border-border"
                >
                  <div className={cn(
                    "p-2 rounded-lg transition-all group-hover:scale-105 shadow-sm",
                    activeTab === 'er' ? "bg-red-500 text-white shadow-lg shadow-red-500/30" : "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"
                  )}>
                    <Network size={20} />
                  </div>
                  <span className="text-[9px] font-bold">Relationships</span>
                </button>
              </div>
              <span className="text-[8px] font-black uppercase tracking-tighter text-text-muted">Modeling</span>
            </div>

            {/* Share & Collab */}
            <div className="ml-auto flex items-center gap-3">
              <button className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-xl font-bold text-xs shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]">
                <Share2 size={14} />
                Share Project
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={cn(
          "border-r border-border bg-card flex flex-col p-6 transition-all duration-500 ease-in-out overflow-hidden",
          isSidebarCollapsed ? "w-20 px-4" : "w-72"
        )}>
          <div className={cn("flex items-center gap-3 mb-10 overflow-hidden", isSidebarCollapsed ? "justify-center" : "px-2 justify-between")}>
            <div 
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => {
                setActiveTab('dashboard');
                setSelectedProject(null);
              }}
            >
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                <Zap className="text-white" fill="white" size={24} />
              </div>
              {!isSidebarCollapsed && <span className="text-2xl font-display font-bold tracking-tight animate-in fade-in slide-in-from-left-4 duration-500">Dash AI</span>}
            </div>
            
            {!isSidebarCollapsed && (
              <button 
                onClick={toggleTheme}
                className="p-2.5 rounded-xl border border-border hover:bg-background/50 transition-all text-text-muted"
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
            )}
          </div>

          <nav className="flex-1 space-y-2">
            <SidebarItem 
              icon={LayoutDashboard} 
              label={isSidebarCollapsed ? "" : "Dashboards"} 
              active={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')} 
            />
            <SidebarItem 
              icon={BarChart3} 
              label={isSidebarCollapsed ? "" : "Analytics"} 
              active={activeTab === 'analytics'} 
              onClick={() => setActiveTab('analytics')} 
            />
            <SidebarItem 
              icon={Database} 
              label={isSidebarCollapsed ? "" : "Data Sources"} 
              active={activeTab === 'data'} 
              onClick={() => setActiveTab('data')} 
            />
            <SidebarItem 
              icon={Network} 
              label={isSidebarCollapsed ? "" : "ER Diagram"} 
              active={activeTab === 'er'} 
              onClick={() => setActiveTab('er')} 
            />
            <SidebarItem 
              icon={MessageSquare} 
              label={isSidebarCollapsed ? "" : "AI Chat"} 
              active={activeTab === 'chat'} 
              onClick={() => setActiveTab('chat')} 
            />
          </nav>

          <div className="mt-auto space-y-2">
            <SidebarItem icon={SettingsIcon} label={isSidebarCollapsed ? "" : "Settings"} onClick={() => {}} />
            <SidebarItem icon={LogOut} label={isSidebarCollapsed ? "" : "Logout"} onClick={handleLogout} />
            
            {!isSidebarCollapsed && (
              <div className="p-4 rounded-2xl bg-background/50 border border-border mt-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs">
                    {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-semibold truncate">{user?.full_name || 'User'}</p>
                    <p className="text-xs text-text-muted truncate">{user?.email || 'No email'}</p>
                  </div>
                </div>
                <button className="w-full py-2 bg-card border border-border rounded-lg text-xs font-semibold text-foreground hover:bg-background transition-colors">
                  Account
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative">

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-background transition-colors duration-300">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'dashboard' && <Portfolio onSelect={handleSelectProject} />}

            {activeTab === 'view_dashboard' && selectedProject && (
              <DashboardView 
                project={selectedProject} 
                onClose={() => setActiveTab('dashboard')} 
              />
            )}

            {activeTab === 'analytics' && currentDataset && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl mb-1 font-display font-bold tracking-tight">{currentDataset.filename}</h1>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-text-muted text-sm font-medium">Active Model:</p>
                    <code className="bg-primary/10 px-2 py-1 rounded-lg text-primary text-sm font-bold border border-primary/20 shadow-sm">{currentDataset.table_name}</code>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('chat')}
                  className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  Start AI Chat
                </button>
              </div>

              {/* ETL Layer */}
              <DataTransformation 
                tableName={currentDataset.table_name} 
                onTransformationApplied={(newData) => {
                  setCurrentDataset({
                    ...currentDataset,
                    preview: newData.data,
                    columns: newData.columns.map((c: string) => ({ name: c, type: 'unknown', nullable: true })),
                    chart: newData.chart_config // Store the AI-suggested chart
                  });
                }}
              />

              {currentDataset.chart && (
                <div className="space-y-6">
                  <div className="glass rounded-3xl p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-bold">{currentDataset.chart.title}</h3>
                        <p className="text-sm text-slate-500 mt-1">{currentDataset.chart.description}</p>
                      </div>
                    </div>
                    <ChartContainer 
                      type={currentDataset.chart.type}
                      data={currentDataset.preview}
                      mappings={currentDataset.chart.mappings}
                      title={currentDataset.chart.title}
                    />
                  </div>

                  {/* Transformed Data Table Preview */}
                  <div className="glass rounded-3xl p-8 overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold">Transformed Data Preview</h3>
                      <span className="text-xs font-semibold px-3 py-1 bg-primary/10 text-primary rounded-full">
                        Showing top {currentDataset.preview.length} rows
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border">
                            {currentDataset.columns.map((col: any) => (
                              <th key={col.name} className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                {col.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {currentDataset.preview.slice(0, 10).map((row: any, i: number) => (
                            <tr key={i} className="border-b border-border/50 hover:bg-primary/5 transition-colors">
                              {currentDataset.columns.map((col: any) => (
                                <td key={col.name} className="p-4 text-sm text-slate-600 whitespace-nowrap">
                                  {typeof row[col.name] === 'number' 
                                    ? row[col.name].toLocaleString(undefined, { maximumFractionDigits: 2 }) 
                                    : String(row[col.name] || '-')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* What-If Modeling */}
              <WhatIfAnalysis 
                data={currentDataset.preview} 
                metrics={currentDataset.columns.map((c: any) => c.name)} 
              />

              {/* Forecast Modeling */}
              <ForecastView 
                tableName={currentDataset.table_name} 
                columns={currentDataset.columns} 
              />

              {/* Schema Table */}
              <div className="glass rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h3 className="text-lg">Detected Schema</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Column</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Nullable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentDataset.columns.map((col: any) => (
                        <tr key={col.name} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-sm font-semibold text-slate-900">{col.name}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            <span className="px-2 py-1 bg-slate-100 rounded text-xs font-mono">{col.type}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">{col.nullable ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Preview Table */}
              <div className="glass rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-lg">Data Preview (First 10 rows)</h3>
                  <span className="text-xs font-bold text-slate-400 uppercase">DuckDB Engine</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        {currentDataset.columns.map((col: any) => (
                          <th key={col.name} className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{col.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentDataset.preview.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          {currentDataset.columns.map((col: any) => (
                            <td key={col.name} className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                              {row[col.name]?.toString() || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'er' && currentDataset && (
            <ERDiagramView tables={currentDataset.tables || [currentDataset.table_name]} />
          )}

          {activeTab === 'chat' && (
            <div className="max-w-6xl mx-auto">
              {currentDataset ? (
                <ProjectGenerator tableName={currentDataset.table_name} />
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                  <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400">
                    <Database size={40} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">No Data Loaded</h2>
                    <p className="text-slate-500 mt-1 max-w-md">You need to upload a dataset before Dash AI can generate a project for you.</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('dashboard')}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all hover:scale-[1.02]"
                  >
                    <Plus size={20} />
                    Upload or Select Data
                  </button>
                </div>
              )}
            </div>
          )}

          {showUploader && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowUploader(false)} />
              <div className="relative bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl p-4 overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="flex justify-end p-2">
                  <button onClick={() => setShowUploader(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>
                <div className="pb-12 px-8">
                  <div className="text-center mb-10">
                    <h2 className="text-3xl mb-2">Upload your dataset</h2>
                    <p className="text-slate-500 text-lg">Dash AI will analyze the schema and prepare it for instant insights.</p>
                  </div>
                  <FileUploader onUploadSuccess={handleUploadSuccess} />
                </div>
              </div>
            </div>
          )}
            </div>
          </div>
        </main>

      {/* Right Sidebar - Selected Tables */}
      {currentDataset && (
        <aside className="w-80 border-l border-border bg-card flex flex-col p-6 transition-all duration-300">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black uppercase tracking-widest text-text-muted">Selected Tables</h3>
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-md border border-primary/20">
              {currentDataset.tables?.length || 1} Total
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-2">
            {(currentDataset.tables || [currentDataset.table_name]).map((table: string) => (
              <button
                key={table}
                onClick={async () => {
                  try {
                    const res = await api.get(`/data/preview/${table}`);
                    const rowsRes = await api.post('/query/execute', { sql: `SELECT COUNT(*) as count FROM ${table}` });
                    const rowCount = rowsRes.data.data[0].count;
                    setCurrentDataset({
                      ...currentDataset,
                      table_name: table,
                      columns: res.data.columns,
                      preview: res.data.data,
                      total_rows: rowCount
                    });
                    showToast(`Switched to table: ${table}`);
                  } catch (err) {
                    showToast("Failed to switch table.");
                  }
                }}
                className={cn(
                  "w-full p-4 rounded-2xl border text-left transition-all group",
                  currentDataset.table_name === table
                    ? "bg-primary/5 border-primary/30 shadow-sm"
                    : "bg-background border-border hover:border-primary/20"
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    currentDataset.table_name === table ? "bg-primary text-white" : "bg-card text-text-muted group-hover:text-primary"
                  )}>
                    <Database size={14} />
                  </div>
                  <span className={cn(
                    "text-xs font-bold truncate flex-1",
                    currentDataset.table_name === table ? "text-primary" : "text-foreground"
                  )}>
                    {table.split('.').pop()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-text-muted">Status</span>
                  <span className="text-green-500 font-bold uppercase tracking-tighter">Synced</span>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 pt-8 border-t border-border">
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Model Insight</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Only selected tables are being processed. This optimizes memory and ensures high-fidelity AI relationship mapping.
              </p>
            </div>
          </div>
        </aside>
      )}
    </div>

      {showManualCreator && (
        <ManualDashboardCreator 
          tables={currentDataset?.tables || []}
          onClose={() => setShowManualCreator(false)}
          onSave={() => {
            setShowManualCreator(false);
            setActiveTab('dashboard');
            showToast("Manual dashboard saved successfully!");
          }}
        />
      )}

      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 border border-slate-700 text-white px-6 py-4 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="text-green-400" size={24} />
          <div>
            <p className="font-bold text-sm">Deep Scan Complete</p>
            <p className="text-slate-300 text-xs">{toastMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
