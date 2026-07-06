import { motion, useInView } from 'framer-motion'
import { ReactNode, useRef } from 'react'

interface ScrollRevealProps {
  children: ReactNode
  direction?: 'up' | 'down' | 'left' | 'right'
  delay?: number
  duration?: number
  distance?: number
  threshold?: number
  triggerOnce?: boolean
  className?: string
}

// Variantes de animación basadas en dirección
const createVariants = (direction: string, distance: number) => {
  const transforms: Record<string, object> = {
    up: { y: distance, opacity: 0 },
    down: { y: -distance, opacity: 0 },
    left: { x: distance, opacity: 0 },
    right: { x: -distance, opacity: 0 }
  }

  return {
    hidden: {
      ...transforms[direction],
      scale: 0.95
    },
    visible: {
      x: 0,
      y: 0,
      opacity: 1,
      scale: 1
    }
  }
}

const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.6,
  distance = 50,
  threshold = 0.1,
  triggerOnce = true,
  className = ""
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { 
    once: triggerOnce,
    margin: '0px 0px -100px 0px', // Activar antes de que sea completamente visible
    amount: threshold
  })

  const variants = createVariants(direction, distance)

  return (
    <motion.div
      ref={ref}
      variants={variants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      transition={{
        type: "tween",
        ease: [0.25, 0.46, 0.45, 0.94],
        duration,
        delay
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Componente específico para listas que se revelan secuencialmente
export const ScrollRevealList: React.FC<{
  children: ReactNode[]
  staggerDelay?: number
  direction?: 'up' | 'down' | 'left' | 'right'
  className?: string
}> = ({ children, staggerDelay = 0.1, direction = 'up', className = "" }) => {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { 
    once: true,
    margin: '0px 0px -50px 0px',
    amount: 0.1
  })

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay
      }
    }
  }

  const itemVariants = createVariants(direction, 30)

  return (
    <motion.div
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className={className}
    >
      {children.map((child, index) => (
        <motion.div
          key={index}
          variants={itemVariants}
          transition={{
            type: "tween",
            ease: [0.25, 0.46, 0.45, 0.94],
            duration: 0.5
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
}

// Componente para texto que se revela palabra por palabra
export const ScrollRevealText: React.FC<{
  text: string
  delay?: number
  className?: string
}> = ({ text, delay = 0, className = "" }) => {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { 
    once: true,
    margin: '0px 0px -100px 0px'
  })

  const words = text.split(' ')

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.08,
        delayChildren: delay
      }
    }
  }

  const wordVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.8
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "tween",
        ease: [0.25, 0.46, 0.45, 0.94],
        duration: 0.4
      }
    }
  }

  return (
    <motion.div
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className={`flex flex-wrap ${className}`}
    >
      {words.map((word, index) => (
        <motion.span
          key={index}
          variants={wordVariants}
          className="mr-1"
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  )
}

export default ScrollReveal