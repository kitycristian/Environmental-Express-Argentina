import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Pen, Eraser, Square, Circle, Minus, Undo2, Trash2, Save, X } from "lucide-react";

interface SketchEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (imageData: string) => void;
  initialImage?: string | null;
}

type Tool = "pen" | "eraser" | "line" | "rectangle" | "circle";

const colors = ["#000000", "#ff0000", "#0000ff", "#00aa00", "#ff8800", "#8800ff", "#666666"];

export function SketchEditor({ open, onOpenChange, onSave, initialImage }: SketchEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(2);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (open && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (initialImage) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          };
          img.src = initialImage;
        }
        saveToHistory();
      }
    }
  }, [open]);

  const saveToHistory = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
        setHistory(prev => [...prev.slice(-20), imageData]);
      }
    }
  };

  const undo = () => {
    if (history.length > 1 && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        const newHistory = [...history];
        newHistory.pop();
        const prevState = newHistory[newHistory.length - 1];
        if (prevState) {
          ctx.putImageData(prevState, 0, 0);
          setHistory(newHistory);
        }
      }
    }
  };

  const clearCanvas = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        saveToHistory();
      }
    }
  };

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPos(e);
    setStartPos(pos);
    setIsDrawing(true);
    
    if (tool === "pen" || tool === "eraser") {
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    
    const pos = getPos(e);
    
    if (tool === "pen") {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === "eraser") {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = lineWidth * 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    
    const pos = getPos(e);
    
    if (tool === "line") {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === "rectangle") {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.strokeRect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
    } else if (tool === "circle") {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
      ctx.beginPath();
      ctx.arc(startPos.x, startPos.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    setIsDrawing(false);
    saveToHistory();
  };

  const handleSave = () => {
    if (canvasRef.current) {
      const imageData = canvasRef.current.toDataURL("image/png");
      onSave(imageData);
      onOpenChange(false);
    }
  };

  const toolButtons: { tool: Tool; icon: React.ReactNode; label: string }[] = [
    { tool: "pen", icon: <Pen className="h-4 w-4" />, label: "Lápiz" },
    { tool: "eraser", icon: <Eraser className="h-4 w-4" />, label: "Borrador" },
    { tool: "line", icon: <Minus className="h-4 w-4" />, label: "Línea" },
    { tool: "rectangle", icon: <Square className="h-4 w-4" />, label: "Rectángulo" },
    { tool: "circle", icon: <Circle className="h-4 w-4" />, label: "Círculo" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Editor de Croquis</DialogTitle>
        </DialogHeader>
        
        <div className="flex gap-2 flex-wrap items-center border-b pb-3">
          <div className="flex gap-1 border-r pr-2">
            {toolButtons.map(({ tool: t, icon, label }) => (
              <Button
                key={t}
                variant={tool === t ? "default" : "outline"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setTool(t)}
                title={label}
              >
                {icon}
              </Button>
            ))}
          </div>
          
          <div className="flex gap-1 border-r pr-2">
            {colors.map((c) => (
              <button
                key={c}
                className={`w-6 h-6 rounded border-2 ${color === c ? "border-primary ring-2 ring-primary/50" : "border-gray-300"}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
          
          <div className="flex items-center gap-2 px-2 min-w-[120px]">
            <span className="text-xs text-muted-foreground">Grosor:</span>
            <Slider
              value={[lineWidth]}
              onValueChange={([v]) => setLineWidth(v)}
              min={1}
              max={10}
              step={1}
              className="w-20"
            />
            <span className="text-xs w-4">{lineWidth}</span>
          </div>
          
          <div className="flex gap-1 ml-auto">
            <Button variant="outline" size="sm" onClick={undo} disabled={history.length <= 1}>
              <Undo2 className="h-4 w-4 mr-1" /> Deshacer
            </Button>
            <Button variant="outline" size="sm" onClick={clearCanvas}>
              <Trash2 className="h-4 w-4 mr-1" /> Limpiar
            </Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto bg-gray-100 rounded border flex items-center justify-center p-2">
          <canvas
            ref={canvasRef}
            width={800}
            height={500}
            className="bg-white border shadow-sm cursor-crosshair max-w-full"
            style={{ maxHeight: "60vh" }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-1" /> Cancelar
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" /> Guardar Croquis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
