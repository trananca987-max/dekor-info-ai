// До/После: слайдер-шторка с перетаскиванием (input range поверх).
// PATCH v2.2 §7.2: стартовая позиция 50%, однократная анимация проводки от края
// (sweep), чтобы механика читалась без подписи. LQIP-заглушки до загрузки (§1.1).
import { useEffect, useRef, useState } from 'react';

interface Props {
  before: string;
  after: string;
  beforeLqip?: string;
  afterLqip?: string;
  height?: number;
  labelBefore?: string;
  labelAfter?: string;
  initial?: number; // 0..100
  sweep?: boolean;  // однократная анимация проводки от края
}

export default function BeforeAfter({ before, after, beforeLqip, afterLqip,
  height, labelBefore = 'До', labelAfter = 'После', initial = 50, sweep = false }: Props) {
  const [pos, setPos] = useState(sweep ? 8 : initial);
  const [dragging, setDragging] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const swept = useRef(false);

  // §7.2: однократная анимация проводки от края до стартовой позиции
  useEffect(() => {
    if (!sweep || swept.current) return;
    swept.current = true;
    const t = setTimeout(() => setPos(initial), 350);
    return () => clearTimeout(t);
  }, [sweep, initial]);

  const style: React.CSSProperties = height ? { height } : {};

  return (
    <div className={`ba ${dragging ? 'dragging' : ''}`} style={style} ref={boxRef}>
      <img className="im" src={before} alt={labelBefore}
        style={beforeLqip ? { background: `url(${beforeLqip}) center/cover` } : undefined}
        onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }} />
      <div className="after" style={{ clipPath: `polygon(${pos}% 0,100% 0,100% 100%,${pos}% 100%)` }}>
        <img className="im" src={after} alt={labelAfter}
          style={afterLqip ? { background: `url(${afterLqip}) center/cover` } : undefined}
          onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }} />
      </div>
      <div className="hd" style={{ left: `${pos}%` }} />
      <div className="knob" style={{ left: `${pos}%` }}>⇄</div>
      <span className="lbl" style={{ left: 10 }}>{labelBefore}</span>
      <span className="lbl" style={{ right: 10 }}>{labelAfter}</span>
      <input className="range" type="range" min={0} max={100} value={pos} aria-label="До и после"
        onPointerDown={() => setDragging(true)}
        onPointerUp={() => setDragging(false)}
        onChange={(e) => setPos(Number(e.target.value))} />
    </div>
  );
}
