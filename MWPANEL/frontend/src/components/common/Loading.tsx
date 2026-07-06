/**
 * @archivo: Loading.tsx
 * @módulo: Common Components (Componente de Carga Universal)
 * @función: Spinner de carga estándar con BarLoader moderno
 * @crítico: SÍ - Usado en TODAS las operaciones asíncronas del sistema
 * @dependencias: react-spinners/BarLoader, TailwindCSS
 * @no_modificar: Estructura de clases CSS sin verificar responsive
 * @relacionado_con: LoadingPage.tsx, todas las páginas con async
 */

/**
 * COMPONENTE: Loading
 * UBICACIÓN: /frontend/src/components/common/Loading.tsx
 * FUNCIÓN: Componente de carga universal con BarLoader moderno
 * NO USAR PARA: Loading de páginas completas (usar LoadingPage.tsx)
 * PROPS CRÍTICAS:
 *   - size: 'small' | 'medium' | 'large' - Tamaño del spinner
 *   - text: string - Mensaje personalizable de carga
 *   - height: string - Altura del contenedor (default h-64)
 *   - className: string - Clases CSS adicionales
 * 
 * CASOS DE USO:
 * - Estados de carga en tablas y listas
 * - Operaciones CRUD en formularios
 * - Fetch de datos en componentes
 * - Estados intermedios en navegación
 * 
 * INTEGRACIÓN CON BARLOADER:
 * - Usa BarLoader de react-spinners
 * - Color personalizado #3cb393 (verde MW Panel)
 * - Altura 6px, ancho 150px
 * - Animaciones suaves
 * 
 * CARACTERÍSTICAS:
 * - Centrado vertical y horizontal automático
 * - Texto animado con animate-pulse
 * - Responsive por defecto con Flexbox
 * - Altura configurable para diferentes contextos
 * 
 * ESTADO ACTUAL: ✅ FUNCIONAL Y MODERNO
 * - Usado extensivamente en todo el sistema
 * - BarLoader moderno implementado
 * - Responsive y accesible
 * - Reemplaza WorldSpinner anterior
 */

import React from 'react'
import { BarLoader } from 'react-spinners'

interface LoadingProps {
  size?: 'small' | 'medium' | 'large'
  text?: string
  className?: string
  height?: string
}

const Loading: React.FC<LoadingProps> = ({ 
  size = 'medium', 
  text = 'Cargando...', 
  className = '',
  height = 'h-64'
}) => {
  // Ajustar ancho según tamaño
  const getBarWidth = () => {
    switch (size) {
      case 'small': return 100
      case 'large': return 200
      default: return 150
    }
  }

  return (
    <div className={`flex flex-col justify-center items-center ${height} ${className}`}>
      {text && (
        <p className="text-gray-600 text-sm animate-pulse mb-4">
          {text}
        </p>
      )}
      <div className="flex justify-center">
        <BarLoader
          color="#3cb393"
          height={6}
          width={getBarWidth()}
        />
      </div>
    </div>
  )
}

export default Loading