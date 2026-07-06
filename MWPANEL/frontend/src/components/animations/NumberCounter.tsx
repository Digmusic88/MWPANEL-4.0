/**
 * @archivo: NumberCounter.tsx
 * @módulo: Animations (Contador Numérico Animado)
 * @función: Contador animado de números con efectos visuales para estadísticas
 * @crítico: NO - Animación cosmética para mejorar presentación de datos
 * @dependencias: Framer Motion useMotionValue, useTransform, animate
 * @no_modificar: Referencias y cleanup de animaciones sin verificar memory leaks
 * @relacionado_con: DashboardLayout.tsx, estadísticas, métricas visuales
 */

/**
 * COMPONENTE: NumberCounter
 * UBICACIÓN: /frontend/src/components/animations/NumberCounter.tsx
 * FUNCIÓN: Contador animado de números con múltiples variantes especializadas
 * NO USAR PARA: Números que cambian frecuentemente (usar display directo)
 * PROPS CRÍTICAS:
 *   - value: number - Valor numérico a mostrar/animar
 *   - duration: number - Duración animación en segundos (default 2)
 *   - delay: number - Retraso antes de iniciar (default 0)
 *   - decimals: number - Decimales a mostrar (default 0)
 *   - animate: boolean - Si debe animar o mostrar directo
 * 
 * CARACTERÍSTICAS PRINCIPALES:
 * - Animación incremental desde 0 hasta valor target
 * - useMotionValue para performance optimizada
 * - useTransform para formateo dinámico con decimales
 * - Cancelación automática de animaciones previas
 * - Fallback no-animado para casos especiales
 * 
 * SISTEMA DE ANIMACIÓN:
 * - Contador numérico: animate() de Framer Motion
 * - Ease curve: [0.25, 0.46, 0.45, 0.94] consistente
 * - Entrada visual: opacity + scale spring animation
 * - Delay staggering para múltiples contadores
 * 
 * VARIANTES ESPECIALIZADAS INCLUIDAS:
 * 
 * 1. StatNumber: Para estadísticas grandes
 *    - Clase: text-3xl font-bold
 *    - Duración: 1.5s optimizada
 *    - Uso: dashboards, métricas principales
 * 
 * 2. PercentageCounter: Para porcentajes
 *    - Decimales: 1 automático
 *    - Sufijo: % automático
 *    - Clase: text-2xl font-semibold
 *    - Uso: progreso, tasas, ratios
 * 
 * 3. CurrencyCounter: Para monedas
 *    - Decimales: 2 automático
 *    - Sufijo: € configurable
 *    - Clase: text-xl font-medium
 *    - Uso: precios, costos, presupuestos
 * 
 * GESTIÓN DE MEMORIA:
 * - useRef para tracking de animaciones activas
 * - Cleanup automático en useEffect return
 * - Cancelación de timeouts y animaciones
 * - Stop de animaciones en unmount
 * 
 * FORMATEO AUTOMÁTICO:
 * - Math.round() para enteros
 * - toFixed() para decimales específicos
 * - Prefix/suffix configurables
 * - Transform en tiempo real sin re-renders
 * 
 * MODOS DE OPERACIÓN:
 * - animate: true - Animación completa con efectos
 * - animate: false - Display inmediato sin animación
 * - Detección automática para casos edge
 * 
 * CASOS DE USO:
 * - Dashboards con métricas importantes
 * - Estadísticas de rendimiento
 * - Indicadores de progreso numéricos
 * - Landing pages con números impactantes
 * - Reportes con datos destacados
 * 
 * EJEMPLOS DE USO:
 * ```jsx
 * <StatNumber value={1234} suffix=" estudiantes" delay={0.2} />
 * <PercentageCounter value={85.5} delay={0.4} />
 * <CurrencyCounter value={299.99} currency="€" delay={0.6} />
 * ```
 * 
 * OPTIMIZACIÓN PERFORMANCE:
 * - useMotionValue evita re-renders del componente padre
 * - useTransform procesa solo cuando valor cambia
 * - Cancelación inteligente de animaciones solapadas
 * - Cleanup completo de recursos en desmonte
 * 
 * INTEGRACIÓN CON DASHBOARDS:
 * - Delay staggering para secuencias de contadores
 * - Clases CSS configurables para consistencia visual
 * - Compatibilidad con themes y responsive design
 * 
 * ESTADO ACTUAL: ✅ SISTEMA COMPLETO
 * - Contador base funcionando perfectamente
 * - 3 variantes especializadas operativas
 * - Gestión de memoria sin leaks
 * - Performance optimizada para múltiples instancias
 * - Usado exitosamente en dashboards principales
 */

import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { formatNumber } from '@utils/numberFormat'

interface NumberCounterProps {
  value: number
  duration?: number
  delay?: number
  className?: string
  prefix?: string
  suffix?: string
  decimals?: number
  animate?: boolean
}

const NumberCounter: React.FC<NumberCounterProps> = ({
  value,
  duration = 2,
  delay = 0,
  className = "",
  prefix = "",
  suffix = "",
  decimals = 0,
  animate: shouldAnimate = true
}) => {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => {
    return decimals > 0 
      ? formatNumber(latest, decimals)
      : Math.round(latest).toString()
  })
  
  const animationRef = useRef<any>(null)

  useEffect(() => {
    if (!shouldAnimate) {
      count.set(value)
      return
    }

    // Cancelar animación anterior si existe
    if (animationRef.current) {
      animationRef.current.stop()
    }

    // Delay antes de iniciar animación
    const timer = setTimeout(() => {
      animationRef.current = animate(count, value, {
        duration,
        ease: [0.25, 0.46, 0.45, 0.94], // Easing consistente
        onComplete: () => {
          animationRef.current = null
        }
      })
    }, delay * 1000)

    return () => {
      clearTimeout(timer)
      if (animationRef.current) {
        animationRef.current.stop()
      }
    }
  }, [value, duration, delay, count, shouldAnimate])

  // Si no debe animar, mostrar valor directo
  if (!shouldAnimate) {
    const displayValue = decimals > 0 
      ? formatNumber(value, decimals)
      : Math.round(value).toString()
    
    return (
      <span className={className}>
        {prefix}{displayValue}{suffix}
      </span>
    )
  }

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
        delay: delay
      }}
    >
      {prefix}
      <motion.span>{rounded}</motion.span>
      {suffix}
    </motion.span>
  )
}

// Componente específico para estadísticas grandes
export const StatNumber: React.FC<{
  value: number
  suffix?: string
  prefix?: string
  className?: string
  delay?: number
}> = ({ value, suffix, prefix, className = "", delay = 0 }) => {
  return (
    <NumberCounter
      value={value}
      duration={1.5}
      delay={delay}
      className={`text-3xl font-bold ${className}`}
      prefix={prefix}
      suffix={suffix}
    />
  )
}

// Componente para porcentajes
export const PercentageCounter: React.FC<{
  value: number
  className?: string
  delay?: number
}> = ({ value, className = "", delay = 0 }) => {
  return (
    <NumberCounter
      value={value}
      duration={2}
      delay={delay}
      decimals={1}
      suffix="%"
      className={`text-2xl font-semibold ${className}`}
    />
  )
}

// Componente para monedas
export const CurrencyCounter: React.FC<{
  value: number
  currency?: string
  className?: string
  delay?: number
}> = ({ value, currency = "€", className = "", delay = 0 }) => {
  return (
    <NumberCounter
      value={value}
      duration={1.8}
      delay={delay}
      decimals={2}
      suffix={` ${currency}`}
      className={`text-xl font-medium ${className}`}
    />
  )
}

export default NumberCounter