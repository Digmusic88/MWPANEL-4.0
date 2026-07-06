// Componentes base de animación
export { default as FadeInUp } from './FadeInUp'
export { default as SplitText } from './SplitText'
export { default as WorldSpinner } from '../common/WorldSpinner'
export { default as LoadingPage } from '../common/LoadingPage'

// Nuevos componentes de animación avanzados
export { default as PageTransition } from './PageTransition'
export { default as FadeInVariants, FadeInUp as FadeInUpNew, FadeInDown, FadeInLeft, FadeInRight } from './FadeInVariants'
export { default as StaggerContainer, StaggerItem } from './StaggerContainer'
export { default as InteractiveButton } from './InteractiveButton'
export { default as HoverCard, StatCard } from './HoverCard'
export { default as AnimatedModal } from './AnimatedModal'
export { default as AnimatedDrawer } from './AnimatedDrawer'
export { default as NumberCounter, StatNumber, PercentageCounter, CurrencyCounter } from './NumberCounter'
export { default as ScrollReveal, ScrollRevealList, ScrollRevealText } from './ScrollReveal'

// Re-exportar componentes existentes mejorados
export * from './FadeInUp'
export * from './SplitText'

// Tipos y utilidades
export type AnimationType = 'fade' | 'slide' | 'scale' | 'zoom' | 'bounce'
export type DirectionType = 'up' | 'down' | 'left' | 'right'
export type HoverEffectType = 'lift' | 'scale' | 'glow' | 'tilt'