import React, { useEffect, useRef, useState } from 'react';
import { 
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, 
  Sparkles, Award, Lock, Unlock, PenTool, Eraser, FileImage
} from 'lucide-react';

export const WhiteboardSlides = ({
  fileId,
  fileName,
  fileUrl,
  totalSlides = 10,
  isTeacher,
  currentPage = 1,
  onPageChange,
}) => {
  const [zoomLevel, setZoomScale] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [syncToStudent, setSyncToStudent] = useState(true);
  const [activeTool, setActiveTool] = useState('none');
  const [penColor, setPenColor] = useState('#EF4444');
  
  const [hotspots, setHotspots] = useState({
    1: [
      { id: 'h1', x: 25, y: 40, type: 'star', triggered: false, label: 'Bonus Star!' },
      { id: 'h2', x: 70, y: 65, type: 'answer', triggered: false, label: 'Reveal Answer' },
    ],
    2: [
      { id: 'h3', x: 45, y: 35, type: 'game', triggered: false, label: 'Play Matching Game' },
    ]
  });

  const [annotations, setAnnotations] = useState({});
  const [currentLine, setCurrentLine] = useState([]);
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);

  // File type detection
  const lowerName = fileName?.toLowerCase() || '';
  const isPdf = lowerName.endsWith('.pdf') || (fileUrl?.toLowerCase() || '').includes('.pdf');
  const isImage = lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.gif');
  const isOfficeDoc = lowerName.endsWith('.pptx') || lowerName.endsWith('.ppt') || lowerName.endsWith('.docx') || lowerName.endsWith('.doc');

  useEffect(() => {
    redrawCanvas();
  }, [currentPage, annotations, zoomLevel]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      onPageChange?.(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalSlides) {
      onPageChange?.(currentPage + 1);
    }
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pageLines = annotations[currentPage] || [];
    pageLines.forEach(line => {
      if (line.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.moveTo(line.points[0].x * canvas.width, line.points[0].y * canvas.height);
      for (let i = 1; i < line.points.length; i++) {
        ctx.lineTo(line.points[i].x * canvas.width, line.points[i].y * canvas.height);
      }
      ctx.stroke();
    });
  };

  const getCanvasMousePos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height
    };
  };

  const handleMouseDown = (e) => {
    if (activeTool === 'none') return;
    isDrawing.current = true;
    const pos = getCanvasMousePos(e);
    setCurrentLine([pos]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing.current || activeTool === 'none') return;
    const pos = getCanvasMousePos(e);
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx && currentLine.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = activeTool === 'eraser' ? '#090510' : penColor;
      ctx.lineWidth = activeTool === 'eraser' ? 24 : 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      const lastPoint = currentLine[currentLine.length - 1];
      ctx.moveTo(lastPoint.x * canvas.width, lastPoint.y * canvas.height);
      ctx.lineTo(pos.x * canvas.width, pos.y * canvas.height);
      ctx.stroke();
    }

    setCurrentLine(prev => [...prev, pos]);
  };

  const handleMouseUp = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    if (currentLine.length > 1) {
      const newLine = {
        points: currentLine,
        color: activeTool === 'eraser' ? '#090510' : penColor,
        width: activeTool === 'eraser' ? 24 : 4
      };

      setAnnotations(prev => ({
        ...prev,
        [currentPage]: [...(prev[currentPage] || []), newLine]
      }));
    }
    setCurrentLine([]);
  };

  const handleClearAnnotations = () => {
    setAnnotations(prev => ({
      ...prev,
      [currentPage]: []
    }));
  };

  const handleHotspotClick = (hotspotId) => {
    setHotspots(prev => {
      const updated = { ...prev };
      updated[currentPage] = (updated[currentPage] || []).map(h => {
        if (h.id === hotspotId) {
          return { ...h, triggered: !h.triggered };
        }
        return h;
      });
      return updated;
    });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      background: '#0c071a',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      overflow: 'hidden',
      height: '100%',
      width: '100%',
      fontFamily: 'sans-serif',
      color: '#fff',
      boxSizing: 'border-box'
    }}>
      {/* Slide Whiteboard Header */}
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
            <h2 style={{ fontSize: '0.8rem', fontWeight: 'bold', margin: '0', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={fileName}>
              {fileName}
            </h2>
            <p style={{ fontSize: '0.6rem', color: '#b9adc7', margin: '2px 0 0 0' }}>
              {isRealPdf ? 'Live PDF View' : isOfficeDoc ? 'Microsoft Web PowerPoint/Doc View' : isImage ? 'Shared Image View' : 'Shared Courseware View'} (Secure Preview)
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isTeacher && (
            <button
              onClick={() => setSyncToStudent(!syncToStudent)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                background: syncToStudent ? 'rgba(188,233,78,0.15)' : 'rgba(255,255,255,0.05)',
                color: syncToStudent ? '#bce94e' : '#b9adc7',
                border: '1px solid rgba(188, 233, 78, 0.2)',
                borderRadius: '8px',
                fontSize: '0.68rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {syncToStudent ? <Lock style={{ width: '12px', height: '12px' }} /> : <Unlock style={{ width: '12px', height: '12px' }} />}
              <span>{syncToStudent ? 'Student Synced' : 'Sync Student'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Whiteboard Screen */}
      <div style={{
        flex: '1',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#090510',
        padding: '16px',
        minHeight: '300px',
        overflow: 'hidden'
      }}>
        <div 
          style={{ 
            position: 'relative',
            borderRadius: '10px',
            overflow: 'hidden',
            background: isImage ? 'transparent' : '#fff',
            width: `${zoomLevel}%`,
            aspectRatio: '4/3',
            maxWidth: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)',
            transition: 'width 0.2s ease-in-out'
          }}
        >
          {isRealPdf && (
            /* PDF VIEWER */
            <iframe
              src={`${fileUrl}#page=${currentPage}&toolbar=0&navpanes=0`}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                position: 'absolute',
                inset: 0,
                zIndex: 1
              }}
              title="PDF View"
            />
          )}

          {isOfficeDoc && (
            /* MICROSOFT WEB OFFICE VIEWER */
            <iframe
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                position: 'absolute',
                inset: 0,
                zIndex: 1
              }}
              title="Office Doc View"
            />
          )}

          {isImage && (
            /* IMAGE VIEWER */
            <img
              src={fileUrl}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                position: 'absolute',
                inset: 0,
                margin: 'auto',
                zIndex: 1
              }}
              alt="Shared View"
            />
          )}

          {!isRealPdf && !isOfficeDoc && !isImage && (
            /* PPT/IMAGE DEMO BACKDROP LAYER */
            <div style={{ position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', color: '#130a25', boxSizing: 'border-box' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: '850', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '1px', background: 'rgba(124,58,237,0.08)', padding: '2px 8px', borderRadius: '10px' }}>TutorPro Interactive Slide</span>
                <h1 style={{ fontSize: '1.4rem', fontWeight: '900', margin: '8px 0 0 0', color: '#130a25', lineHeight: '1.2' }}>
                  {currentPage === 1 && "Unit 1: Let's Learn Phonics!"}
                  {currentPage === 2 && "Sound of Short 'A' /æ/"}
                  {currentPage === 3 && "Interactive Vocabulary: APPLE"}
                  {currentPage === 4 && "Phonics Sound Recognition Game"}
                  {currentPage === 5 && "Excellent Work! Summary Quiz"}
                </h1>
              </div>

              <div style={{ marginTop: '16px', flex: '1', width: '100%', display: 'flex', alignItems: 'center', border: '2px dashed rgba(19,10,37,0.05)', borderRadius: '12px', padding: '16px', background: 'rgba(19,10,37,0.02)', boxSizing: 'border-box', justifyContent: 'center' }}>
                {currentPage === 1 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%' }}>
                    <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '12px', textAlign: 'center', border: '1px solid #fee2e2' }}>
                      <span style={{ fontSize: '2.5rem', display: 'block' }}>🍎</span>
                      <h3 style={{ fontWeight: 'bold', color: '#991b1b', fontSize: '0.75rem', margin: '4px 0 0 0' }}>A is for Apple</h3>
                    </div>
                    <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '12px', textAlign: 'center', border: '1px solid #dbeafe' }}>
                      <span style={{ fontSize: '2.5rem', display: 'block' }}>🐝</span>
                      <h3 style={{ fontWeight: 'bold', color: '#1e40af', fontSize: '0.75rem', margin: '4px 0 0 0' }}>B is for Bee</h3>
                    </div>
                  </div>
                )}
                {currentPage === 2 && (
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '4rem', fontWeight: '900', color: '#7c3aed', display: 'block' }}>Aa</span>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '10px' }}>
                      <span style={{ background: '#fff', px: '8px', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', fontSize: '0.7rem', fontWeight: 'bold' }}>Ant 🐜</span>
                      <span style={{ background: '#fff', px: '8px', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', fontSize: '0.7rem', fontWeight: 'bold' }}>Bat 🦇</span>
                      <span style={{ background: '#fff', px: '8px', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', fontSize: '0.7rem', fontWeight: 'bold' }}>Cat 🐱</span>
                    </div>
                  </div>
                )}
                {currentPage === 3 && (
                  <div style={{ textAlign: 'center', maxWidth: '240px' }}>
                    <div style={{ width: '80px', height: '80px', margin: '0 auto', background: '#fffbeb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fef3c7' }}>
                      <span style={{ fontSize: '3rem' }}>🍎</span>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: '#4b5563', marginTop: '10px', lineHeight: '1.4' }}>
                      Say the word: <span style={{ fontWeight: 'bold', color: '#111827' }}>A-P-P-L-E</span>. Practice the mouth shape for /æ/.
                    </p>
                  </div>
                )}
                {currentPage > 3 && (
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '2.5rem' }}>⭐️🏆⭐</span>
                    <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', margin: '8px 0 0 0' }}>Interactive Review Slide</p>
                    <p style={{ fontSize: '0.62rem', color: '#9ca3af', margin: '2px 0 0 0' }}>Use drawing tools to answer.</p>
                  </div>
                )}
              </div>

              <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.6rem', color: '#9ca3af', marginTop: '12px', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '10px' }}>
                <span>TutorPro English • Courseware Deck</span>
                <span>Slide {currentPage} of {totalSlides}</span>
              </div>
            </div>
          )}

          {/* Canvas Draw Overlay */}
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            style={{ position: 'absolute', inset: '0', width: '100%', height: '100%', zIndex: '10', cursor: 'crosshair' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          />

          {/* Simulated Hotspots Layer */}
          <div style={{ position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '20' }}>
            {(hotspots[currentPage] || []).map(hotspot => (
              <div
                key={hotspot.id}
                style={{ position: 'absolute', left: `${hotspot.x}%`, top: `${hotspot.y}%`, pointerEvents: 'auto' }}
              >
                <button
                  onClick={() => handleHotspotClick(hotspot.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    background: hotspot.triggered ? '#10b981' : '#fff',
                    color: hotspot.triggered ? '#fff' : '#1f2937',
                    border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: '20px',
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {hotspot.type === 'star' && <Award style={{ width: '12px', height: '12px', color: hotspot.triggered ? '#fff' : '#f59e0b' }} />}
                  {hotspot.type === 'game' && <Sparkles style={{ width: '12px', height: '12px', color: hotspot.triggered ? '#fff' : '#6366f1' }} />}
                  {hotspot.type === 'answer' && <Award style={{ width: '12px', height: '12px', color: hotspot.triggered ? '#fff' : '#3b82f6' }} />}
                  <span>{hotspot.label}</span>
                  {hotspot.triggered && hotspot.type === 'answer' && ' (REVEALED!)'}
                  {hotspot.triggered && hotspot.type === 'star' && ' (+10 Stars!)'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Classroom Control Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        background: '#150f29',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        {/* Drawing Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setActiveTool(activeTool === 'pen' ? 'none' : 'pen')}
            style={{
              padding: '6px',
              borderRadius: '6px',
              background: activeTool === 'pen' ? '#ef4444' : 'rgba(255,255,255,0.05)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex'
            }}
            title="Drawing Pen"
          >
            <PenTool style={{ width: '14px', height: '14px' }} />
          </button>
          
          <button
            onClick={() => setActiveTool(activeTool === 'eraser' ? 'none' : 'eraser')}
            style={{
              padding: '6px',
              borderRadius: '6px',
              background: activeTool === 'eraser' ? '#6366f1' : 'rgba(255,255,255,0.05)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex'
            }}
            title="Eraser"
          >
            <Eraser style={{ width: '14px', height: '14px' }} />
          </button>

          <button
            onClick={handleClearAnnotations}
            style={{
              padding: '4px 10px',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              fontSize: '0.65rem',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Clear Page
          </button>

          {activeTool === 'pen' && (
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '3px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
              {['#EF4444', '#10B981', '#3B82F6', '#F59E0B'].map(color => (
                <button
                  key={color}
                  onClick={() => setPenColor(color)}
                  style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '50%', 
                    backgroundColor: color, 
                    border: 'none',
                    outline: penColor === color ? '1px solid #fff' : 'none',
                    cursor: 'pointer'
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Navigation Page Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            style={{
              padding: '4px',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              opacity: currentPage === 1 ? '0.4' : '1',
              display: 'flex'
            }}
          >
            <ChevronLeft style={{ width: '16px', height: '16px' }} />
          </button>
          
          <span style={{ fontSize: '0.7rem', fontWeight: 'bold', background: '#090510', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
            Page {currentPage} / {totalSlides}
          </span>

          <button
            onClick={handleNextPage}
            disabled={currentPage === totalSlides}
            style={{
              padding: '4px',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              opacity: currentPage === totalSlides ? '0.4' : '1',
              display: 'flex'
            }}
          >
            <ChevronRight style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        {/* View Zoom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => setZoomScale(Math.max(50, zoomLevel - 10))}
            style={{ padding: '4px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex' }}
          >
            <ZoomOut style={{ width: '13px', height: '13px' }} />
          </button>
          <span style={{ fontSize: '0.65rem', fontWeight: 'bold', width: '32px', textAlign: 'center' }}>
            {zoomLevel}%
          </span>
          <button
            onClick={() => setZoomScale(Math.min(150, zoomLevel + 10))}
            style={{ padding: '4px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex' }}
          >
            <ZoomIn style={{ width: '13px', height: '13px' }} />
          </button>
          
          <button
            onClick={() => {
              setIsFullscreen(!isFullscreen);
              setZoomScale(100);
            }}
            style={{ padding: '4px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', marginLeft: '4px' }}
            title="Toggle Fit"
          >
            <Maximize2 style={{ width: '13px', height: '13px' }} />
          </button>
        </div>
      </div>
    </div>
  );
};
