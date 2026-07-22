"use client";

import React, { useRef, useState, useEffect } from "react";
import { 
  PenTool, Circle, Square, Eraser, Trash2, Move, Type, Sparkles 
} from "lucide-react";

interface CanvasElement {
  id: string;
  type: "pen" | "rect" | "circle" | "text" | "sticky";
  points?: { x: number; y: number }[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color: string;
  text?: string;
}

export default function WhiteboardCanvas({
  isTeacher,
  roomId,
  onSyncElements,
}: {
  isTeacher: boolean;
  roomId: string;
  onSyncElements?: (elements: CanvasElement[]) => void;
}) {
  const [tool, setTool] = useState<CanvasElement["type"] | "select">("pen");
  const [color, setColor] = useState("#EF4444");
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const startPan = useRef({ x: 0, y: 0 });
  const activeLine = useRef<{ x: number; y: number }[]>([]);

  useEffect(() => {
    drawWhiteboard();
  }, [elements, panOffset, zoom, tool]);

  const drawWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear and redraw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    
    // Apply pan and zoom offsets (Infinite Canvas effect)
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    elements.forEach((el) => {
      ctx.strokeStyle = el.color;
      ctx.fillStyle = el.color;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (el.type === "pen" && el.points && el.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i].x, el.points[i].y);
        }
        ctx.stroke();
      } else if (el.type === "rect" && el.x !== undefined && el.y !== undefined) {
        ctx.strokeRect(el.x, el.y, el.width || 0, el.height || 0);
      } else if (el.type === "circle" && el.x !== undefined && el.y !== undefined) {
        ctx.beginPath();
        const radius = Math.max(Math.abs(el.width || 0), Math.abs(el.height || 0)) / 2;
        ctx.arc(el.x + radius, el.y + radius, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (el.type === "text" && el.x !== undefined && el.y !== undefined) {
        ctx.font = "16px sans-serif";
        ctx.fillText(el.text || "", el.x, el.y);
      }
    });

    ctx.restore();
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Inverse matrix offsets for infinite pan and zoom
    const x = (e.clientX - rect.left - panOffset.x) / zoom;
    const y = (e.clientY - rect.top - panOffset.y) / zoom;
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const pos = getCanvasCoords(e);

    if (tool === "select") {
      startPan.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
    } else if (tool === "pen") {
      activeLine.current = [pos];
    } else if (tool === "rect" || tool === "circle") {
      const newEl: CanvasElement = {
        id: Math.random().toString(),
        type: tool,
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        color,
      };
      setElements((prev) => [...prev, newEl]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pos = getCanvasCoords(e);

    if (tool === "select") {
      setPanOffset({
        x: e.clientX - startPan.current.x,
        y: e.clientY - startPan.current.y,
      });
    } else if (tool === "pen") {
      activeLine.current = [...activeLine.current, pos];
      // Live draw line
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx && activeLine.current.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.moveTo(activeLine.current[activeLine.current.length - 2].x, activeLine.current[activeLine.current.length - 2].y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }
    } else if (tool === "rect" || tool === "circle") {
      setElements((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.x !== undefined && last.y !== undefined) {
          last.width = pos.x - last.x;
          last.height = pos.y - last.y;
        }
        return updated;
      });
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    if (tool === "pen" && activeLine.current.length > 1) {
      const newEl: CanvasElement = {
        id: Math.random().toString(),
        type: "pen",
        points: activeLine.current,
        color,
      };
      setElements((prev) => [...prev, newEl]);
      activeLine.current = [];
    }

    onSyncElements?.(elements);
  };

  const clearCanvas = () => {
    setElements([]);
    setPanOffset({ x: 0, y: 0 });
    setZoom(1);
    onSyncElements?.([]);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative select-none">
      
      {/* Canvas Tool Sidebar */}
      <div className="absolute left-3 top-3 z-10 flex flex-col gap-2 p-2 bg-slate-950/80 backdrop-blur-md rounded-xl border border-slate-800">
        <button
          onClick={() => setTool("pen")}
          className={`p-2 rounded-lg transition-colors ${tool === "pen" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800"}`}
          title="Pen Tool"
        >
          <PenTool className="w-5 h-5" />
        </button>

        <button
          onClick={() => setTool("rect")}
          className={`p-2 rounded-lg transition-colors ${tool === "rect" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800"}`}
          title="Rectangle Shape"
        >
          <Square className="w-5 h-5" />
        </button>

        <button
          onClick={() => setTool("circle")}
          className={`p-2 rounded-lg transition-colors ${tool === "circle" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800"}`}
          title="Circle Shape"
        >
          <Circle className="w-5 h-5" />
        </button>

        <button
          onClick={() => setTool("select")}
          className={`p-2 rounded-lg transition-colors ${tool === "select" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800"}`}
          title="Pan & Move"
        >
          <Move className="w-5 h-5" />
        </button>

        <div className="h-px bg-slate-800 my-1" />

        {/* Color Palette */}
        {["#EF4444", "#10B981", "#3B82F6", "#F59E0B"].map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className="w-5 h-5 rounded-full border border-slate-700 hover:scale-110 transition-transform"
            style={{ 
              backgroundColor: c,
              boxShadow: color === c ? "0 0 0 2px #fff" : "none"
            }}
          />
        ))}

        <div className="h-px bg-slate-800 my-1" />

        <button
          onClick={clearCanvas}
          className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
          title="Clear Board"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Main Drawing viewport */}
      <div className="flex-1 relative bg-slate-950">
        <canvas
          ref={canvasRef}
          width={1000}
          height={650}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className={`w-full h-full cursor-crosshair ${tool === "select" ? "cursor-grab active:cursor-grabbing" : ""}`}
        />
      </div>

      {/* Footer Details */}
      <div className="flex justify-between items-center px-4 py-2 bg-slate-950/60 border-t border-slate-850/80 text-[11px] text-slate-400">
        <span>TutorPro Whiteboard Engine v2.0</span>
        <div className="flex items-center gap-2">
          <span>Pan: ({panOffset.x}, {panOffset.y})</span>
          <span>•</span>
          <span>Zoom: {Math.round(zoom * 100)}%</span>
        </div>
      </div>

    </div>
  );
}
