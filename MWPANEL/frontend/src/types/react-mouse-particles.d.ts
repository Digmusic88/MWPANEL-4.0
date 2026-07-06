declare module 'react-mouse-particles' {
  import React from 'react';

  interface MouseParticlesProps {
    g?: number;
    num?: number;
    radius?: number;
    life?: number;
    v?: number;
    tha?: number;
    alpha?: number;
    beta?: number;
    rps?: number;
    color?: string | string[];
    shape?: string | string[];
    fill?: boolean;
    simplify?: boolean;
    level?: number;
  }

  const MouseParticles: React.FC<MouseParticlesProps>;

  export default MouseParticles;
}
