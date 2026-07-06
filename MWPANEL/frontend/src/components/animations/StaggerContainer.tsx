import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface StaggerContainerProps {
  children: ReactNode
  staggerDelay?: number
  className?: string
  direction?: 'column' | 'row'
}

// Variantes para el contenedor padre
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1, // Valor por defecto, se sobrescribe con staggerDelay
    }
  }
}

// Variantes para los elementos hijos
const itemVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "tween",
      ease: [0.25, 0.46, 0.45, 0.94],
      duration: 0.5
    }
  }
}

const StaggerContainer: React.FC<StaggerContainerProps> = ({
  children,
  staggerDelay = 0.1,
  className = "",
  direction = 'column'
}) => {
  // Actualizar el stagger delay dinámicamente
  const dynamicContainerVariants = {
    ...containerVariants,
    visible: {
      ...containerVariants.visible,
      transition: {
        staggerChildren: staggerDelay
      }
    }
  }

  return (
    <motion.div
      variants={dynamicContainerVariants}
      initial="hidden"
      animate="visible"
      className={`flex ${direction === 'column' ? 'flex-col' : 'flex-row'} ${className}`}
    >
      {children}
    </motion.div>
  )
}

// Componente para elementos individuales dentro del StaggerContainer
export const StaggerItem: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className = ""
}) => {
  return (
    <motion.div
      variants={itemVariants}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export default StaggerContainer