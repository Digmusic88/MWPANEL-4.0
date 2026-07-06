import React, { useEffect, useRef, useState } from 'react';
import { Card, Button, Space, message, Spin } from 'antd';
import { EditOutlined, DownloadOutlined, ExpandOutlined } from '@ant-design/icons';
// @ts-ignore - Mind Elixir no tiene tipos oficiales
import MindElixir from 'mind-elixir';
import 'mind-elixir/style.css';
import { MindMapData } from './MindMapEditor';

interface MindMapViewerProps {
  mindMapData: MindMapData;
  title: string;
  readonly?: boolean;
  onEdit?: () => void;
  height?: number;
  showControls?: boolean;
}

const MindMapViewer: React.FC<MindMapViewerProps> = ({
  mindMapData,
  title,
  readonly = false,
  onEdit,
  height = 400,
  showControls = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mindRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Inicializar visualizador de Mind Elixir con retraso para asegurar DOM
  useEffect(() => {
    console.log('🧠 MindMapViewer useEffect triggered:', {
      hasContainer: !!containerRef.current,
      mindMapData: mindMapData,
      hasNodeData: !!mindMapData?.nodeData
    });
    
    if (!mindMapData?.nodeData) {
      console.log('🚨 No hay nodeData, saliendo...');
      setIsLoading(false);
      return;
    }
    
    // Función de inicialización con reintentos
    const initViewer = (attempt = 1, maxAttempts = 10) => {
      console.log(`🧠 Intento de inicialización #${attempt}/${maxAttempts}`, {
        hasContainer: !!containerRef.current,
        containerWidth: containerRef.current?.offsetWidth,
        containerHeight: containerRef.current?.offsetHeight
      });
      
      if (containerRef.current && mindMapData?.nodeData) {
        console.log('🧠 MindMapViewer: Iniciando carga de datos');
        window.console.error('🚨🚨🚨 INDESTRUCTIBLE: Después de iniciar carga de datos');
        
        try {
          window.console.error('🚨🚨🚨 INDESTRUCTIBLE: Llamando setIsLoading(true)...');
          window.console.error('🚨🚨🚨 INDESTRUCTIBLE: setIsLoading type:', typeof setIsLoading);
          setIsLoading(true);
          window.console.error('🚨🚨🚨 INDESTRUCTIBLE: setIsLoading(true) completado exitosamente');
        } catch (setLoadingError) {
          window.console.error('🚨🚨🚨 INDESTRUCTIBLE: ERROR EN setIsLoading:', {
            error: setLoadingError,
            message: setLoadingError.message,
            setIsLoadingType: typeof setIsLoading,
            setIsLoadingValue: setIsLoading
          });
          throw setLoadingError;
        }
        
        try {
          window.console.error('🚨🚨🚨 INDESTRUCTIBLE: Entrando en try block');
          const options = {
            el: containerRef.current,
            direction: MindElixir.LEFT,
            draggable: !readonly,
            contextMenu: !readonly,
            toolBar: !readonly,
            nodeMenu: false,
            keypress: false,
            locale: 'es',
            overflowHidden: false,
            mainLinkStyle: 2,
            mainNodeVerticalGap: 15,
            mainNodeHorizontalGap: 25,
          };
          
          window.console.error('🚨🚨🚨 INDESTRUCTIBLE: Opciones creadas:', options);

          // Limpiar instancia anterior si existe
          window.console.error('🚨🚨🚨 INDESTRUCTIBLE: Verificando instancia anterior...');
          if (mindRef.current) {
            try {
              mindRef.current.destroy?.();
            } catch (e) {
              console.log('Error destroying previous instance:', e);
            }
          }

          try {
            window.console.error('🚨🚨🚨 INDESTRUCTIBLE: Creando MindElixir...');
            mindRef.current = new MindElixir(options);
            window.console.error('🚨🚨🚨 INDESTRUCTIBLE: MindElixir creado exitosamente');
            
            // CONVERSIÓN DE FORMATO CRÍTICA: Convertir nodeData al formato esperado por MindElixir
            const convertedData = convertToMindElixirFormat(mindMapData.nodeData);
            console.log('🔄 CONVERSIÓN DE FORMATO:', {
              original: mindMapData.nodeData,
              converted: convertedData
            });
            
            window.console.error('🚨🚨🚨 INDESTRUCTIBLE: Iniciando init() con datos convertidos...');
            mindRef.current.init(convertedData);
            window.console.error('🚨🚨🚨 INDESTRUCTIBLE: init() completado exitosamente');
            
          } catch (error) {
            window.console.error('🚨🚨🚨 INDESTRUCTIBLE: ERROR CRÍTICO EN MINELIXIR:', {
              error: error,
              message: error.message,
              stack: error.stack,
              hasContainer: !!containerRef.current,
              containerDimensions: containerRef.current ? {
                width: containerRef.current.offsetWidth,
                height: containerRef.current.offsetHeight
              } : null,
              options: options,
              mindMapData: mindMapData.nodeData,
              MindElixirType: typeof MindElixir
            });
            throw error;
          }

          // Aplicar tema si está especificado
          if (mindMapData.theme && mindMapData.theme !== 'default') {
            applyTheme(mindMapData.theme);
          }

          // Configurar para solo lectura si es necesario
          if (readonly) {
            // Deshabilitar edición
            mindRef.current.bus.addListener('beforeOperation', (operation: any) => {
              return false; // Cancelar operaciones
            });
          }

          // DEBUGGING ULTRA DETALLADO - Verificar todo el rendering
          setTimeout(() => {
            console.log('🔍🔍🔍 DEBUGGING ULTRA DETALLADO - REVISIÓN COMPLETA:');
            
            // 1. Verificar container
            const containerElement = containerRef.current;
            console.log('📦 CONTAINER:', {
              exists: !!containerElement,
              className: containerElement?.className,
              id: containerElement?.id,
              offsetWidth: containerElement?.offsetWidth,
              offsetHeight: containerElement?.offsetHeight,
              clientWidth: containerElement?.clientWidth,
              clientHeight: containerElement?.clientHeight,
              scrollWidth: containerElement?.scrollWidth,
              scrollHeight: containerElement?.scrollHeight,
              computedStyle: containerElement ? window.getComputedStyle(containerElement) : null
            });
            
            // 2. Verificar elementos MindElixir
            const svg = containerElement?.querySelector('svg');
            const canvas = containerElement?.querySelector('canvas');
            const mindElixirElements = containerElement?.querySelectorAll('[class*="mind-elixir"]');
            const allChildren = containerElement?.children;
            
            console.log('🎨 ELEMENTOS MIND ELIXIR:', {
              hasSVG: !!svg,
              svgDimensions: svg ? `${svg.clientWidth}x${svg.clientHeight}` : 'No SVG',
              svgViewBox: svg?.getAttribute('viewBox'),
              svgStyle: svg ? window.getComputedStyle(svg).display : 'No SVG',
              
              hasCanvas: !!canvas,
              canvasDimensions: canvas ? `${canvas.width}x${canvas.height}` : 'No Canvas',
              
              mindElixirElementsCount: mindElixirElements?.length || 0,
              mindElixirClasses: Array.from(mindElixirElements || []).map(el => el.className),
              
              totalChildren: allChildren?.length || 0,
              childrenList: Array.from(allChildren || []).map(child => ({
                tagName: child.tagName,
                className: child.className,
                id: child.id
              }))
            });
            
            // 3. Verificar nodos específicos
            const nodes = containerElement?.querySelectorAll('me-tpc, .mind-elixir-node');
            const links = containerElement?.querySelectorAll('.mind-elixir-link, line, path');
            
            console.log('🧠 NODOS Y ENLACES:', {
              nodeCount: nodes?.length || 0,
              nodeDetails: Array.from(nodes || []).map(node => ({
                tagName: node.tagName,
                className: node.className,
                textContent: node.textContent?.slice(0, 50),
                visible: window.getComputedStyle(node).display !== 'none'
              })),
              
              linkCount: links?.length || 0,
              linkDetails: Array.from(links || []).map(link => ({
                tagName: link.tagName,
                className: link.className,
                visible: window.getComputedStyle(link).display !== 'none'
              }))
            });
            
            // 4. Verificar CSS de MindElixir
            const mindElixirCSS = Array.from(document.styleSheets).find(sheet => 
              sheet.href?.includes('mind-elixir') || 
              Array.from(sheet.cssRules || []).some(rule => rule.cssText.includes('mind-elixir'))
            );
            
            console.log('🎨 CSS MIND ELIXIR:', {
              mindElixirCSSLoaded: !!mindElixirCSS,
              totalStyleSheets: document.styleSheets.length,
              mindElixirStyles: mindElixirCSS ? 'CSS encontrado' : 'CSS NO encontrado'
            });
            
            // 5. Verificar el estado del objeto MindElixir
            console.log('⚙️ INSTANCIA MIND ELIXIR:', {
              instanceExists: !!mindRef.current,
              instanceType: typeof mindRef.current,
              instanceKeys: mindRef.current ? Object.keys(mindRef.current) : 'No instance',
              hasInitMethod: mindRef.current && typeof mindRef.current.init === 'function',
              hasDestroyMethod: mindRef.current && typeof mindRef.current.destroy === 'function',
            });
            
            // 6. FINAL: HTML completo del container
            console.log('📄 HTML COMPLETO DEL CONTAINER:');
            console.log(containerElement?.innerHTML || 'Container vacío');
            
            // DIAGNÓSTICO CRÍTICO
            if (!svg && !canvas && nodes?.length === 0) {
              console.error('🚨🚨🚨 CRÍTICO: MindElixir no renderizó NADA en el DOM!');
              console.log('🔄 Intentando re-inicialización forzada con delay...');
              try {
                setTimeout(() => {
                  console.log('🔄 Ejecutando re-init con nodeData:', mindMapData.nodeData);
                  const reConvertedData = convertToMindElixirFormat(mindMapData.nodeData);
                  console.log('🔄 RE-INIT con datos convertidos:', reConvertedData);
                  mindRef.current.init(reConvertedData);
                  
                  // Verificar de nuevo después de re-init
                  setTimeout(() => {
                    console.log('🔍 POST RE-INIT:', {
                      svg: !!containerRef.current?.querySelector('svg'),
                      nodes: containerRef.current?.querySelectorAll('me-tpc')?.length,
                      html: containerRef.current?.innerHTML?.slice(0, 100)
                    });
                  }, 500);
                }, 100);
              } catch (e) {
                console.error('❌ Re-inicialización falló:', e);
              }
            } else {
              console.log('✅ MindElixir renderizó elementos, pero pueden estar ocultos o mal posicionados');
            }
          }, 1500);

          window.console.error('🚨🚨🚨 INDESTRUCTIBLE: MARCANDO COMO COMPLETADO...');
          setIsLoading(false);
          console.log('🧠 Mind Map Viewer inicializado correctamente');
          console.log('🎯 LOADING STATE CAMBIADO A FALSE - El overlay debería desaparecer ahora');
          window.console.error('🚨🚨🚨 INDESTRUCTIBLE: VIEWER INICIALIZADO EXITOSAMENTE');
        } catch (error) {
          console.error('❌ Error inicializando Mind Map Viewer:', error);
          message.error('Error al cargar el mind map');
          setIsLoading(false);
        }
      } else if (attempt < maxAttempts) {
        // Reintentar después de un breve retraso
        console.log(`⏳ Container no listo, reintentando en ${50 * attempt}ms...`);
        setTimeout(() => initViewer(attempt + 1, maxAttempts), 50 * attempt);
      } else {
        console.log('🚨 MindMapViewer: Max intentos alcanzados, no se pudo inicializar:', {
          hasContainer: !!containerRef.current,
          hasMindMapData: !!mindMapData,
          hasNodeData: !!mindMapData?.nodeData,
          mindMapDataKeys: mindMapData ? Object.keys(mindMapData) : 'No mindMapData'
        });
        setIsLoading(false);
      }
    };

    // Iniciar con un pequeño retraso inicial
    setTimeout(() => initViewer(), 100);

    return () => {
      if (mindRef.current) {
        try {
          mindRef.current.destroy?.();
        } catch (e) {
          console.log('Error destroying mind map viewer:', e);
        }
        mindRef.current = null;
      }
    };
  }, [mindMapData, readonly]);

  // Función crítica para convertir datos al formato MindElixir
  const convertToMindElixirFormat = (nodeData: any) => {
    // MindElixir espera un formato específico con nodeData como estructura anidada
    return {
      nodeData: {
        id: nodeData.id || 'root',
        topic: nodeData.topic || 'Mind Map',
        root: true,
        children: convertChildren(nodeData.children || [])
      }
    };
  };

  const convertChildren = (children: any[]): any[] => {
    return children.map((child, index) => ({
      id: child.id || `node-${index}`,
      topic: child.topic || `Nodo ${index + 1}`,
      direction: index % 2 === 0 ? MindElixir.RIGHT : MindElixir.LEFT,
      children: child.children ? convertChildren(child.children) : []
    }));
  };

  // Función para aplicar tema
  const applyTheme = (theme: string) => {
    const themeColors: Record<string, string> = {
      default: '#3298db',
      primary: '#1890ff',
      warning: '#fa8c16',
      danger: '#ff4d4f',
      success: '#52c41a',
      info: '#13c2c2',
    };

    const color = themeColors[theme] || '#3298db';
    
    const style = document.createElement('style');
    style.innerHTML = `
      .mind-elixir-node.mind-elixir-node-root > .mind-elixir-node-text {
        background-color: ${color} !important;
      }
      .mind-elixir-link {
        stroke: ${color} !important;
      }
    `;
    
    // Remover estilo anterior si existe
    const oldStyle = document.getElementById(`mindmap-viewer-theme-${theme}`);
    if (oldStyle) {
      oldStyle.remove();
    }
    
    style.id = `mindmap-viewer-theme-${theme}`;
    document.head.appendChild(style);
  };

  // Función para exportar como PNG
  const handleExport = () => {
    if (mindRef.current && mindRef.current.exportPng) {
      mindRef.current.exportPng().then((blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title || 'mind-map'}.png`;
        a.click();
        URL.revokeObjectURL(url);
        message.success('Mind Map exportado correctamente');
      }).catch((error: any) => {
        console.error('Error exportando:', error);
        message.error('Error al exportar el mind map');
      });
    }
  };

  // Función para pantalla completa
  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!mindMapData?.nodeData) {
    return (
      <Card>
        <div className="text-center text-gray-500 py-8">
          <p>No hay datos de mind map para mostrar</p>
        </div>
      </Card>
    );
  }

  return (
    <div className={isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}>
      <Card
        title={
          <div className="flex justify-between items-center">
            <span>🧠 {title}</span>
            {showControls && (
              <Space size="small">
                {onEdit && !readonly && (
                  <Button
                    icon={<EditOutlined />}
                    onClick={(e) => {
                      window.console.error('🚨🚨🚨 BOTÓN EDITAR MINDMAPVIEWER CLICKEADO - INDESTRUCTIBLE');
                      window.console.log('💥 Event:', e);
                      window.console.log('💡 onEdit function:', typeof onEdit);
                      if (onEdit) onEdit();
                    }}
                    size="small"
                    type="primary"
                  >
                    Editar
                  </Button>
                )}
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleExport}
                  size="small"
                  title="Exportar como PNG"
                />
                <Button
                  icon={<ExpandOutlined />}
                  onClick={handleFullscreen}
                  size="small"
                  title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                />
              </Space>
            )}
          </div>
        }
        bodyStyle={{ 
          padding: 0, 
          height: isFullscreen ? 'calc(100vh - 60px)' : height 
        }}
      >
        {/* Container siempre renderizado para que ref esté disponible */}
        <div 
          ref={containerRef} 
          style={{ 
            width: '100%', 
            height: '100%',
            minHeight: '400px',
            backgroundColor: '#fafafa',
            border: '1px solid #d9d9d9',
            position: 'relative'
          }} 
        />
        
        {/* Loading overlay */}
        {isLoading && (
          <div 
            className="flex items-center justify-center"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              zIndex: 100
            }}
          >
            <Space direction="vertical" align="center">
              <Spin size="large" />
              <p className="text-gray-500">Cargando mind map...</p>
            </Space>
          </div>
        )}
        
        {/* Debug: Estado del loading */}
        {console.log('🔍 RENDER STATE:', { isLoading, hasContainer: !!containerRef.current, hasOverlay: isLoading })}
        
        {isFullscreen && (
          <Button
            type="primary"
            onClick={handleFullscreen}
            style={{
              position: 'fixed',
              top: 16,
              right: 16,
              zIndex: 1000
            }}
          >
            Salir de pantalla completa
          </Button>
        )}
      </Card>
    </div>
  );
};

export default MindMapViewer;