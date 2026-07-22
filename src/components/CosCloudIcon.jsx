import React, { useState, useEffect, useRef } from 'react';
import { Cloud, Upload, Play, AlertCircle, X, Download, FileText, RefreshCw } from 'lucide-react';
import { TutorProCosUploader } from '../utils/cosUpload.js';

export const CosCloudIcon = ({
  bookingId,
  supabaseToken,
  supabaseUrl,
  onShareDocument,
  isTeacher,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState('none');
  const [activeUploadName, setActiveUploadName] = useState('');
  const uploadControls = useRef(null);
  
  const fileInputRef = useRef(null);
  const uploader = useRef(null);

  useEffect(() => {
    uploader.current = new TutorProCosUploader(bookingId, supabaseToken, supabaseUrl);
    fetchClassroomFiles();
  }, [bookingId]);

  const fetchClassroomFiles = async () => {
    try {
      // Simulate retrieving metadata from secure bucket/DB
      const simulatedFiles = [
        {
          id: '1',
          name: 'Lesson_1_Intro_to_Phonics.pptx',
          key: `classrooms/${bookingId}/Lesson_1_Intro_to_Phonics.pptx`,
          size: 15420000,
          type: 'ppt',
          status: 'ready',
          url: `https://mock-bucket.cos.ap-singapore.myqcloud.com/classrooms/${bookingId}/Lesson_1_Intro_to_Phonics.pptx`
        },
        {
          id: '2',
          name: 'Phonics_Exercise_Book.pdf',
          key: `classrooms/${bookingId}/Phonics_Exercise_Book.pdf`,
          size: 4210000,
          type: 'pdf',
          status: 'ready',
          url: `https://mock-bucket.cos.ap-singapore.myqcloud.com/classrooms/${bookingId}/Phonics_Exercise_Book.pdf`
        },
        {
          id: '3',
          name: 'interactive_game.edb',
          key: `classrooms/${bookingId}/interactive_game.edb`,
          size: 2150000,
          type: 'edb',
          status: 'none',
          url: `https://mock-bucket.cos.ap-singapore.myqcloud.com/classrooms/${bookingId}/interactive_game.edb`
        }
      ];
      setFiles(simulatedFiles);
    } catch (error) {
      console.error("Error loading classroom files:", error);
    }
  };

  const determineFileType = (fileName) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['ppt', 'pptx'].includes(ext || '')) return 'ppt';
    if (['pdf'].includes(ext || '')) return 'pdf';
    if (['doc', 'docx'].includes(ext || '')) return 'word';
    if (['png', 'jpg', 'jpeg', 'gif'].includes(ext || '')) return 'image';
    if (['edb'].includes(ext || '')) return 'edb';
    if (['epub'].includes(ext || '')) return 'epub';
    return 'other';
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !uploader.current) return;

    setActiveUploadName(file.name);
    setIsUploading(true);
    setUploadProgress(0);
    setUploadState('uploading');

    try {
      const result = await uploader.current.uploadFile({
        file,
        onProgress: (progress, state) => {
          if (!isNaN(progress)) setUploadProgress(progress);
          setUploadState(state);
        },
        onTaskCreated: (controls) => {
          uploadControls.current = controls;
        }
      });

      const fileType = determineFileType(file.name);
      const isConvertible = ['ppt', 'pdf', 'word'].includes(fileType);
      
      const newFile = {
        id: Math.random().toString(),
        name: file.name,
        key: result.key,
        size: file.size,
        type: fileType,
        status: isConvertible ? 'processing' : 'none',
        url: result.url,
      };

      setFiles(prev => [newFile, ...prev]);
      setUploadState('success');
      setTimeout(() => {
        setIsUploading(false);
        setActiveUploadName('');
      }, 2000);

      if (isConvertible) {
        simulateConversion(newFile.id);
      }

    } catch (error) {
      console.error("Upload error:", error);
      setUploadState('error');
    }
  };

  const simulateConversion = (fileId) => {
    setTimeout(() => {
      setFiles(prev => prev.map(f => {
        if (f.id === fileId) {
          return { ...f, status: 'ready' };
        }
        return f;
      }));
    }, 5000);
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="relative inline-block text-left z-30">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors border ${
          isOpen 
            ? 'bg-blue-600 text-white border-blue-600' 
            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm'
        }`}
        title="Tencent COS Cloud Files"
      >
        <Cloud className="w-5 h-5" />
        <span className="text-sm font-medium hidden sm:inline">Files</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-h-[500px] flex flex-col bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden text-slate-800">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Cloud Storage</h3>
              <p className="text-xs text-slate-500">Tencent COS private files for this lesson</p>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Upload Status / Actions */}
          <div className="p-4 border-b border-slate-100">
            {isUploading ? (
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5 font-medium">
                  <span className="truncate max-w-[200px]" title={activeUploadName}>{activeUploadName}</span>
                  <span>{uploadState === 'paused' ? 'Paused' : `${uploadProgress}%`}</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-3">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      uploadState === 'paused' ? 'bg-amber-500' : 'bg-blue-600'
                    }`} 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="flex justify-end gap-2 text-xs font-semibold">
                  {uploadState === 'uploading' && (
                    <button 
                      onClick={() => uploadControls.current?.pause()}
                      className="px-2.5 py-1 text-amber-600 bg-amber-50 rounded hover:bg-amber-100"
                    >
                      Pause
                    </button>
                  )}
                  {uploadState === 'paused' && (
                    <button 
                      onClick={() => uploadControls.current?.resume()}
                      className="px-2.5 py-1 text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                    >
                      Resume
                    </button>
                  )}
                  <button 
                    onClick={() => uploadControls.current?.cancel()}
                    className="px-2.5 py-1 text-rose-600 bg-rose-50 rounded hover:bg-rose-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              isTeacher && (
                <div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange}
                    className="hidden" 
                    accept=".ppt,.pptx,.pdf,.doc,.docx,.png,.jpg,.jpeg,.edb,.epub"
                  />
                  <button
                    onClick={handleUploadClick}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 shadow-sm transition-colors animate-pulse"
                  >
                    <Upload className="w-4 h-4" />
                    Upload File to COS
                  </button>
                  <p className="text-[10px] text-center text-slate-400 mt-1.5">
                    Supports PPT/X, PDF, DOC/X, EPUB, EDB, and images. Private to this booking.
                  </p>
                </div>
              )
            )}
          </div>

          {/* Files List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-[200px] max-h-[300px]">
            {files.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-slate-400">
                <Cloud className="w-8 h-8 stroke-1.5 mb-2" />
                <span className="text-xs">No files in cloud storage yet</span>
              </div>
            ) : (
              files.map((file) => (
                <div 
                  key={file.id} 
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 truncate" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {formatSize(file.size)} • {file.type.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 ml-2">
                    {file.status === 'processing' && (
                      <div className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded font-medium shrink-0 animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Converting
                      </div>
                    )}

                    {file.status === 'error' && (
                      <div className="flex items-center gap-1 text-[10px] text-rose-600 bg-rose-50 px-2 py-1 rounded font-medium shrink-0">
                        <AlertCircle className="w-3 h-3" />
                        Error
                      </div>
                    )}

                    {file.status === 'ready' && isTeacher && (
                      <button
                        onClick={() => onShareDocument(file)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded border border-emerald-100 transition-colors shrink-0"
                      >
                        <Play className="w-3 h-3 fill-emerald-700 text-emerald-700" />
                        Share
                      </button>
                    )}

                    {file.status === 'none' && (
                      <a
                        href={file.url}
                        download
                        className="flex items-center gap-1 px-2 py-1 text-[10px] bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold rounded border border-slate-200 transition-colors shrink-0"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
