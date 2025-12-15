import { Canvas } from '../../../../fabric';
import { useEffect, useRef } from 'react';

export default function Demo() {
  const elRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!elRef.current) return;

    const canvas = new Canvas(elRef.current!, {
      width: elRef.current!.width,
      height: elRef.current!.height,
    });

    return () => {
      canvas.dispose();
    };
  }, []);

  return (
    <div className="p-10 border rounded w-150 h-140">
      <canvas ref={elRef} width="500" height="500"></canvas>
    </div>
  );
}
