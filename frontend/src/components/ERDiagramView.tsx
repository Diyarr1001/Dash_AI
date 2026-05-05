import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  ConnectionLineType,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType,
  type NodeProps
} from 'reactflow';
import 'reactflow/dist/style.css';
import { api } from '../lib/api';
import { Database, Table, Loader2, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Custom Node for Table with per-column handles
const TableNode = ({ data }: NodeProps) => {
  const isFact = data.isFactTable;
  return (
    <div className={cn(
      "bg-card border-2 rounded-xl shadow-xl min-w-[260px] overflow-hidden group transition-all duration-300",
      isFact ? "border-amber-400 shadow-amber-100 scale-105 z-10" : "border-border hover:border-primary/50"
    )}>
      <div className={cn(
        "p-4 flex items-center justify-between border-b",
        isFact ? "bg-amber-50 border-amber-200" : "bg-primary/5 border-border"
      )}>
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            isFact ? "bg-amber-500 text-white shadow-lg" : "bg-primary/10 text-primary"
          )}>
            <Table size={16} />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight">{data.label}</span>
            {isFact && <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Fact Table</span>}
          </div>
        </div>
      </div>
      <div className="p-2 space-y-0.5 relative bg-white">
        {/* Fallback Handles for when specific column handles aren't found */}
        <Handle type="target" position={Position.Left} id="target-fallback" className="!opacity-0 !w-0 !h-0 !border-none !top-1/2" />
        <Handle type="source" position={Position.Right} id="source-fallback" className="!opacity-0 !w-0 !h-0 !border-none !top-1/2" />
        
        {data.columns?.map((colInfo: string, i: number) => {
          const colName = colInfo.split(' ')[0];
          return (
            <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-md hover:bg-slate-50 transition-colors relative group/row">
              <span className="text-[11px] font-medium text-slate-600 truncate max-w-[180px]">{colInfo}</span>
              <Handle 
                type="source" 
                position={Position.Right} 
                id={colName} 
                className="!w-2 !h-2 !bg-primary/40 !border-none !-right-1 opacity-0 group-hover/row:opacity-100 transition-opacity" 
              />
              <Handle 
                type="target" 
                position={Position.Left} 
                id={colName} 
                className="!w-2 !h-2 !bg-primary/40 !border-none !-left-1 opacity-0 group-hover/row:opacity-100 transition-opacity" 
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const nodeTypes = {
  table: TableNode,
};

interface ERDiagramViewProps {
  tables: string[];
}

export const ERDiagramView: React.FC<ERDiagramViewProps> = ({ tables }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDiagramData = useCallback(async () => {
    if (!tables || tables.length === 0) return;
    
    setIsLoading(true);
    setError(null);
    try {
      console.log('🚀 Fetching ER Diagram for tables:', tables);
      const response = await api.post('/project/er-diagram', { tables });
      console.log('✅ ER Diagram Response:', response.data);
      
      if (response.data.error) {
        setError(response.data.error);
        return;
      }

      const rawNodes = response.data.nodes || [];
      const factNode = rawNodes.find((n: any) => n.data?.isFactTable);
      const dimensionNodes = rawNodes.filter((n: any) => !n.data?.isFactTable);
      
      // Star Schema Layout Algorithm
      const processedNodes = rawNodes.map((node: any, index: number) => {
        let position = { x: 0, y: 0 };
        
        if (node.data?.isFactTable) {
          // Fact table in the center
          position = { x: 400, y: 300 };
        } else {
          // Dimension tables in a circle around the center
          const dimCount = dimensionNodes.length || 1;
          const dimIndex = dimensionNodes.indexOf(node);
          const angle = (dimIndex / dimCount) * 2 * Math.PI;
          
          // Dynamically increase radius based on table count (approx 100px per table)
          const radius = Math.max(600, (dimCount * 100) / (2 * Math.PI));
          
          // Fallback to grid if no fact table or if circle layout is too simple
          if (!factNode) {
            const cols = Math.ceil(Math.sqrt(rawNodes.length));
            position = { 
              x: (index % cols) * 350, 
              y: Math.floor(index / cols) * 450 
            };
          } else {
            position = { 
              x: 400 + Math.cos(angle) * radius, 
              y: 300 + Math.sin(angle) * radius 
            };
          }
        }

        return {
          ...node,
          type: 'table',
          position: { 
            x: isNaN(position.x) ? index * 100 : position.x, 
            y: isNaN(position.y) ? index * 100 : position.y 
          },
        };
      });

      setNodes(processedNodes);
      
      // Sanitize Edges: Ensure handles exist or use fallback
      const sanitizedEdges = (response.data.edges || []).map((edge: any) => {
        const sourceNode = processedNodes.find((n: any) => n.id === edge.source);
        const targetNode = processedNodes.find((n: any) => n.id === edge.target);
        
        if (!sourceNode || !targetNode) return edge;

        const sourceCols = sourceNode.data.columns.map((c: string) => c.split(' ')[0]);
        const targetCols = targetNode.data.columns.map((c: string) => c.split(' ')[0]);

        return {
          ...edge,
          sourceHandle: sourceCols.includes(edge.sourceHandle) ? edge.sourceHandle : 'source-fallback',
          targetHandle: targetCols.includes(edge.targetHandle) ? edge.targetHandle : 'target-fallback',
        };
      });

      setEdges(sanitizedEdges);
    } catch (err: any) {
      console.error('ER Diagram generation failed', err);
      setError('Failed to generate diagram. Please check your AI connection.');
    } finally {
      setIsLoading(false);
    }
  }, [tables, setNodes, setEdges]);

  useEffect(() => {
    fetchDiagramData();
  }, [fetchDiagramData]);

  return (
    <div className="h-[calc(100vh-140px)] w-full flex flex-col gap-6 p-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Database size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">AI Relationship Mapper</h2>
            <p className="text-sm text-slate-500 font-medium">
              Auto-inferring entity relationships across your database 
              <span className="ml-2 px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-400 uppercase tracking-widest">Drag to Pan • Scroll to Zoom</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchDiagramData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Regenerate
          </button>
          <button className="p-2.5 bg-slate-900 text-white rounded-xl shadow-lg hover:bg-slate-800 transition-all">
            <Share2 size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 glass rounded-3xl overflow-hidden border border-border bg-white/50 backdrop-blur-sm relative group">
        <AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/60 backdrop-blur-md"
            >
              <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Database size={20} className="text-indigo-600 animate-pulse" />
                </div>
              </div>
              <p className="mt-4 text-sm font-bold text-slate-900">Scanning relationships...</p>
              <p className="text-xs text-slate-500 mt-1">Gemini AI is analyzing your database schema</p>
            </motion.div>
          )}
        </AnimatePresence>

        {error ? (
          <div className="h-full flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
              <X size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Error Generating Diagram</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-md">{error}</p>
            <button 
              onClick={fetchDiagramData}
              className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm"
            >
              Try Again
            </button>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            connectionLineType={ConnectionLineType.SmoothStep}
            defaultEdgeOptions={{
              style: { strokeWidth: 3, stroke: '#ef4444' },
              animated: true,
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#ef4444',
              },
            }}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.05}
            maxZoom={2}
            className="bg-slate-50/30"
          >
            <Background color="#cbd5e1" gap={20} size={1} />
            <Controls className="!bg-white !border-slate-200 !rounded-xl !shadow-xl" />
          </ReactFlow>
        )}
      </div>
    </div>
  );
};

function RefreshCw(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

function X(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
