/**
 * @archivo: LoadingPage.tsx
 * @módulo: Common Components (Página de Carga Completa)
 * @función: Splash screen de carga para aplicación con branding MW Panel
 * @crítico: SÍ - Primera impresión del usuario, carga inicial de aplicación
 * @dependencias: WorldSpinner, Framer Motion, logo.svg
 * @no_modificar: Gradientes CSS y logo path sin verificar assets
 * @relacionado_con: WorldSpinner.tsx, app routing, Loading.tsx
 */

/**
 * COMPONENTE: LoadingPage
 * UBICACIÓN: /frontend/src/components/common/LoadingPage.tsx
 * FUNCIÓN: Página completa de carga inicial con branding e identidad visual
 * NO USAR PARA: Loading estados locales/componentes (usar Loading.tsx)
 * PROPS CRÍTICAS: Ninguna - Componente autocontenido
 * 
 * DISEÑO Y BRANDING:
 * - Background: Gradiente azul suave (blue-50 → indigo-100)
 * - Logo: /logo.svg de Mundo World School centrado
 * - Spinner: WorldSpinner grande como elemento central
 * - Tipografía: Texto corporativo con nombre de la institución
 * 
 * ESTRUCTURA VISUAL:
 * - Layout: min-h-screen centrado vertical/horizontal
 * - Jerarquía: WorldSpinner → Logo → Título → Descripción
 * - Colores: Grises suaves con acentos de marca
 * - Espaciado: Generous margin/padding para respiración
 * 
 * SISTEMA DE ANIMACIONES:
 * - WorldSpinner: Entrada con scale 0.8→1 + opacity 0→1 (0.5s)
 * - Contenido: Slide up (y: 20→0) + fade (0.2s delay)
 * - Texto loading: Pulsación continua opacity 0.6↔1 (2s loop)
 * - Transiciones suaves con duraciones coordinadas
 * 
 * CASOS DE USO:
 * - Carga inicial de la aplicación
 * - Resolución de autenticación JWT
 * - Inicialización de stores y contextos
 * - Carga de configuraciones críticas
 * - Estados de loading de páginas principales
 * 
 * ELEMENTOS DE MARCA:
 * - Logo: 64x64px con object-contain
 * - Nombre: "Mundo World School" prominente
 * - Tagline: "Cargando plataforma de gestión educativa..."
 * - Colores: Consistentes con identidad corporativa
 * 
 * RESPONSIVE BEHAVIOR:
 * - Layout centrado funciona en todas las resoluciones
 * - Logo y texto escalables
 * - Gradiente adaptativo
 * - TouchDevice friendly
 * 
 * PERFORMANCE CONSIDERATIONS:
 * - Animaciones GPU-accelerated (transform/opacity)
 * - Logo optimizado SVG
 * - Gradientes CSS nativos (no images)
 * - Minimal DOM complexity
 * 
 * INTEGRACIÓN CON ROUTING:
 * - Mostrado durante resolución de rutas protegidas
 * - Bridge entre login y dashboard
 * - Oculta latencia de inicialización
 * - Mejora perceived performance
 * 
 * ACCESIBILIDAD:
 * - Alt text descriptivo en logo
 * - Contraste adecuado en todos los textos
 * - Animaciones no agresivas
 * - Screen reader friendly structure
 * 
 * ESTADO ACTUAL: ✅ PÁGINA POLISHED
 * - Diseño final aprobado y desplegado
 * - Animaciones fluidas y profesionales
 * - Branding consistente con MW Panel
 * - Performance optimizada
 * - Usado en producción como splash screen principal
 */

import React from 'react'
import { motion } from 'framer-motion'
import { BarLoader } from 'react-spinners'

const LoadingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-16 h-16 mx-auto mb-4">
            <img
              src="/logo.svg"
              alt="Mundo World School"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Mundo World School</h1>
          <motion.p 
            className="text-gray-600 mb-8"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Cargando plataforma de gestión educativa...
          </motion.p>
        </motion.div>
        
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex justify-center"
        >
          <BarLoader
            color="#3cb393"
            height={6}
            width={200}
          />
        </motion.div>
      </div>
    </div>
  )
}

export default LoadingPage