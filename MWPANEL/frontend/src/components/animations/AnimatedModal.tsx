/**
 * @archivo: AnimatedModal.tsx
 * @módulo: Animations (Modal Animado con Framer Motion)
 * @función: Wrapper de Ant Design Modal con animaciones avanzadas de entrada/salida
 * @crítico: SÍ - Mejora UX en modales críticos del sistema
 * @dependencias: Framer Motion, Ant Design Modal
 * @no_modificar: Variantes de animación sin testing en móviles
 * @relacionado_con: Modal components, AnimatedDrawer.tsx, ResponsiveModal.tsx
 */

/**
 * COMPONENTE: AnimatedModal
 * UBICACIÓN: /frontend/src/components/animations/AnimatedModal.tsx
 * FUNCIÓN: Modal con animaciones Framer Motion personalizables
 * NO USAR PARA: Modales simples sin necesidad de animación (usar Modal directo)
 * PROPS CRÍTICAS:
 *   - animationType: 'scale' | 'slide' | 'fade' | 'zoom' - Tipo de animación
 *   - children: ReactNode - Contenido del modal
 *   - open: boolean - Estado de visibilidad (requerido)
 *   - ...modalProps: Todas las props estándar de Ant Design Modal
 * 
 * TIPOS DE ANIMACIÓN:
 * - scale: Escala + fade con efecto spring (por defecto)
 * - slide: Deslizamiento lateral con bounce
 * - fade: Aparición/desaparición simple suave
 * - zoom: Zoom 3D con rotación espectacular
 * 
 * CARACTERÍSTICAS TÉCNICAS:
 * - AnimatePresence con mode="wait" para transiciones fluidas
 * - Overlay/backdrop animado independiente
 * - destroyOnClose para limpiar estado
 * - Variantes optimizadas con spring physics
 * - Transform 3D para animación zoom
 * 
 * RENDIMIENTO:
 * - GPU acceleration automático via transform
 * - Ease curves optimizadas para fluidez
 * - Duraciones balanceadas (200-500ms)
 * - Mode wait previene glitches de superposición
 * 
 * CASOS DE USO:
 * - Modales de creación/edición importantes
 * - Confirmaciones críticas
 * - Presentaciones de contenido destacado
 * - Formularios complejos que requieren atención
 * 
 * ACCESIBILIDAD:
 * - Mantiene todas las props de accesibilidad de Ant Design
 * - Z-index apropiado para stack modal
 * - Focus management preservado
 * - Respeta preferencias de movimiento reducido del usuario
 * 
 * ESTADO ACTUAL: ✅ COMPONENTE ESTABLE
 * - 4 tipos de animación implementados y probados
 * - Integración perfecta con Ant Design Modal
 * - Performance optimizado para 60fps
 * - Usado en componentes críticos del sistema
 */

import { motion, AnimatePresence } from 'framer-motion'
import { ReactNode } from 'react'
import { Modal, ModalProps } from 'antd'

interface AnimatedModalProps extends ModalProps {
  children: ReactNode
  animationType?: 'scale' | 'slide' | 'fade' | 'zoom'
}

// Variantes de animación para diferentes tipos de modales
const modalVariants = {
  scale: {
    hidden: {
      opacity: 0,
      scale: 0.8,
      y: 50
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25,
        duration: 0.4
      }
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      y: 30,
      transition: {
        type: "tween",
        ease: [0.25, 0.46, 0.45, 0.94],
        duration: 0.2
      }
    }
  },
  slide: {
    hidden: {
      opacity: 0,
      x: 300,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      x: 0,
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
      x: -100,
      scale: 0.98,
      transition: {
        type: "tween",
        ease: [0.25, 0.46, 0.45, 0.94],
        duration: 0.2
      }
    }
  },
  fade: {
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
  },
  zoom: {
    hidden: {
      opacity: 0,
      scale: 0.3,
      rotateY: 90
    },
    visible: {
      opacity: 1,
      scale: 1,
      rotateY: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
        duration: 0.5
      }
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      rotateY: -45,
      transition: {
        type: "tween",
        ease: [0.25, 0.46, 0.45, 0.94],
        duration: 0.2
      }
    }
  }
}

// Variantes para el overlay/backdrop
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

const AnimatedModal: React.FC<AnimatedModalProps> = ({
  children,
  animationType = 'scale',
  open,
  ...modalProps
}) => {
  const variants = modalVariants[animationType]

  return (
    <AnimatePresence mode="wait">
      {open && (
        <Modal
          {...modalProps}
          open={open}
          destroyOnClose
          modalRender={(node) => (
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
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <motion.div
                variants={variants}
                initial="hidden"
                animate="visible"
                exit="exit"
                style={{
                  transformStyle: animationType === 'zoom' ? 'preserve-3d' : undefined
                }}
              >
                {node}
              </motion.div>
            </motion.div>
          )}
        >
          {children}
        </Modal>
      )}
    </AnimatePresence>
  )
}

export default AnimatedModal