import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { LayoutDashboard, Calendar, ChevronRight, BarChart2, Trash2, Loader2 } from 'lucide-react';

interface PortfolioProps {
  onSelect?: (project: any) => void;
}

export const Portfolio = ({ onSelect }: PortfolioProps) => {
  const queryClient = useQueryClient();

  const { data: dashboards, isLoading } = useQuery({
    queryKey: ['dashboards'],
    queryFn: async () => {
      const response = await api.get('/dashboards/');
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/dashboards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
    },
  });

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // Don't open the project when clicking delete
    if (confirm('Are you sure you want to delete this dashboard?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl mb-1">Your Portfolio</h1>
          <p className="text-slate-500">Manage and share your published analytics projects.</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
          <button className="px-4 py-1.5 text-sm font-medium bg-slate-100 text-slate-900 rounded-lg">All Projects</button>
          <button className="px-4 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900">Shared</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {dashboards?.map((db: any) => (
          <div 
            key={db.id} 
            onClick={() => onSelect?.(db)}
            className="glass group rounded-[2rem] overflow-hidden flex flex-col hover:shadow-2xl hover:border-primary/20 transition-all duration-500 cursor-pointer relative"
          >
            <div className="h-48 bg-background/50 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-primary/5 group-hover:scale-110 transition-transform duration-700"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <BarChart2 size={48} className="text-text-muted/20 group-hover:text-primary/20 transition-colors" />
              </div>
              <div className="absolute top-4 right-4 flex gap-2">
                <button 
                  onClick={(e) => handleDelete(e, db.id)}
                  className="bg-card/80 hover:bg-red-500/10 hover:text-red-500 backdrop-blur-md p-2 rounded-xl border border-border shadow-sm transition-all"
                  title="Delete Project"
                >
                  {deleteMutation.isPending && deleteMutation.variables === db.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
                <div className="bg-card/80 backdrop-blur-md px-3 py-1 rounded-full border border-border shadow-sm">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Published</span>
                </div>
              </div>
            </div>
            
            <div className="p-8 space-y-4 flex-1 flex flex-col">
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">{db.title}</h3>
                <p className="text-sm text-text-muted line-clamp-2">{db.description || 'AI-generated analytics project.'}</p>
              </div>

              <div className="pt-4 mt-auto border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-text-muted">
                  <Calendar size={14} />
                  <span className="text-xs font-medium">
                    {new Date(db.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-primary font-bold text-xs uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                  Open Project <ChevronRight size={14} />
                </div>
              </div>
            </div>
          </div>
        ))}

        {dashboards?.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-slate-50/50">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
              <LayoutDashboard size={32} className="text-slate-300" />
            </div>
            <p className="text-lg font-bold text-slate-900">No projects yet</p>
            <p className="text-slate-500">Your published dashboards will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
};
