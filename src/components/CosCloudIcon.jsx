import React, { useState, useEffect, useRef } from 'react';
import { Cloud, Upload, Play, AlertCircle, X, Download, FileText, RefreshCw, Users, Shield } from 'lucide-react';
import { TutorProCosUploader } from '../utils/cosUpload.js';

export const CosCloudIcon = ({
  bookingId,
  supabaseToken,
  supabaseUrl,
  onShareDocument,
  isTeacher,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('private'); // 'private' or 'shared'
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState('none');
  const [activeUploadName, setActiveUploadName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const uploadControls = useRef(null);
  
  const fileInputRef = useRef(null);
  const uploader = useRef(null);

  useEffect(() => {
    uploader.current = new TutorProCosUploader(bookingId, supabaseToken, supabaseUrl);
    fetchClassroomFiles();
  }, [bookingId]);

  const fetchClassroomFiles = async () => {
    try {
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
          id: 'shared-1',
          name: 'Global_English_Vocabulary_Warmup.pptx',
          key: `shared/Global_English_Vocabulary_Warmup.pptx`,
          size: 12450000,
          type: 'ppt',
          status: 'ready',
          url: `https://mock-bucket.cos.ap-singapore.myqcloud.com/shared/Global_English_Vocabulary_Warmup.pptx`
        },
        {
          id: 'shared-2',
          name: 'Verb_Tenses_Cheatsheet.pdf',
          key: `shared/Verb_Tenses_Cheatsheet.pdf`,
          size: 3100000,
          type: 'pdf',
          status: 'ready',
          url: `https://mock-bucket.cos.ap-singapore.myqcloud.com/shared/Verb_Tenses_Cheatsheet.pdf`
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
    setErrorMessage('');

    try {
      const isSharedUpload = activeTab === 'shared';
      const result = await uploader.current.uploadFile({
        file,
        onProgress: (progress, state) => {
          if (!isNaN(progress)) setUploadProgress(progress);
          setUploadState(state);
        },
        onTaskCreated: (controls) => {
          uploadControls.current = controls;
        },
        isShared: isSharedUpload
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
      setErrorMessage(error.message || 'Tencent COS upload failed');
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

  const filteredFiles = files.filter(f => {
    if (activeTab === 'shared') {
      return f.key.startsWith('shared/');
    } else {
      return f.key.startsWith('classrooms/');
    }
  });

  return (
    <div style={{ display: 'block', width: '100%', boxSizing: 'border-box', fontFamily: 'sans-serif' }}>
      
      {/* Cloud Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          background: isOpen ? 'rgba(188, 233, 78, 0.2)' : 'rgba(188, 233, 78, 0.1)',
          color: '#bce94e',
          border: '1px solid rgba(188, 233, 78, 0.3)',
          borderRadius: '16px',
          fontSize: '0.75rem',
          fontWeight: '800',
          cursor: 'pointer',
          transition: 'all 0.2s',
          width: '100%',
          justifyContent: 'center',
          boxSizing: 'border-box',
          marginBottom: '10px'
        }}
        title="Tencent COS Cloud Files"
      >
        <Cloud style={{ width: '15px', height: '15px' }} />
        <span>Tencent COS Cloud Files</span>
      </button>

      {isOpen && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(30, 20, 50, 0.65)',
          backdropFilter: 'blur(10px)',
          borderRadius: '14px',
          border: '1px solid rgba(188, 233, 78, 0.15)',
          padding: '12px',
          color: '#fff',
          gap: '10px',
          width: '100%',
          boxSizing: 'border-box',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '8px', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 'bold', margin: '0', color: '#fff' }}>Cloud Storage</h3>
              <p style={{ fontSize: '0.62rem', color: '#b9adc7', margin: '2px 0 0 0' }}>Tencent COS folders</p>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#b9adc7',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X style={{ width: '14px', height: '14px' }} />
            </button>
          </div>

          {/* TAB SELECTOR */}
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.2)', padding: '3px', borderRadius: '8px' }}>
            <button
              onClick={() => { setActiveTab('private'); setErrorMessage(''); }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '6px',
                background: activeTab === 'private' ? 'rgba(188, 233, 78, 0.12)' : 'transparent',
                color: activeTab === 'private' ? '#bce94e' : '#b9adc7',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.65rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <Shield style={{ width: '11px', height: '11px' }} />
              This Class
            </button>
            <button
              onClick={() => { setActiveTab('shared'); setErrorMessage(''); }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '6px',
                background: activeTab === 'shared' ? 'rgba(188, 233, 78, 0.12)' : 'transparent',
                color: activeTab === 'shared' ? '#bce94e' : '#b9adc7',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.65rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <Users style={{ width: '11px', height: '11px' }} />
              Shared Library
            </button>
          </div>

          {/* Upload Action */}
          <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '8px' }}>
            {isUploading ? (
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#fff', marginBottom: '4px' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>{activeUploadName}</span>
                  <span>{uploadState === 'paused' ? 'Paused' : `${uploadProgress}%`}</span>
                </div>
                <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', height: '5px', borderRadius: '10px', overflow: 'hidden', marginBottom: '6px' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      background: uploadState === 'paused' ? '#f59e0b' : uploadState === 'error' ? '#ef4444' : '#bce94e',
                      width: `${uploadProgress}%`,
                      transition: 'width 0.2s ease-in-out'
                    }}
                  />
                </div>
                
                {errorMessage && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fca5a5', fontSize: '0.62rem', margin: '4px 0 6px 0', wordBreak: 'break-all' }}>
                    <AlertCircle style={{ width: '12px', height: '12px', shrink: '0' }} />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                  {uploadState === 'uploading' && (
                    <button 
                      onClick={() => uploadControls.current?.pause()}
                      style={{ padding: '2px 8px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: 'none', borderRadius: '4px', fontSize: '0.62rem', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      Pause
                    </button>
                  )}
                  {uploadState === 'paused' && (
                    <button 
                      onClick={() => uploadControls.current?.resume()}
                      style={{ padding: '2px 8px', background: 'rgba(188, 233, 78, 0.2)', color: '#bce94e', border: 'none', borderRadius: '4px', fontSize: '0.62rem', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      Resume
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      if (uploadControls.current) {
                        uploadControls.current.cancel();
                      } else {
                        setIsUploading(false);
                      }
                    }}
                    style={{ padding: '2px 8px', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', border: 'none', borderRadius: '4px', fontSize: '0.62rem', fontWeight: 'bold', cursor: 'pointer' }}
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
                    style={{ display: 'none' }}
                    accept=".ppt,.pptx,.pdf,.doc,.docx,.png,.jpg,.jpeg,.edb,.epub"
                  />
                  <button
                    onClick={handleUploadClick}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      width: '100%',
                      padding: '8px',
                      background: 'linear-gradient(to right, #dafa8d, #bce94e)',
                      color: '#090510',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.72rem',
                      fontWeight: '850',
                      cursor: 'pointer',
                      transition: 'transform 0.1s'
                    }}
                  >
                    <Upload style={{ width: '13px', height: '13px' }} />
                    <span>Upload to {activeTab === 'shared' ? 'Shared Library' : 'This Class'}</span>
                  </button>
                </div>
              )
            )}
          </div>

          {/* Files List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
            {filteredFiles.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: '#b9adc7', fontSize: '0.68rem' }}>
                No files in this folder yet
              </div>
            ) : (
              filteredFiles.map((file) => (
                <div 
                  key={file.id} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    gap: '8px',
                    boxSizing: 'border-box'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '0', flex: '1' }}>
                    <div style={{ padding: '6px', background: 'rgba(188, 233, 78, 0.1)', color: '#bce94e', borderRadius: '6px', display: 'flex', alignItems: 'center' }}>
                      <FileText style={{ width: '13px', height: '13px' }} />
                    </div>
                    <div style={{ minWidth: '0', flex: '1' }}>
                      <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#fff', margin: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>
                        {file.name}
                      </p>
                      <p style={{ fontSize: '0.58rem', color: '#b9adc7', margin: '2px 0 0 0' }}>
                        {formatSize(file.size)} • {file.type.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', shrink: '0' }}>
                    {file.status === 'processing' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.58rem', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                        <RefreshCw style={{ width: '10px', height: '10px' }} className="animate-spin" />
                        Converting
                      </div>
                    )}

                    {file.status === 'ready' && isTeacher && (
                      <button
                        onClick={() => onShareDocument(file)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '4px 8px',
                          background: '#bce94e',
                          color: '#090510',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.65rem',
                          fontWeight: '850',
                          cursor: 'pointer'
                        }}
                      >
                        <Play style={{ width: '9px', height: '9px', fill: '#090510' }} />
                        Share
                      </button>
                    )}

                    {(file.status === 'none' || file.type === 'edb' || file.type === 'epub') && (
                      <a
                        href={file.url}
                        download
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '4px 8px',
                          background: 'rgba(255,255,255,0.08)',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '6px',
                          fontSize: '0.62rem',
                          textDecoration: 'none',
                          fontWeight: 'bold'
                        }}
                      >
                        <Download style={{ width: '9px', height: '9px' }} />
                        Get
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
