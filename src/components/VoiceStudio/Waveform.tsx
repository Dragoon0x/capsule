import { useEffect, useRef } from 'react';

interface Props {
  level: number;
  active: boolean;
}

/**
 * Lightweight bar-graph waveform — 24 trailing bars updated each frame.
 */
export function Waveform({ level, active }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const bars = useRef<number[]>(new Array(24).fill(0));

  useEffect(() => {
    if (!active) {
      bars.current.fill(0);
      paint();
      return undefined;
    }
    let raf = 0;
    const step = (): void => {
      bars.current.shift();
      bars.current.push(level);
      paint();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active, level]);

  function paint(): void {
    const el = ref.current;
    if (!el) return;
    const children = el.children;
    for (let i = 0; i < bars.current.length; i += 1) {
      const child = children[i] as HTMLElement | undefined;
      if (!child) continue;
      const v = bars.current[i] ?? 0;
      const height = Math.max(3, Math.round(v * 40));
      child.style.height = `${height}px`;
      child.style.opacity = String(0.45 + v * 0.55);
    }
  }

  return (
    <div ref={ref} className="flex h-12 items-center justify-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 24 }, (_, i) => (
        <div
          key={i}
          className="w-1 rounded-full bg-primary transition-[height] duration-75 ease-ease"
          style={{ height: 3 }}
        />
      ))}
    </div>
  );
}
