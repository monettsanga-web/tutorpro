import React from 'react';
import { ChevronLeft, ChevronRight, FileImage, Shield } from 'lucide-react';

export const WhiteboardSlides = ({
  fileId,
  fileName,
  fileUrl,
  totalSlides = 10,
  isTeacher,
  currentPage = 1,
  onPageChange,
}) => {
  const lowerName = fileName?.toLowerCase() || '';
  const isPdf = lowerName.endsWith('.pdf') || (fileUrl?.toLowerCase() || '').includes('.pdf');
  const isImage = lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.gif');
  const isOfficeDoc = lowerName.endsWith('.pptx') || lowerName.endsWith('.ppt') || lowerName.endsWith('.docx') || lowerName.endsWith('.doc');

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      background: '#0c071a',
      borderRadius: '12px',
      overflow: 'hidden',
      height: '100%',
      width: '100%',
      fontFamily: 'sans-serif',
      color: '#fff',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        background: '#150f29',
        borderBottom: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ padding: '6px', background: 'rgba(188,233,78,0.1)', color: '#bce94e', borderRadius: '6px', display: 'flex' }}>
            <FileImage style={{ width: '16px', height: '16px' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '0.8rem', fontWeight: 'bold', margin: '0' }}>
              {fileName}
            </h2>
            <p style={{ fontSize: '0.6rem', color: '#b9adc7', margin: '2px 0 0 0' }}>
              {isPdf ? 'Secure PDF Reader' : isOfficeDoc ? 'Microsoft Web PowerPoint' : 'Shared Courseware'}
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', color: '#b9adc7' }}>
          <Shield style={{ width: '12px', height: '12px', color: '#bce94e' }} />
          <span>Protected Preview</span>
        </div>
      </div>

      {/* Main viewport */}
      <div style={{ flex: 1, position: 'relative', background: '#090510', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isPdf && (
          <iframe
            src={`${fileUrl}#page=${currentPage}&toolbar=0&navpanes=0`}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="PDF View"
          />
        )}
        
        {isOfficeDoc && (
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Office View"
          />
        )}

        {isImage && (
          <img
            src={fileUrl}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            alt="Courseware View"
          />
        )}

        {!isPdf && !isOfficeDoc && !isImage && (
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <FileImage style={{ width: '48px', height: '48px', color: '#bce94e', marginBottom: '10px' }} />
            <p style={{ fontSize: '0.8rem', margin: '0' }}>Shared lesson courseware is loading...</p>
          </div>
        )}
      </div>

      {/* Footer toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px 16px',
        background: '#150f29',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        gap: '12px'
      }}>
        <button
          onClick={() => currentPage > 1 && onPageChange?.(currentPage - 1)}
          disabled={currentPage <= 1}
          style={{
            padding: '6px 12px',
            background: 'rgba(255,255,255,0.05)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            opacity: currentPage <= 1 ? '0.4' : '1',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.7rem',
            fontWeight: 'bold'
          }}
        >
          <ChevronLeft style={{ width: '14px', height: '14px' }} />
          Prev Page
        </button>

        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', background: '#090510', padding: '4px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
          Page {currentPage} / {totalSlides}
        </span>

        <button
          onClick={() => currentPage < totalSlides && onPageChange?.(currentPage + 1)}
          disabled={currentPage >= totalSlides}
          style={{
            padding: '6px 12px',
            background: 'rgba(255,255,255,0.05)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            opacity: currentPage >= totalSlides ? '0.4' : '1',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.7rem',
            fontWeight: 'bold'
          }}
        >
          Next Page
          <ChevronRight style={{ width: '14px', height: '14px' }} />
        </button>
      </div>
    </div>
  );
};
