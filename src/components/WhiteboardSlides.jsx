import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, 
  Sparkles, Award, Lock, Unlock, PenTool, Eraser, Download, FileImage
} from 'lucide-react';

export const WhiteboardSlides = ({
  fileId,
  fileName,
  fileUrl,
  totalSlides = 5,
  isTeacher,
  onPageChange,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomScale] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [syncToStudent, setSyncToStudent] = useState(true);
  const [activeTool, setActiveTool] = useState('pen');
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

  useEffect(() => {
    redrawCanvas();
  }, [currentPage, annotations, zoomLevel]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      onPageChange?.(newPage);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalSlides) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      onPageChange?.(newPage);
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
      ctx.strokeStyle = activeTool === 'eraser' ? '#FFFFFF' : penColor;
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
        color: activeTool === 'eraser' ? '#FFFFFF' : penColor,
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
    <div className="flex flex-col bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl h-full select-none text-slate-100">
      {/* Slide Whiteboard Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-blue-500/10 text-blue-400 rounded-lg">
            <FileImage className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white truncate max-w-[240px]" title={fileName}>
              {fileName}
            </h2>
            <p className="text-[10px] text-slate-400">
              Shared Screen Slide Deck
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isTeacher && (
            <button
              onClick={() => setSyncToStudent(!syncToStudent)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded border transition-colors ${
                syncToStudent 
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                  : 'bg-slate-700 text-slate-300 border-slate-600'
              }`}
            >
              {syncToStudent ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              {syncToStudent ? 'Student Synced' : 'Sync Student'}
            </button>
          )}

          <a
            href={fileUrl}
            download
            className="p-1.5 text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded transition-colors"
            title="Download Original PPTX"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Main Whiteboard Screen */}
      <div className="flex-1 relative flex items-center justify-center bg-slate-950 p-4 min-h-[350px]">
        <div 
          className="relative rounded-lg shadow-lg border border-slate-800 overflow-hidden bg-white max-w-full aspect-[4/3] flex flex-col items-center justify-center"
          style={{ 
            width: `${zoomLevel}%`,
            transition: 'width 0.2s ease-in-out'
          }}
        >
          {/* Simulated PPT Content Page */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-slate-800 select-none">
            <div className="text-center">
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">TutorPro Interactive Slide</span>
              <h1 className="text-2xl font-bold mt-1.5 text-slate-900">
                {currentPage === 1 && "Unit 1: Let's Learn Phonics!"}
                {currentPage === 2 && "Sound of Short 'A' /æ/"}
                {currentPage === 3 && "Interactive Vocabulary: APPLE"}
                {currentPage === 4 && "Phonics Sound Recognition Game"}
                {currentPage === 5 && "Excellent Work! Summary Quiz"}
              </h1>
            </div>

            <div className="mt-6 flex-1 w-full flex items-center justify-center border-2 border-dashed border-slate-100 rounded-lg p-4 bg-slate-50/50">
              {currentPage === 1 && (
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="bg-red-50 p-4 rounded-xl text-center border border-red-100">
                    <span className="text-4xl">🍎</span>
                    <h3 className="font-bold text-red-800 text-sm mt-1">A is for Apple</h3>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-xl text-center border border-blue-100">
                    <span className="text-4xl">🐝</span>
                    <h3 className="font-bold text-blue-800 text-sm mt-1">B is for Bee</h3>
                  </div>
                </div>
              )}
              {currentPage === 2 && (
                <div className="text-center">
                  <span className="text-6xl animate-bounce inline-block font-extrabold text-blue-600">Aa</span>
                  <div className="flex gap-3 justify-center mt-4">
                    <span className="bg-white px-3 py-1.5 rounded-lg border shadow-sm text-sm font-semibold">Ant 🐜</span>
                    <span className="bg-white px-3 py-1.5 rounded-lg border shadow-sm text-sm font-semibold">Bat 🦇</span>
                    <span className="bg-white px-3 py-1.5 rounded-lg border shadow-sm text-sm font-semibold">Cat 🐱</span>
                  </div>
                </div>
              )}
              {currentPage === 3 && (
                <div className="text-center max-w-sm">
                  <div className="w-32 h-32 mx-auto bg-amber-50 rounded-full flex items-center justify-center border border-amber-200">
                    <span className="text-6xl">🍎</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-4 leading-relaxed">
                    Say the word: <span className="font-bold text-slate-900 text-base">A-P-P-L-E</span>. Practice the mouth shape for the /æ/ sound.
                  </p>
                </div>
              )}
              {currentPage > 3 && (
                <div className="text-center">
                  <span className="text-5xl">⭐️🏆⭐</span>
                  <p className="text-sm font-bold text-slate-700 mt-3">Interactive Review Slide</p>
                  <p className="text-xs text-slate-400 mt-1">Use matching and drawing tools to answer.</p>
                </div>
              )}
            </div>

            <div className="w-full flex items-center justify-between text-[10px] text-slate-400 mt-4 border-t border-slate-100 pt-3">
              <span>TutorPro English • Courseware Deck</span>
              <span>Slide {currentPage} of {totalSlides}</span>
            </div>
          </div>

          {/* Canvas Draw Overlay */}
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="absolute inset-0 w-full h-full z-10 cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          />

          {/* Simulated Hotspots Layer */}
          <div className="absolute inset-0 w-full h-full pointer-events-none z-20">
            {(hotspots[currentPage] || []).map(hotspot => (
              <div
                key={hotspot.id}
                className="absolute pointer-events-auto"
                style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
              >
                <button
                  onClick={() => handleHotspotClick(hotspot.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-lg border text-xs font-bold transition-all transform hover:scale-105 active:scale-95 ${
                    hotspot.triggered
                      ? 'bg-emerald-600 text-white border-emerald-500 scale-105 animate-pulse'
                      : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {hotspot.type === 'star' && <Award className="w-4 h-4 text-amber-500" />}
                  {hotspot.type === 'game' && <Sparkles className="w-4 h-4 text-indigo-500" />}
                  {hotspot.type === 'answer' && <Award className="w-4 h-4 text-blue-500" />}
                  {hotspot.label}
                  {hotspot.triggered && hotspot.type === 'answer' && ' (REVEALED: /æ/ as in CAT)'}
                  {hotspot.triggered && hotspot.type === 'star' && ' (+100 Stars Added!)'}
                  {hotspot.triggered && hotspot.type === 'game' && ' (Game Active)'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Classroom Control Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-800 border-t border-slate-700">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTool(activeTool === 'pen' ? 'none' : 'pen')}
            className={`p-2 rounded-lg transition-colors ${
              activeTool === 'pen' ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            title="Drawing Pen"
          >
            <PenTool className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setActiveTool(activeTool === 'eraser' ? 'none' : 'eraser')}
            className={`p-2 rounded-lg transition-colors ${
              activeTool === 'eraser' ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            title="Eraser"
          >
            <Eraser className="w-4 h-4" />
          </button>

          <button
            onClick={handleClearAnnotations}
            className="px-2.5 py-1 text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-slate-300 rounded border border-slate-600 transition-colors"
          >
            Clear Page
          </button>

          {activeTool === 'pen' && (
            <div className="flex items-center gap-1 ml-1 bg-slate-900 p-1 rounded-md border border-slate-700">
              {['#EF4444', '#10B981', '#3B82F6', '#F59E0B'].map(color => (
                <button
                  key={color}
                  onClick={() => setPenColor(color)}
                  className="w-4 h-4 rounded-full border border-slate-600 transition-transform hover:scale-110"
                  style={{ 
                    backgroundColor: color,
                    transform: penColor === color ? 'scale(1.2)' : 'none'
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="p-1.5 bg-slate-700 text-slate-300 hover:text-white rounded disabled:opacity-40 disabled:hover:text-slate-300 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <span className="text-sm font-semibold text-white px-2.5 py-1 bg-slate-900 rounded-md border border-slate-700">
            Slide {currentPage} / {totalSlides}
          </span>

          <button
            onClick={handleNextPage}
            disabled={currentPage === totalSlides}
            className="p-1.5 bg-slate-700 text-slate-300 hover:text-white rounded disabled:opacity-40 disabled:hover:text-slate-300 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoomScale(Math.max(50, zoomLevel - 10))}
            className="p-1.5 bg-slate-700 text-slate-300 hover:text-white rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-slate-300 min-w-[36px] text-center">
            {zoomLevel}%
          </span>
          <button
            onClick={() => setZoomScale(Math.min(150, zoomLevel + 10))}
            className="p-1.5 bg-slate-700 text-slate-300 hover:text-white rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => {
              setIsFullscreen(!isFullscreen);
              setZoomScale(100);
            }}
            className="p-1.5 bg-slate-700 text-slate-300 hover:text-white rounded transition-colors ml-1"
            title="Toggle Fit"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
