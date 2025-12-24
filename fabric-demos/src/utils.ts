import { useEffect, useRef, type RefObject } from 'react';
import { Canvas } from '../../fabric';

export function useInitCanvas(canvasRef: RefObject<HTMLCanvasElement | null>) {
  const fibricCanvasRef = useRef<Canvas | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    fibricCanvasRef.current = new Canvas(canvasRef.current!, {
      width: canvasRef.current!.width,
      height: canvasRef.current!.height,
    });

    return () => {
      fibricCanvasRef.current?.dispose();
    };
  }, []);

  return fibricCanvasRef;
}
