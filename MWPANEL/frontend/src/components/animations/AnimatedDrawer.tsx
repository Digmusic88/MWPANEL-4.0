import { motion, AnimatePresence } from 'framer-motion'
import { ReactNode } from 'react'
import { Drawer, DrawerProps } from 'antd'

interface AnimatedDrawerProps extends DrawerProps {
  children: ReactNode
  animationType?: 'slide' | 'scale' | 'fade'
}

// Variantes de animación para drawers según la posición
const createDrawerVariants = (placement: DrawerProps['placement'] = 'right', animationType: string) => {
  const isVertical = placement === 'top' || placement === 'bottom'
  const isReverse = placement === 'left' || placement === 'top'
  
  switch (animationType) {
    case 'slide':
      return {
        hidden: {
          opacity: 0,
          [isVertical ? 'y' : 'x']: isReverse ? -100 : 100,
          scale: 0.95
        },
        visible: {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          transition: {
            type: "spring",
            stiffness: 300,
            damping: 30,
            duration: 0.4
          }
        },
        exit: {
          opacity: 0,
          [isVertical ? 'y' : 'x']: isReverse ? -50 : 50,
          scale: 0.98,
          transition: {
            type: "tween",
            ease: [0.25, 0.46, 0.45, 0.94],
            duration: 0.25
          }
        }
      }
    
    case 'scale':
      return {
        hidden: {
          opacity: 0,
          scale: 0.8,
          [isVertical ? 'y' : 'x']: isReverse ? -30 : 30
        },
        visible: {
          opacity: 1,
          scale: 1,
          x: 0,
          y: 0,
          transition: {
            type: "spring",
            stiffness: 400,
            damping: 25,
            duration: 0.3
          }
        },
        exit: {
          opacity: 0,
          scale: 0.9,
          transition: {
            type: "tween",
            ease: [0.25, 0.46, 0.45, 0.94],
            duration: 0.2
          }
        }
      }
    
    case 'fade':
    default:
      return {
        hidden: {
          opacity: 0
        },
        visible: {
          opacity: 1,
          transition: {
            type: "tween",
            ease: [0.25, 0.46, 0.45, 0.94],
            duration: 0.3
          }
        },
        exit: {
          opacity: 0,
          transition: {
            type: "tween",
            ease: [0.25, 0.46, 0.45, 0.94],
            duration: 0.2
          }
        }
      }
  }
}

// Variantes para el overlay del drawer
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: {
      type: "tween",
      ease: "easeOut",
      duration: 0.2
    }
  },
  exit: { 
    opacity: 0,
    transition: {
      type: "tween",
      ease: "easeIn",
      duration: 0.15
    }
  }
}

// Variantes para animación del contenido interno
const contentVariants = {
  hidden: {
    opacity: 0,
    y: 20
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "tween",
      ease: [0.25, 0.46, 0.45, 0.94],
      duration: 0.4,
      delay: 0.1
    }
  },
  exit: {
    opacity: 0,
    y: 10,
    transition: {
      type: "tween",
      ease: [0.25, 0.46, 0.45, 0.94],
      duration: 0.15
    }
  }
}

const AnimatedDrawer: React.FC<AnimatedDrawerProps> = ({
  children,
  animationType = 'slide',
  open,
  placement = 'right',
  ...drawerProps
}) => {
  const variants = createDrawerVariants(placement, animationType)

  // Estilos para el body del drawer con scroll automático
  const scrollableBodyStyle = {
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const,
    height: '100%',
    padding: '24px',
    // Scrollbar personalizado
    scrollbarWidth: 'thin' as const,
    scrollbarColor: '#c5ddc3 #f0f0f0',
    ...drawerProps.bodyStyle,
  }

  return (
    <AnimatePresence mode="wait">
      {open && (
        <Drawer
          {...drawerProps}
          open={open}
          placement={placement}
          destroyOnClose
          maskStyle={{ backgroundColor: 'transparent' }}
          bodyStyle={scrollableBodyStyle}
          drawerRender={(node) => (
            <>
              {/* Animated overlay */}
              <motion.div
                variants={overlayVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.45)',
                  zIndex: 1000
                }}
              />
              
              {/* Animated drawer */}
              <motion.div
                variants={variants}
                initial="hidden"
                animate="visible"
                exit="exit"
                style={{
                  position: 'relative',
                  zIndex: 1001,
                  height: '100%'
                }}
              >
                <motion.div
                  variants={contentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  style={{ height: '100%' }}
                >
                  {node}
                </motion.div>
              </motion.div>
            </>
          )}
        >
          {children}
        </Drawer>
      )}
    </AnimatePresence>
  )
}

export default AnimatedDrawer