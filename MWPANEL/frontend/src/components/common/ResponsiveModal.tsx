/**
 * @archivo: ResponsiveModal.tsx
 * @módulo: Common Components (Modal Responsivo Universal)
 * @función: Modal que se adapta automáticamente a dispositivos (Modal desktop/Drawer mobile)
 * @crítico: SÍ - Usado en TODOS los modales del sistema para UX responsive
 * @dependencias: useResponsive hook, Ant Design Modal/Drawer
 * @no_modificar: Lógica de breakpoints sin verificar en dispositivos edge
 * @relacionado_con: useResponsive.ts, AnimatedModal.tsx, DashboardLayout.tsx
 */

/**
 * COMPONENTE: ResponsiveModal
 * UBICACIÓN: /frontend/src/components/common/ResponsiveModal.tsx
 * FUNCIÓN: Modal universal que se adapta automáticamente a desktop/tablet/mobile
 * NO USAR PARA: Modales que requieren siempre ser Modal (usar Modal directo)
 * PROPS CRÍTICAS:
 *   - mobileAsDrawer: boolean - Si usar Drawer en mobile (default true)
 *   - mobileWidth/tabletWidth/desktopWidth - Anchos por dispositivo
 *   - drawerPlacement: 'bottom' | 'left' | 'right' | 'top' - Posición del drawer
 *   - drawerProps: Partial<DrawerProps> - Props adicionales para drawer
 * 
 * COMPORTAMIENTO RESPONSIVE:
 * - Mobile: Drawer desde bottom (90% altura) o sides
 * - Tablet: Modal centrado (90% ancho)
 * - Desktop: Modal estándar (520px ancho)
 * 
 * ADAPTACIONES POR DISPOSITIVO:
 * - Mobile: Drawer bottom con altura 90%, centrado vertical
 * - Tablet: Modal centrado con ancho 80%, scroll automático
 * - Desktop: Modal clásico con ancho fijo configurable
 * 
 * CARACTERÍSTICAS UX:
 * - Scroll automático en body cuando contenido excede altura
 * - Top spacing reducido en mobile para aprovechar pantalla
 * - destroyOnClose hereda correctamente de Modal a Drawer
 * - Manejo de eventos consistente (onCancel → onClose)
 * 
 * HOOK AUXILIAR: useResponsiveModalProps
 * - Configuración rápida para modales responsive
 * - Props por defecto optimizadas por dispositivo
 * - Estilos consistentes para scroll y centrado
 * 
 * CASOS DE USO:
 * - Formularios de creación/edición
 * - Vistas de detalles
 * - Confirmaciones importantes
 * - Cualquier modal que necesite ser mobile-friendly
 * 
 * INTEGRACIÓN CON SISTEMA:
 * - useResponsive hook para detección de dispositivo
 * - Consistent con AnimatedModal para animaciones
 * - Base para todos los modales del sistema
 * 
 * ESTADO ACTUAL: ✅ COMPONENTE ESTABLE
 * - Responsive behavior probado en múltiples dispositivos
 * - Usado extensivamente en todo el sistema
 * - Hook auxiliar funcionando correctamente
 * - Integración completa con Ant Design Modal/Drawer
 */

import React from 'react'
import { Modal, Drawer } from 'antd'
import { ModalProps } from 'antd/es/modal'
import { DrawerProps } from 'antd/es/drawer'
import { useResponsive } from '../../hooks/useResponsive'

interface ResponsiveModalProps extends Omit<ModalProps, 'width'> {
  // Props específicas para responsive
  mobileAsDrawer?: boolean
  mobileWidth?: string | number
  tabletWidth?: string | number
  desktopWidth?: string | number
  
  // Props adicionales para drawer en mobile
  drawerPlacement?: DrawerProps['placement']
  drawerProps?: Partial<DrawerProps>
}

const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  mobileAsDrawer = true,
  mobileWidth = '100%',
  tabletWidth = '90%',
  desktopWidth = 520,
  drawerPlacement = 'bottom',
  drawerProps,
  children,
  ...modalProps
}) => {
  const { isMobile, isTablet } = useResponsive()

  // Función para determinar el ancho según el dispositivo
  const getResponsiveWidth = () => {
    if (isMobile) return mobileWidth
    if (isTablet) return tabletWidth
    return desktopWidth
  }

  // Si es mobile y se debe mostrar como drawer
  if (isMobile && mobileAsDrawer) {
    const combinedDrawerProps: DrawerProps = {
      placement: drawerPlacement,
      height: drawerPlacement === 'bottom' ? '90%' : undefined,
      width: drawerPlacement === 'left' || drawerPlacement === 'right' ? mobileWidth : undefined,
      ...drawerProps,
      title: modalProps.title,
      open: modalProps.open,
      onClose: modalProps.onCancel,
      closable: true,
      destroyOnClose: modalProps.destroyOnClose,
    }

    return (
      <Drawer {...combinedDrawerProps}>
        {children}
      </Drawer>
    )
  }

  // Modal normal con ancho responsive
  const responsiveModalProps: ModalProps = {
    ...modalProps,
    width: getResponsiveWidth(),
    centered: isMobile || isTablet,
    style: {
      top: isMobile ? 20 : undefined,
      maxHeight: isMobile ? '90vh' : undefined,
      ...modalProps.style,
    },
    styles: {
      body: {
        maxHeight: isMobile ? '70vh' : '60vh',
        overflowY: 'auto',
        ...modalProps.styles?.body,
      },
    },
  }

  return (
    <Modal {...responsiveModalProps}>
      {children}
    </Modal>
  )
}

export default ResponsiveModal

// Hook para configurar props de modal responsive
export const useResponsiveModalProps = (baseProps: Partial<ResponsiveModalProps> = {}) => {
  const { isMobile, isTablet } = useResponsive()

  return {
    ...baseProps,
    width: isMobile ? '95%' : isTablet ? '80%' : baseProps.desktopWidth || 520,
    centered: isMobile || isTablet,
    style: {
      top: isMobile ? 20 : undefined,
      ...baseProps.style,
    },
    bodyStyle: {
      maxHeight: isMobile ? '70vh' : '60vh',
      overflowY: 'auto' as const,
      ...baseProps.bodyStyle,
    },
  }
}