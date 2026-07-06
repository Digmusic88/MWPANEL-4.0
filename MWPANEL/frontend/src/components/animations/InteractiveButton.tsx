import { motion } from 'framer-motion'
import { ReactNode, ButtonHTMLAttributes } from 'react'

interface InteractiveButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'small' | 'medium' | 'large'
  loading?: boolean
  icon?: ReactNode
  className?: string
}

// Variantes de animación para botones
const buttonVariants = {
  initial: { scale: 1 },
  hover: { 
    scale: 1.02,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25
    }
  },
  tap: { 
    scale: 0.98,
    transition: {
      type: "spring",
      stiffness: 600,
      damping: 30
    }
  }
}

// Variantes para el icono
const iconVariants = {
  initial: { rotate: 0 },
  hover: { 
    rotate: 5,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20
    }
  }
}

// Estilos base por variante
const variantStyles = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white border-blue-600",
  secondary: "bg-gray-100 hover:bg-gray-200 text-gray-900 border-gray-300",
  ghost: "bg-transparent hover:bg-gray-50 text-gray-700 border-transparent",
  danger: "bg-red-600 hover:bg-red-700 text-white border-red-600"
}

// Estilos por tamaño
const sizeStyles = {
  small: "px-3 py-1.5 text-sm",
  medium: "px-4 py-2 text-base",
  large: "px-6 py-3 text-lg"
}

const InteractiveButton: React.FC<InteractiveButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  loading = false,
  icon,
  className = "",
  disabled,
  ...props
}) => {
  const baseClasses = "inline-flex items-center justify-center font-medium rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
  
  const combinedClasses = `${baseClasses} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`

  return (
    <motion.button
      variants={buttonVariants}
      initial="initial"
      whileHover={!disabled && !loading ? "hover" : "initial"}
      whileTap={!disabled && !loading ? "tap" : "initial"}
      className={combinedClasses}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"
        />
      )}
      
      {icon && !loading && (
        <motion.span
          variants={iconVariants}
          className="mr-2"
        >
          {icon}
        </motion.span>
      )}
      
      {children}
    </motion.button>
  )
}

export default InteractiveButton