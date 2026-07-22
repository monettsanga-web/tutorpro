"use client";

import React, { useState } from "react";
import { FileText, Eye, EyeOff, Shield, Download, Play, RefreshCw } from "lucide-react";

interface SecureFile {
  id: string;
  name: string;
  url: string;
  fileType: string;
  fileSize: number;
  source: string;
}

export default function SecureFileViewer({
  file,
  isTeacher,
  onShareToWhiteboard,
}: {
  file: SecureFile;
  isTeacher: boolean;
  onShareToWhiteboard: (file: SecureFile) => void;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(true);

  // File categories
  const lowerName = file.name.toLowerCase();
  const isPdf = lowerName.endsWith(".pdf");
  const isOfficeDoc = lowerName.endsWith(".pptx") || lowerName.endsWith(".ppt") || lowerName.endsWith(".docx") || lowerName.endsWith(".doc");
  const isImage = lowerName.endsWith(".png") || lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg");

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleShareClick = () => {
    onShareToWhiteboard(file);
  };

  return (
    <div className="flex items-center justify-between p-3.5 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-all gap-4">
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div className="w-11 h-11 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-100 truncate" title={file.name}>
            {file.name}
          </p>
          <p className="text-[10px] text-slate-400 mt-1 font-semibold">
            {formatSize(file.fileSize)} • {file.fileType.toUpperCase()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isProcessing && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-md font-semibold animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Processing
          </div>
        )}

        {isReady && (
          <button
            onClick={handleShareClick}
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-md transition-all"
            title="Present file on whiteboard publicly"
          >
            <Play className="w-3 h-3 fill-white" />
            Share Board
          </button>
        )}

        {/* Secure File Info (Downloads completely blocked for security) */}
        <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800 border border-slate-750 px-2 py-1 rounded-md font-semibold">
          <Shield className="w-3 h-3 text-blue-400" />
          Secure Preview
        </span>
      </div>
    </div>
  );
}
