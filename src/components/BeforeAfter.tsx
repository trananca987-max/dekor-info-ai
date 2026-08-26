// До/После: слайдер-шторка с перетаскиванием (input range поверх).
import { useRef, useState } from 'react';

interface Props {
  before: string;
  after: string;
  height?: number;
  labelBefore?: string;
  labelAfter?: string;
  initial?: number; // 0..100
}

export default function BeforeAfter({ before, after, height = 270,
  labelBefore = 'До', labelAfter = 'После', initial = 42 }: Props) {
  const [pos, setPos] = useState(initial);
  const boxRef = useRef<HTMLDivElement>(null);

  return (
    <div className="ba" style={{ height }} ref={boxRef}>
      <img className="im" src={before} alt={labelBefore}
        onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }} />
      <div className="after" style={{ clipPath: `polygon(${pos}% 0,100% 0,100% 100%,${pos}% 100%)` }}>
        <img className="im" src={after} alt={labelAfter}
          onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }} />
      </div>
      <div className="hd" style={{ left: `${pos}%` }} />
      <div className="knob" style={{ left: `${pos}%` }}>⇄</div>
      <span className="lbl" style={{ left: 10 }}>{labelBefore}</span>
      <span className="lbl" style={{ right: 10 }}>{labelAfter}</span>
      <input className="range" type="range" min={0} max={100} value={pos} aria-label="До и после"
        onChange={(e) => setPos(Number(e.target.value))} />
    </div>
  );
}
