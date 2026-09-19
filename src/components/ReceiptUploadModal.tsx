import React, { useState, useRef } from 'react';
import { Upload, Camera, FileText, Sparkles, X, AlertCircle } from 'lucide-react';
import { SAMPLE_RECEIPTS } from '../data/sampleReceipts';
import { ReceiptData } from '../types';

interface ReceiptUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalyzeImage: (base64: string, mimeType: string) => Promise<void>;
  onSelectSample: (sample: ReceiptData) => void;
  isAnalyzing: boolean;
  error?: string | null;
}

export const ReceiptUploadModal: React.FC<ReceiptUploadModalProps> = ({
  isOpen,
  onClose,
  onAnalyzeImage,
  onSelectSample,
  isAnalyzing,
  error,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ base64: string; mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPEG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setPreviewUrl(base64);
      setSelectedFile({ base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleStartAnalysis = async () => {
    if (!selectedFile) return;
    await onAnalyzeImage(selectedFile.base64, selectedFile.mimeType);
  };

  return (
    <div
      id="receipt-upload-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="receipt-upload-modal-card"
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Upload Receipt Photo
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gemini AI will scan items, quantities, prices, tax, and tip
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isAnalyzing}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Upload Drop Zone or Image Preview */}
          {previewUrl ? (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-56 bg-slate-950 flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt="Receipt Preview"
                  className="max-h-56 w-auto object-contain"
                />
                {!isAnalyzing && (
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewUrl(null);
                      setSelectedFile(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full text-xs backdrop-blur-xs transition-colors"
                    title="Remove and pick another photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  id="btn-analyze-receipt"
                  onClick={handleStartAnalysis}
                  disabled={isAnalyzing}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>Analyzing receipt with Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Parse Receipt with Gemini AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div
              id="receipt-drop-zone"
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                  : 'border-slate-300 dark:border-slate-700 hover:border-emerald-400 bg-slate-50/50 dark:bg-slate-800/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFile(e.target.files[0]);
                  }
                }}
              />
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Click or drag &amp; drop receipt photo
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Supports JPG, PNG, WEBP from your camera or files
              </p>
            </div>
          )}

          {/* Instant Sample Receipts */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Or try instant sample receipts:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SAMPLE_RECEIPTS.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => {
                    onSelectSample(sample);
                    onClose();
                  }}
                  className="p-2.5 text-left rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all text-xs"
                >
                  <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {sample.restaurantName}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                    {sample.items.length} items · ${sample.total.toFixed(2)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
