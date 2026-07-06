import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface HoverCardProps {
  children: ReactNode
  className?: string
  hoverEffect?: 'lift' | 'scale' | 'glow' | 'tilt'
  disabled?: boolean
  onClick?: () => void
}

// Variantes de animación para diferentes efectos
const hoverVariants = {
  lift: {
    initial: { y: 0, boxShadow: "0 1px 3px rgba(0, 0, 0, 0.12)" },
    hover: { 
      y: -4, 
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25
      }
    }
  },
  scale: {
    initial: { scale: 1 },
    hover: { 
      scale: 1.03,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25
      }
    }
  },
  glow: {
    initial: { 
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.12)",
      borderColor: "transparent"
    },
    hover: { 
      boxShadow: "0 0 20px rgba(59, 130, 246, 0.3)",
      borderColor: "rgba(59, 130, 246, 0.5)",
      transition: {
        type: "tween",
        ease: [0.25, 0.46, 0.45, 0.94],
        duration: 0.3
      }
    }
  },
  tilt: {
    initial: { rotateY: 0, rotateX: 0 },
    hover: { 
      rotateY: 5,
      rotateX: 5,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25
      }
    }
  }
}

const HoverCard: React.FC<HoverCardProps> = ({
  children,
  className = "",
  hoverEffect = 'lift',
  disabled = false,
  onClick
}) => {
  const variants = hoverVariants[hoverEffect]
  
  return (
    <motion.div
      variants={variants}
      initial="initial"
      whileHover={!disabled ? "hover" : "initial"}
      whileTap={!disabled && onClick ? { scale: 0.98 } : undefined}
      className={`bg-white rounded-lg border border-gray-200 cursor-pointer ${className}`}
      onClick={!disabled ? onClick : undefined}
      style={{
        transformStyle: hoverEffect === 'tilt' ? 'preserve-3d' : undefined,
        perspective: hoverEffect === 'tilt' ? '1000px' : undefined
      }}
    >
      {children}
    </motion.div>
  )
}

// Componente específico para cards de estadísticas
export const StatCard: React.FC<{
  title: string
  value: string | number
  icon?: ReactNode
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  className?: string
}> = ({
  title,
  value,
  icon,
  trend,
  trendValue,
  className = ""
}) => {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600'
  }

  return (
    <HoverCard className={`p-6 ${className}`} hoverEffect="lift">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && trendValue && (
            <p className={`text-sm mt-2 ${trendColors[trend]}`}>
              {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'} {trendValue}
            </p>
          )}
        </div>
        {icon && (
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600"
          >
            {icon}
          </motion.div>
        )}
      </div>
    </HoverCard>
  )
}

export default HoverCard