/**
 * @archivo: WorldSpinner.tsx
 * @módulo: Common Components (Spinner Temático MW Panel)
 * @función: Spinner personalizado con globo terráqueo animado para MW Panel
 * @crítico: SÍ - Identidad visual del sistema, usado en Loading.tsx
 * @dependencias: Framer Motion para animaciones SVG
 * @no_modificar: Coordenadas SVG y gradientes sin testear proporciones
 * @relacionado_con: Loading.tsx, WorldLoader.tsx, LoadingPage.tsx
 */

/**
 * COMPONENTE: WorldSpinner
 * UBICACIÓN: /frontend/src/components/common/WorldSpinner.tsx
 * FUNCIÓN: Spinner temático de globo terráqueo con animaciones para MW Panel
 * NO USAR PARA: Loading de texto simple (usar Ant Design Spin)
 * PROPS CRÍTICAS:
 *   - size: 'small' | 'medium' | 'large' - Tamaño del globo (8px/12px/16px)
 *   - className: string - Clases CSS adicionales para posicionamiento
 * 
 * CARACTERÍSTICAS VISUALES:
 * - Globo terráqueo SVG con continentes detallados
 * - Gradientes radiales para efecto 3D realista
 * - Líneas de latitud/longitud para detalle geográfico
 * - Brillo/reflejo simulando iluminación solar
 * - 6 estrellas orbitales animadas alrededor del globo
 * 
 * ANIMACIONES IMPLEMENTADAS:
 * - Rotación Y 3D del globo (360°, 3s, linear infinite)
 * - Rotación de estrellas orbitales (360°, 8s, linear infinite)
 * - Pulsación individual de cada estrella (scale + opacity, 2s, staggered)
 * - Drop shadow para profundidad visual
 * 
 * SISTEMA DE TAMAÑOS:
 * - small: w-8 h-8 (32x32px) - Para botones y estados inline
 * - medium: w-12 h-12 (48x48px) - Default, uso general en Loading
 * - large: w-16 h-16 (64x64px) - Para splash screens y loading principal
 * 
 * ELEMENTOS SVG DETALLADOS:
 * - Base océanos: Círculo con gradiente azul radial (#60a5fa → #1e40af)
 * - Continentes: 3 paths representando América, Europa/África, Asia/Oceanía
 * - Rejilla geográfica: Líneas latitud/longitud con opacidad degradada
 * - Efecto brillo: Elipse blanca con gradiente para simular luz solar
 * 
 * PALETA DE COLORES:
 * - Océanos: Azules (#60a5fa, #3b82f6, #1e40af)
 * - Continentes: Verdes (#22c55e, #16a34a, #15803d)
 * - Rejilla: Azul medio (#3b82f6) con opacidades
 * - Estrellas: Amarillo (#fbbf24) con animación de brillo
 * 
 * OPTIMIZACIONES PERFORMANCE:
 * - SVG vectorial escalable sin pérdida de calidad
 * - Framer Motion con will-change automático
 * - Transform 3D para aceleración GPU
 * - Durations optimizadas para fluidez (no blocking)
 * 
 * INTEGRACIÓN CON LOADING SYSTEM:
 * - Usado como base en Loading.tsx
 * - Compatible con WorldLoader.tsx alternativo
 * - Consistente con identidad visual MW Panel
 * - Size responsive según contexto de uso
 * 
 * ESTADO ACTUAL: ✅ COMPONENTE POLISHED
 * - Animaciones fluidas en todos los navegadores
 * - SVG optimizado y escalable
 * - Performance probado en móviles/tablets
 * - Identidad visual coherente con marca MW Panel
 */

import React from 'react'
import { motion } from 'framer-motion'

interface WorldSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  className?: string
}

const WorldSpinner: React.FC<WorldSpinnerProps> = ({ 
  size = 'medium', 
  className = '' 
}) => {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  }

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <motion.div
        className={`${sizeClasses[size]} relative`}
        animate={{ rotateY: 360 }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-lg"
          style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }}
        >
          {/* Base del globo - océanos */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="url(#oceanGradient)"
            stroke="#1e40af"
            strokeWidth="2"
          />
          
          {/* Continentes - América */}
          <path
            d="M 25 30 Q 30 25 35 30 Q 32 35 30 40 Q 28 45 25 50 Q 23 45 22 40 Q 20 35 25 30"
            fill="#22c55e"
          />
          
          {/* Europa/África */}
          <path
            d="M 45 25 Q 52 28 55 35 Q 58 40 55 45 Q 52 50 48 48 Q 45 45 43 40 Q 42 35 45 25"
            fill="#16a34a"
          />
          
          {/* Asia/Oceanía */}
          <path
            d="M 65 35 Q 72 38 75 45 Q 78 52 75 58 Q 70 55 68 50 Q 65 45 63 40 Q 62 38 65 35"
            fill="#15803d"
          />
          
          {/* Líneas de latitud */}
          <line x1="10" y1="50" x2="90" y2="50" stroke="#3b82f6" strokeWidth="0.5" opacity="0.6" />
          <line x1="15" y1="35" x2="85" y2="35" stroke="#3b82f6" strokeWidth="0.5" opacity="0.4" />
          <line x1="15" y1="65" x2="85" y2="65" stroke="#3b82f6" strokeWidth="0.5" opacity="0.4" />
          
          {/* Líneas de longitud */}
          <ellipse cx="50" cy="50" rx="22" ry="45" fill="none" stroke="#3b82f6" strokeWidth="0.5" opacity="0.4" />
          <ellipse cx="50" cy="50" rx="35" ry="45" fill="none" stroke="#3b82f6" strokeWidth="0.5" opacity="0.3" />
          
          {/* Brillo/reflejo */}
          <ellipse
            cx="40"
            cy="35"
            rx="12"
            ry="8"
            fill="url(#shineGradient)"
            opacity="0.6"
          />
          
          <defs>
            {/* Gradiente para océanos */}
            <radialGradient id="oceanGradient" cx="0.3" cy="0.3">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1e40af" />
            </radialGradient>
            
            {/* Gradiente para el brillo */}
            <radialGradient id="shineGradient" cx="0.3" cy="0.3">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
        
        {/* Animación de estrellas alrededor (opcional) */}
        <motion.div
          className="absolute -inset-2"
          animate={{ rotate: 360 }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-yellow-300 rounded-full"
              style={{
                top: `${20 + Math.sin((i * 60) * Math.PI / 180) * 30}%`,
                left: `${50 + Math.cos((i * 60) * Math.PI / 180) * 30}%`,
              }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.3
              }}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  )
}

export default WorldSpinner