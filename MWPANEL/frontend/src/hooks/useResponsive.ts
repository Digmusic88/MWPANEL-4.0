import { useState, useEffect } from 'react';

export interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenSize: 'mobile' | 'tablet' | 'desktop';
  width: number;
  height: number;
}

// Breakpoints siguiendo Tailwind CSS
const BREAKPOINTS = {
  mobile: 768,    // sm
  tablet: 1024,   // lg
  desktop: 1280   // xl
};

// Función para calcular el estado responsive basado en el ancho
const getResponsiveState = (width: number, height: number): ResponsiveState => {
  const isMobile = width < BREAKPOINTS.mobile;
  const isTablet = width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet;
  const isDesktop = width >= BREAKPOINTS.tablet;

  let screenSize: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (isMobile) screenSize = 'mobile';
  else if (isTablet) screenSize = 'tablet';

  return { isMobile, isTablet, isDesktop, screenSize, width, height };
};

// Obtener estado inicial correcto (importante para evitar flash de contenido incorrecto)
const getInitialState = (): ResponsiveState => {
  if (typeof window !== 'undefined') {
    return getResponsiveState(window.innerWidth, window.innerHeight);
  }
  return {
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    screenSize: 'desktop',
    width: 1280,
    height: 720
  };
};

export const useResponsive = (): ResponsiveState => {
  const [state, setState] = useState<ResponsiveState>(getInitialState);

  useEffect(() => {
    const updateResponsiveState = () => {
      const newState = getResponsiveState(window.innerWidth, window.innerHeight);
      setState(newState);
    };

    // Ejecutar inmediatamente para asegurar estado correcto
    updateResponsiveState();

    // Listener para cambios de tamaño
    window.addEventListener('resize', updateResponsiveState);

    // Cleanup
    return () => {
      window.removeEventListener('resize', updateResponsiveState);
    };
  }, []);

  return state;
};

// Hook simplificado solo para mobile
export const useIsMobile = (): boolean => {
  const { isMobile } = useResponsive();
  return isMobile;
};

// Hook para breakpoints específicos
export const useBreakpoint = (breakpoint: keyof typeof BREAKPOINTS): boolean => {
  const { width } = useResponsive();
  return width < BREAKPOINTS[breakpoint];
};

// Utilidad para obtener clases Tailwind según dispositivo
export const getResponsiveClasses = (mobile: string, tablet: string = '', desktop: string = ''): string => {
  const classes = [mobile];
  if (tablet) classes.push(`md:${tablet}`);
  if (desktop) classes.push(`lg:${desktop}`);
  return classes.join(' ');
};