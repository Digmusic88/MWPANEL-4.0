import React from 'react';

const COLORS: Record<string, string> = { verde: '#2E7D52', naranja: '#B45309', roja: '#C43030' };
// boca: sonrisa (verde), recta (naranja), triste (roja)
const MOUTH: Record<string, string> = {
  verde: 'M 7 13 Q 11 17 15 13',
  naranja: 'M 7 14 L 15 14',
  roja: 'M 7 15 Q 11 11 15 15',
};

const TrafficLightFace: React.FC<{ level: string; size?: number }> = ({ level, size = 22 }) => {
  const c = COLORS[level] || '#bbb';
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-label={level}>
      <circle cx="11" cy="11" r="10" fill={c} />
      <circle cx="8" cy="9" r="1.4" fill="#fff" />
      <circle cx="14" cy="9" r="1.4" fill="#fff" />
      <path d={MOUTH[level] || MOUTH.naranja} stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
};
export default TrafficLightFace;
