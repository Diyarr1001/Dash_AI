import { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, Database, Server, User, Lock, Globe, 
  ArrowLeft, CheckCircle2, Loader2, X, AlertCircle, 
  Search, ChevronRight, Layers
} from 'lucide-react';
import { api } from '../lib/api';

interface GetDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileClick: () => void;
  onSourceConnected: (data: any) => void;
}

type WizardStep = 'select' | 'file_options' | 'db_options' | 'postgres' | 'mysql' | 'mssql_auth' | 'mssql_db_select' | 'mssql_table_select' | 'gsheets' | 'pg_table_select' | 'mysql_table_select';

export const GetDataModal = ({ isOpen, onClose, onFileClick, onSourceConnected }: GetDataModalProps) => {
  const [step, setStep] = useState<WizardStep>('select');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Lists fetched from server
  const [discoveredDbs, setDiscoveredDbs] = useState<string[]>([]);
  const [discoveredTables, setDiscoveredTables] = useState<string[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [tableSearch, setTableSearch] = useState('');

  const [mssqlConfig, setMssqlConfig] = useState({
    server: 'localhost',
    database: '',
    user: '',
    password: '',
    use_windows_auth: true
  });

  const [config] = useState({
    host: 'localhost',
    port: '5432',
    database: '',
    user: '',
    password: '',
    schema: 'public'
  });

  const [mysqlConfig] = useState({
    host: 'localhost',
    port: '3306',
    database: '',
    user: 'root',
    password: ''
  });

  const [gsheetsUrl, setGsheetsUrl] = useState('');

  // Moved early return after hooks to comply with React Rules of Hooks

  // --- SQL SERVER DISCOVERY FLOW ---

  const handleMssqlAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/data/discover-databases', mssqlConfig);
      setDiscoveredDbs(response.data.databases);
      setStep('mssql_db_select');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reach server. Check address and credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleMssqlDbSelect = async (dbName: string) => {
    setLoading(true);
    setError(null);
    try {
      const updatedConfig = { ...mssqlConfig, database: dbName };
      setMssqlConfig(updatedConfig);
      const response = await api.post('/data/discover-tables', updatedConfig);
      setDiscoveredTables(response.data.tables);
      setSelectedTables(response.data.tables); // Select all by default
      setStep('mssql_table_select');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to list tables for this database.');
    } finally {
      setLoading(false);
    }
  };

  const handleMssqlFinalConnect = async () => {
    if (selectedTables.length === 0) {
      setError('Please select at least one table to import.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const finalConfig = { ...mssqlConfig, selected_tables: selectedTables };
      const response = await api.post('/data/connect-mssql', finalConfig);
      onSourceConnected({ ...response.data, source_type: 'mssql' });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to import selected tables.');
    } finally {
      setLoading(false);
    }
  };

  const filteredTables = useMemo(() => {
    return discoveredTables.filter(t => t.toLowerCase().includes(tableSearch.toLowerCase()));
  }, [discoveredTables, tableSearch]);

  const toggleTable = (table: string) => {
    setSelectedTables(prev => 
      prev.includes(table) ? prev.filter(t => t !== table) : [...prev, table]
    );
  };

  if (!isOpen) return null;

  // --- OLD CONNECTORS (STILL IN PLACE) ---

  // --- OLD CONNECTORS (STILL IN PLACE) ---


  const handlePgFinalConnect = async () => {
    if (selectedTables.length === 0) {
      setError('Please select at least one table to import.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const finalConfig = { ...config, selected_tables: selectedTables };
      const response = await api.post('/data/connect-postgres', finalConfig);
      onSourceConnected({ ...response.data, source_type: 'postgres' });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to import selected tables.');
    } finally {
      setLoading(false);
    }
  };


  const handleMysqlFinalConnect = async () => {
    if (selectedTables.length === 0) {
      setError('Please select at least one table to import.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const finalConfig = { ...mysqlConfig, selected_tables: selectedTables };
      const response = await api.post('/data/connect-mysql', finalConfig);
      onSourceConnected({ ...response.data, source_type: 'mysql' });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to import selected tables.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGSheets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gsheetsUrl) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/data/connect-gsheets', { url: gsheetsUrl });
      onSourceConnected({ ...response.data, source_type: 'gsheets' });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Google Sheets connection failed. Ensure the sheet is public.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-card border border-border w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="px-8 py-5 border-b border-border flex items-center justify-between bg-background/50">
          <div className="flex items-center gap-3">
            {step !== 'select' && (
              <button 
                onClick={() => {
                  if (step === 'file_options' || step === 'db_options') setStep('select');
                  else if (['postgres', 'mysql', 'mssql_auth'].includes(step)) setStep('db_options');
                  else if (step === 'mssql_db_select') setStep('mssql_auth');
                  else if (step === 'mssql_table_select') setStep('mssql_db_select');
                  else if (step === 'pg_table_select') setStep('postgres');
                  else if (step === 'mysql_table_select') setStep('mysql');
                  else if (step === 'gsheets') setStep('file_options');
                }}
                className="p-2 hover:bg-card rounded-full transition-colors text-text-muted hover:text-foreground"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <h2 className="text-lg font-bold">
                {step === 'mssql_db_select' ? 'Select Database' : 
                 step === 'mssql_table_select' ? 'Select Tables' : 'Get Data'}
              </h2>
              <p className="text-[10px] text-text-muted uppercase tracking-widest font-black mt-0.5">
                {step === 'select' ? 'Step 1: Choose Source' : 
                 step === 'db_options' ? 'Step 2: Choose Engine' :
                 step.startsWith('mssql') ? `SQL Server Discovery` : 'Configuration'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-card rounded-full transition-colors text-text-muted hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-start gap-3 animate-in slide-in-from-top-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          {step === 'select' ? (
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setStep('file_options')} className="group p-6 rounded-3xl border border-border bg-background hover:border-green-500/50 hover:shadow-lg transition-all text-left">
                <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 mb-4 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet size={24} />
                </div>
                <h3 className="font-bold text-base mb-1">File</h3>
                <p className="text-xs text-text-muted">Excel or CSV files.</p>
              </button>
              <button onClick={() => setStep('db_options')} className="group p-6 rounded-3xl border border-border bg-background hover:border-primary/50 hover:shadow-lg transition-all text-left">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                  <Database size={24} />
                </div>
                <h3 className="font-bold text-base mb-1">Database</h3>
                <p className="text-xs text-text-muted">Live server connection.</p>
              </button>
            </div>
          ) : step === 'db_options' ? (
            <div className="grid grid-cols-3 gap-4">
              <button onClick={() => setStep('postgres')} className="group p-4 rounded-3xl border border-border bg-background hover:border-indigo-500/50 hover:shadow-lg transition-all text-center">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-3 mx-auto group-hover:scale-110 transition-transform">
                  <Database size={20} />
                </div>
                <h3 className="font-bold text-xs">PostgreSQL</h3>
              </button>
              <button onClick={() => setStep('mysql')} className="group p-4 rounded-3xl border border-border bg-background hover:border-blue-500/50 hover:shadow-lg transition-all text-center">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-3 mx-auto group-hover:scale-110 transition-transform">
                  <Server size={20} />
                </div>
                <h3 className="font-bold text-xs">MySQL</h3>
              </button>
              <button onClick={() => setStep('mssql_auth')} className="group p-4 rounded-3xl border border-border bg-background hover:border-red-500/50 hover:shadow-lg transition-all text-center">
                <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mb-3 mx-auto group-hover:scale-110 transition-transform">
                  <Layers size={20} />
                </div>
                <h3 className="font-bold text-xs">SQL Server</h3>
              </button>
            </div>
          ) : step === 'mssql_auth' ? (
            <form onSubmit={handleMssqlAuth} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Server Address</label>
                <div className="relative">
                  <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input 
                    type="text" 
                    value={mssqlConfig.server}
                    onChange={e => setMssqlConfig({...mssqlConfig, server: e.target.value})}
                    placeholder="e.g. localhost\SQLEXPRESS"
                    className="w-full pl-12 pr-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 px-2 py-1">
                <input 
                  type="checkbox" 
                  id="winAuth"
                  checked={mssqlConfig.use_windows_auth}
                  onChange={e => setMssqlConfig({...mssqlConfig, use_windows_auth: e.target.checked})}
                  className="w-4 h-4 rounded border-border text-primary"
                />
                <label htmlFor="winAuth" className="text-sm font-medium cursor-pointer">Use Windows Authentication</label>
              </div>
              {!mssqlConfig.use_windows_auth && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Username</label>
                    <div className="relative">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input 
                        type="text" 
                        value={mssqlConfig.user}
                        onChange={e => setMssqlConfig({...mssqlConfig, user: e.target.value})}
                        className="w-full pl-12 pr-4 py-3 bg-background border border-border rounded-xl text-sm"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input 
                        type="password" 
                        value={mssqlConfig.password}
                        onChange={e => setMssqlConfig({...mssqlConfig, password: e.target.value})}
                        className="w-full pl-12 pr-4 py-3 bg-background border border-border rounded-xl text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition-all shadow-lg disabled:opacity-50 mt-6"
              >
                {loading ? <Loader2 className="animate-spin" /> : <ChevronRight size={18} />}
                {loading ? 'Authenticating...' : 'Connect to Server'}
              </button>
            </form>
          ) : step === 'mssql_db_select' ? (
            <div className="space-y-3">
              {discoveredDbs.map(db => (
                <button 
                  key={db}
                  onClick={() => handleMssqlDbSelect(db)}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      <Database size={16} />
                    </div>
                    <span className="font-bold text-sm">{db}</span>
                  </div>
                  <ChevronRight size={16} className="text-text-muted group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          ) : step.endsWith('_table_select') ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 sticky top-0 bg-card z-10 pb-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input 
                    type="text" 
                    placeholder="Search tables..."
                    value={tableSearch}
                    onChange={e => setTableSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <button 
                  onClick={() => setSelectedTables(selectedTables.length === discoveredTables.length ? [] : [...discoveredTables])}
                  className="text-xs font-bold text-primary hover:underline whitespace-nowrap"
                >
                  {selectedTables.length === discoveredTables.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {filteredTables.map(table => (
                  <button 
                    key={table}
                    onClick={() => toggleTable(table)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                      selectedTables.includes(table) 
                        ? 'bg-primary/5 border-primary/30' 
                        : 'bg-background border-border hover:border-primary/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${selectedTables.includes(table) ? 'bg-primary text-white' : 'bg-card text-text-muted'}`}>
                        <Database size={12} />
                      </div>
                      <span className={`text-xs font-medium ${selectedTables.includes(table) ? 'text-primary' : 'text-foreground'}`}>{table}</span>
                    </div>
                    {selectedTables.includes(table) && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </button>
                ))}
              </div>

              <div className="pt-4 sticky bottom-0 bg-card">
                <button 
                  onClick={
                    step === 'mssql_table_select' ? handleMssqlFinalConnect : 
                    step === 'pg_table_select' ? handlePgFinalConnect : 
                    handleMysqlFinalConnect
                  }
                  disabled={loading || selectedTables.length === 0}
                  className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? 'Importing...' : `Import ${selectedTables.length} Selected Table${selectedTables.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          ) : step === 'file_options' ? (
            <div className="grid grid-cols-2 gap-4 py-4">
              <button 
                onClick={() => {
                  onFileClick();
                  onClose();
                }}
                className="group p-6 rounded-3xl border border-border bg-background hover:border-green-500/50 hover:shadow-lg transition-all text-left"
              >
                <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 mb-4 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet size={24} />
                </div>
                <h3 className="font-bold text-base mb-1">Local File</h3>
                <p className="text-xs text-text-muted">Excel, CSV, or Parquet.</p>
              </button>
              <button 
                onClick={() => setStep('gsheets')}
                className="group p-6 rounded-3xl border border-border bg-background hover:border-emerald-500/50 hover:shadow-lg transition-all text-left"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4 group-hover:scale-110 transition-transform">
                  <Globe size={24} />
                </div>
                <h3 className="font-bold text-base mb-1">Google Sheets</h3>
                <p className="text-xs text-text-muted">Connect via public link.</p>
              </button>
            </div>
          ) : step === 'gsheets' ? (
            <form onSubmit={handleConnectGSheets} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Spreadsheet URL</label>
                <div className="relative">
                  <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input 
                    type="url" 
                    value={gsheetsUrl}
                    onChange={e => setGsheetsUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full pl-12 pr-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    required
                  />
                </div>
                <p className="text-[10px] text-text-muted mt-2 ml-1 italic">
                  💡 Make sure your sheet is set to "Anyone with the link can view".
                </p>
              </div>
              <button 
                type="submit"
                disabled={loading || !gsheetsUrl}
                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={18} />}
                {loading ? 'Connecting...' : 'Connect Google Sheet'}
              </button>
            </form>
          ) : (
            /* Fallback for other DBs */
            <p className="text-center text-sm text-text-muted py-8">Configuration for this source is coming soon.</p>
          )}
        </div>
      </div>
    </div>
  );
};
