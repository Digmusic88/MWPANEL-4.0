import React, { useEffect, useRef, useCallback } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  color: string;
  createdAt: number;
  angle: number;
  distance: number;
  speed: number;
}

interface BackgroundSparklesProps {
  colors?: string[];
  minSize?: number;
  maxSize?: number;
  particleCount?: number;
  fadeTime?: number;
  spread?: number;
  maxOpacity?: number;
}

const BackgroundSparkles: React.FC<BackgroundSparklesProps> = ({
  colors = ['rgba(147, 197, 253, 0.3)', 'rgba(191, 219, 254, 0.25)', 'rgba(224, 231, 255, 0.2)', 'rgba(199, 210, 254, 0.25)'],
  minSize = 2,
  maxSize = 4,
  particleCount = 8,
  fadeTime = 2000,
  spread = 150,
  maxOpacity = 0.35,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const idCounterRef = useRef(0);
  const lastPositionRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>();

  const createParticles = useCallback((x: number, y: number) => {
    const newParticles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      // Ángulo aleatorio para distribución circular (efecto ola)
      const angle = Math.random() * Math.PI * 2;
      // Distancia inicial pequeña, se expandirá con el tiempo
      const initialDistance = Math.random() * 20;

      newParticles.push({
        id: idCounterRef.current++,
        x: x,
        y: y,
        size: minSize + Math.random() * (maxSize - minSize),
        opacity: (0.1 + Math.random() * 0.25) * maxOpacity,
        color: colors[Math.floor(Math.random() * colors.length)],
        createdAt: Date.now(),
        angle: angle,
        distance: initialDistance,
        speed: 0.3 + Math.random() * 0.5, // Velocidad de expansión suave
      });
    }

    particlesRef.current = [...particlesRef.current, ...newParticles];

    // Limitar el número de partículas activas
    if (particlesRef.current.length > 100) {
      particlesRef.current = particlesRef.current.slice(-100);
    }
  }, [colors, minSize, maxSize, particleCount, maxOpacity]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const { clientX, clientY } = e;

    // Solo crear partículas si el ratón se ha movido suficiente
    const dx = clientX - lastPositionRef.current.x;
    const dy = clientY - lastPositionRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 30) { // Mayor distancia = menos frecuente
      createParticles(clientX, clientY);
      lastPositionRef.current = { x: clientX, y: clientY };
    }
  }, [createParticles]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ajustar tamaño del canvas
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      const now = Date.now();

      // Limpiar canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Actualizar y dibujar partículas
      particlesRef.current = particlesRef.current.filter(particle => {
        const age = now - particle.createdAt;
        if (age >= fadeTime) return false;

        const progress = age / fadeTime;

        // Efecto de ola: la distancia aumenta con el tiempo
        const currentDistance = particle.distance + (spread * progress * particle.speed);

        // Calcular posición actual con el efecto de expansión
        const currentX = particle.x + Math.cos(particle.angle) * currentDistance;
        const currentY = particle.y + Math.sin(particle.angle) * currentDistance;

        // Opacidad que se desvanece suavemente
        const fadeProgress = Math.pow(1 - progress, 0.5); // Desvanecimiento más suave
        const currentOpacity = particle.opacity * fadeProgress;

        // Dibujar partícula con glow muy sutil
        ctx.beginPath();
        ctx.arc(currentX, currentY, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color.replace(/[\d.]+\)$/, `${currentOpacity})`);
        ctx.fill();

        return true;
      });

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [fadeTime, spread]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
};

export default BackgroundSparkles;
