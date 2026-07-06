/**
 * @archivo: FadeInUp.tsx
 * @módulo: Animations (Animación Fade In desde Abajo)
 * @función: Componente de animación entrada suave desde abajo con fade
 * @crítico: NO - Animación cosmética opcional para mejorar UX
 * @dependencias: Framer Motion
 * @no_modificar: Ease curve timing sin verificar en dispositivos lentos
 * @relacionado_con: AnimatedModal.tsx, PageTransition.tsx, FadeInVariants.tsx
 */

/**
 * COMPONENTE: FadeInUp
 * UBICACIÓN: /frontend/src/components/animations/FadeInUp.tsx
 * FUNCIÓN: Animación de entrada suave desde abajo con fade in
 * NO USAR PARA: Animaciones complejas (usar AnimatedModal o custom variants)
 * PROPS CRÍTICAS:
 *   - children: ReactNode - Contenido a animar
 *   - delay: number - Retraso en segundos (default 0)
 *   - duration: number - Duración en segundos (default 0.6)
 *   - distance: number - Distancia vertical en px (default 30)
 * 
 * COMPORTAMIENTO DE ANIMACIÓN:
 * - Estado inicial: opacity 0, desplazado hacia abajo (y: +distance)
 * - Estado final: opacity 1, posición original (y: 0)
 * - Transición suave con ease curve personalizada
 * 
 * CONFIGURACIÓN DE EASING:
 * - Ease curve: [0.25, 0.46, 0.45, 0.94] - Cubic bezier suave
 * - Entrada natural sin rebote
 * - Optimizado para legibilidad de texto y contenido
 * 
 * CASOS DE USO TÍPICOS:
 * - Cards apareciendo en dashboards
 * - Contenido de formularios
 * - Elementos de lista secuenciales
 * - Texto y párrafos de información
 * 
 * PARÁMETROS PERSONALIZABLES:
 * - delay: Stagger múltiples elementos
 * - duration: Ajustar velocidad según contexto
 * - distance: Más sutil (15px) o más dramático (50px)
 * - className: Estilos adicionales CSS
 * 
 * OPTIMIZACIÓN PERFORMANCE:
 * - Transform y opacity son GPU-friendly
 * - Sin layout shifts durante animación
 * - Duration balanceada para fluidez
 * - No blocking animations
 * 
 * EJEMPLOS DE USO:
 * ```jsx
 * <FadeInUp delay={0.2}>
 *   <Card>Contenido</Card>
 * </FadeInUp>
 * 
 * <FadeInUp distance={50} duration={0.8}>
 *   <Title>Título Principal</Title>
 * </FadeInUp>
 * ```
 * 
 * INTEGRACIÓN CON SISTEMA:
 * - Parte del sistema de animaciones modular
 * - Compatible con otros componentes de animación
 * - Usado en componentes de layout
 * - Consistente con design system
 * 
 * ESTADO ACTUAL: ✅ ANIMACIÓN ESTABLE
 * - Performance optimizada
 * - Ease curve refinada para naturalidad
 * - Props configurables para flexibilidad
 * - Sin dependencias externas pesadas
 */

import React from 'react'
import { motion } from 'framer-motion'

interface FadeInUpProps {
  children: React.ReactNode
  delay?: number
  duration?: number
  distance?: number
  className?: string
}

const FadeInUp: React.FC<FadeInUpProps> = ({
  children,
  delay = 0,
  duration = 0.6,
  distance = 30,
  className = ''
}) => {
  return (
    <motion.div
      className={className}
      initial={{
        opacity: 0,
        y: distance
      }}
      animate={{
        opacity: 1,
        y: 0
      }}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number]
      }}
    >
      {children}
    </motion.div>
  )
}

export default FadeInUp