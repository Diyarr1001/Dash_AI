import React, { useCallback, useState } from 'react';
import { Upload, File, X, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FileUploaderProps {
  onUploadSuccess: (data: any) => void;
}

export const FileUploader = ({ onUploadSuccess }: FileUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      validateAndSetFile(files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validTypes = ['.csv', '.xlsx', '.xls', '.json', '.parquet'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validTypes.includes(ext)) {
      setError('Unsupported file type. Please upload CSV, Excel, or JSON.');
      return;
    }
    
    setError(null);
    setFile(file);
    uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setStatus('uploading');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/data/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setStatus('success');
      onUploadSuccess(response.data);
    } catch (err: any) {
      setStatus('error');
      setError(err.response?.data?.detail || 'Upload failed');
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-3xl p-12 transition-all duration-200 flex flex-col items-center justify-center gap-4 text-center",
          isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-slate-200 bg-white hover:border-slate-300",
          status === 'error' && "border-red-200 bg-red-50"
        )}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileSelect}
          accept=".csv,.xlsx,.xls,.json,.parquet"
        />

        {status === 'idle' && (
          <>
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-2">
              <Upload size={32} className="text-slate-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">Drop your data here</p>
              <p className="text-sm text-slate-500 mt-1">Supports CSV, Excel, JSON, and Parquet</p>
            </div>
          </>
        )}

        {status === 'uploading' && (
          <>
            <Loader2 size={40} className="text-primary animate-spin mb-2" />
            <div>
              <p className="text-lg font-bold text-slate-900">Uploading {file?.name}...</p>
              <p className="text-sm text-slate-500 mt-1">We're preparing your dataset for analysis</p>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 size={40} className="text-green-500 mb-2" />
            <div>
              <p className="text-lg font-bold text-slate-900">Upload Complete!</p>
              <p className="text-sm text-slate-500 mt-1">{file?.name} is ready</p>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <X size={40} className="text-red-500 mb-2" />
            <div>
              <p className="text-lg font-bold text-red-900">Upload Failed</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setStatus('idle'); setFile(null); }}
              className="mt-4 text-sm font-semibold text-slate-600 hover:text-slate-900"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
};
