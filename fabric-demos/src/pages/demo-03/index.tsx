import { useEffect, useRef } from 'react';
import data from './data.json';
import { useInitCanvas } from '../../utils';

export default function Demo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fibricCanvasRef = useInitCanvas(canvasRef);

  useEffect(() => {
    if (!fibricCanvasRef.current) return;

    fibricCanvasRef.current.loadFromJSON(data).then((canvas) => {
      canvas.requestRenderAll();
    });
  }, []);

  return (
    <div className="p-2 border rounded w-300 h-140">
      <canvas ref={canvasRef} width="1180" height="540"></canvas>
    </div>
  );
}
