import { Canvas } from '../../../../fabric';
import { useEffect, useRef } from 'react';
import { Cross } from './Cross';

export default function Demo() {
  const elRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!elRef.current) return;

    const canvas = new Canvas(elRef.current!, {
      width: elRef.current!.width,
      height: elRef.current!.height,
    });

    canvas.add(
      new Cross({
        top: 100,
        left: 100,
        fill: 'black',
      }),
      new Cross({
        top: 140,
        left: 230,
        fill: 'yellow',
      }),
      new Cross({
        top: 240,
        left: 210,
        fill: 'blue',
      }),
      new Cross({
        top: 200,
        left: 320,
        fill: 'red',
      }),
      new Cross({
        top: 350,
        left: 100,
        fill: 'green',
        borderColor: 'green',
      }),
    );

    requestAnimationFrame(() => {
      console.log(canvas, canvas.getObjects());
    });

    requestAnimationFrame(function animate() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.forEachObject((obj) => (obj as any).animateWidthHeight());
      canvas.requestRenderAll();
      requestAnimationFrame(animate);
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
