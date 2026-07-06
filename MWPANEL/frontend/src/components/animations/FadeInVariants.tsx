import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface FadeInVariantsProps {
  children: ReactNode
  direction?: 'up' | 'down' | 'left' | 'right'
  delay?: number
  duration?: number
  distance?: number
  className?: string
}

// Configuración base de transición
const baseTransition = {
  type: "tween",
  ease: [0.25, 0.46, 0.45, 0.94] as const,
}

// Generador de variantes direccionales
const createDirectionalVariants = (direction: string, distance: number) => {
  const transforms: Record<string, object> = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance }
  }

  return {
    hidden: {
      opacity: 0,
      ...transforms[direction]
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0
    }
  }
}

const FadeInVariants: React.FC<FadeInVariantsProps> = ({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.6,
  distance = 30,
  className = ""
}) => {
  const variants = createDirectionalVariants(direction, distance)
  
  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      transition={{
        ...baseTransition,
        duration,
        delay
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Componentes específicos para cada dirección
export const FadeInUp: React.FC<Omit<FadeInVariantsProps, 'direction'>> = (props) => (
  <FadeInVariants {...props} direction="up" />
)

export const FadeInDown: React.FC<Omit<FadeInVariantsProps, 'direction'>> = (props) => (
  <FadeInVariants {...props} direction="down" />
)

export const FadeInLeft: React.FC<Omit<FadeInVariantsProps, 'direction'>> = (props) => (
  <FadeInVariants {...props} direction="left" />
)

export const FadeInRight: React.FC<Omit<FadeInVariantsProps, 'direction'>> = (props) => (
  <FadeInVariants {...props} direction="right" />
)

export default FadeInVariants