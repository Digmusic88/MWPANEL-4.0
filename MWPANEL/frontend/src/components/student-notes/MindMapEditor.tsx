import React, { useEffect, useRef, useState } from 'react';
import { Modal, Button, Space, message, Input, Select, Tag } from 'antd';
import { SaveOutlined, UndoOutlined, RedoOutlined, DownloadOutlined, ExpandOutlined, QuestionCircleOutlined } from '@ant-design/icons';
// @ts-ignore - Mind Elixir no tiene tipos oficiales
import MindElixir from 'mind-elixir';
import 'mind-elixir/style.css';
import MindMapHelpModal from './MindMapHelpModal';

// Verificar que Mind Elixir se ha cargado correctamente
if (typeof window !== 'undefined' && !window.MindElixir) {
  window.MindElixir = MindElixir;
}

// CSS adicional para asegurar que Mind Elixir funciona correctamente
const mindElixirCSS = `
  .mind-elixir-container {
    position: relative !important;
    overflow: hidden !important;
  }
  
  .mind-elixir-toolbar {
    pointer-events: auto !important;
    z-index: 10 !important;
  }
  
  .mind-elixir-toolbar button,
  .mind-elixir-toolbar .mind-elixir-toolbar-btn {
    pointer-events: auto !important;
    cursor: pointer !important;
  }
  
  .mind-elixir svg {
    pointer-events: auto !important;
    touch-action: none !important;
  }
  
  .mind-elixir-node {
    cursor: pointer !important;
    pointer-events: auto !important;
  }
  
  .mind-elixir-node:hover {
    opacity: 0.8 !important;
  }
`;

// Inyectar CSS personalizado
if (typeof document !== 'undefined') {
  const existingStyle = document.getElementById('mind-elixir-fixes');
  if (!existingStyle) {
    const style = document.createElement('style');
    style.id = 'mind-elixir-fixes';
    style.textContent = mindElixirCSS;
    document.head.appendChild(style);
  }
}

export interface MindMapData {
  nodeData: {
    topic: string;
    id: string;
    children?: any[];
  };
  theme?: string;
  layout?: string;
}

interface MindMapEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, mindMapData: MindMapData) => void;
  initialData?: {
    title?: string;
    mindMapData?: MindMapData;
  };
  title?: string;
}

const MindMapEditor: React.FC<MindMapEditorProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  title = "Editor de Mind Map"
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mindRef = useRef<any>(null);
  const [noteTitle, setNoteTitle] = useState(initialData?.title || '');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('default');
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [nodeColors, setNodeColors] = useState<Record<string, string>>({});

  // Actualizar título cuando cambien los initialData (para edición)
  useEffect(() => {
    if (initialData?.title && initialData.title !== noteTitle) {
      setNoteTitle(initialData.title);
    }
  }, [initialData?.title]);

  // Temas disponibles para Mind Elixir
  const themes = [
    { value: 'default', label: 'Por defecto', color: '#3298db' },
    { value: 'primary', label: 'Azul', color: '#1890ff' },
    { value: 'warning', label: 'Naranja', color: '#fa8c16' },
    { value: 'danger', label: 'Rojo', color: '#ff4d4f' },
    { value: 'success', label: 'Verde', color: '#52c41a' },
    { value: 'info', label: 'Cyan', color: '#13c2c2' },
  ];

  // Función para guardar colores actuales de los nodos
  const saveNodeColors = () => {
    if (!containerRef.current) return;
    
    const coloredNodes: Record<string, string> = {};
    
    // Buscar todos los nodos con colores personalizados
    const topicElements = containerRef.current.querySelectorAll('me-tpc');
    topicElements.forEach((element: any, index) => {
      const backgroundColor = element.style.backgroundColor;
      if (backgroundColor && backgroundColor !== '' && !backgroundColor.includes('rgb(50, 152, 219)')) {
        // Usar el índice o id del nodo como clave
        const nodeId = element.getAttribute('data-nodeid') || element.getAttribute('data-id') || `node-${index}`;
        coloredNodes[nodeId] = backgroundColor;
      }
    });
    
    setNodeColors(coloredNodes);
  };

  // Función para restaurar colores de los nodos
  const restoreNodeColors = () => {
    if (!containerRef.current || Object.keys(nodeColors).length === 0) return;
    
    
    setTimeout(() => {
      const topicElements = containerRef.current?.querySelectorAll('me-tpc');
      topicElements?.forEach((element: any, index) => {
        const nodeId = element.getAttribute('data-nodeid') || element.getAttribute('data-id') || `node-${index}`;
        const savedColor = nodeColors[nodeId];
        
        if (savedColor) {
          element.style.backgroundColor = savedColor;
          element.style.borderColor = savedColor;
          element.style.color = '#ffffff';
        }
      });
      
      // Después de restaurar colores, también restaurar botones +
      ensureExpandButtons();
    }, 500); // Esperar a que se complete el cambio de layout
  };

  // Función crítica para convertir datos al formato MindElixir (mismo que en Viewer)
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

  // Función para buscar un nodo por ID en la estructura de datos
  const findNodeById = (data: any, targetId: string): any => {
    if (!data) return null;
    
    const searchNode = (node: any): any => {
      if (!node) return null;
      
      // Verificar si este nodo tiene el ID que buscamos
      if (node.id === targetId) {
        return node;
      }
      
      // Buscar en los hijos recursivamente
      if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
          const found = searchNode(child);
          if (found) return found;
        }
      }
      
      return null;
    };
    
    // Buscar desde el nodo raíz
    if (data.nodeData) {
      return searchNode(data.nodeData);
    } else {
      return searchNode(data);
    }
  };

  // Función para asegurar que los botones + estén presentes - VERSIÓN MEJORADA CON RETRIES
  const ensureExpandButtons = (retryCount = 0, maxRetries = 5) => {
    if (!containerRef.current || !mindRef.current) {
      console.log('➕ No container or mind ref available');
      return;
    }
    
    console.log(`➕ Intento ${retryCount + 1}/${maxRetries + 1} - Verificando DOM elements...`);
    
    const svg = containerRef.current?.querySelector('svg');
    const toolbar = containerRef.current?.querySelector('.mind-elixir-toolbar');
    const topicElements = containerRef.current?.querySelectorAll('me-tpc');
    
    console.log('➕ Estado DOM:', {
      hasSVG: !!svg,
      hasToolbar: !!toolbar,
      nodesFound: topicElements?.length || 0,
      containerChildren: containerRef.current?.children.length || 0
    });
    
    // Si no hay elementos DOM suficientes y aún tenemos retries, volver a intentar
    if ((!svg || !topicElements || topicElements.length === 0) && retryCount < maxRetries) {
      console.log(`⏳ DOM no listo, reintentando en ${(retryCount + 1) * 200}ms...`);
      setTimeout(() => ensureExpandButtons(retryCount + 1, maxRetries), (retryCount + 1) * 200);
      return;
    }
    
    if (!svg || !topicElements || topicElements.length === 0) {
      console.log('🚨 DOM elements no encontrados después de todos los reintentos');
      return;
    }
    
    console.log('➕ DOM listo, creando botones para', topicElements.length, 'nodos');
    
    topicElements?.forEach((topicElement: any, index) => {
      // Verificar si ya tiene botón +
      const existingButton = topicElement.parentNode?.querySelector('.expand-btn');
      
      if (!existingButton) {
        console.log(`➕ Creando botón + para nodo ${index}`);
        
        // Crear botón +
        const expandButton = document.createElement('div');
        expandButton.className = 'expand-btn';
        expandButton.innerHTML = '+';
        expandButton.style.cssText = `
          position: absolute;
          right: -15px;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
          background: #52c41a;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
          z-index: 10;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        
        // IMPLEMENTACIÓN MEJORADA - ENCUENTRA EL NODO ESPECÍFICO
        expandButton.addEventListener('click', (e) => {
          e.stopPropagation();
          console.log(`➕ Botón + clickeado en nodo ${index}`);
          
          try {
              if (mindRef.current) {
                // Obtener datos actuales
                const currentData = mindRef.current.getData();
                console.log('📋 Datos actuales completos:', currentData);
                
                if (currentData && currentData.nodeData) {
                  const newNode = {
                    id: 'node_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                    topic: 'Nuevo nodo',
                    children: []
                  };
                  
                  // ALGORITMO MEJORADO - Construir lista flat de nodos para mapear índices correctamente
                  const buildFlatNodeList = (node: any, currentList: any[] = []): any[] => {
                    currentList.push(node);
                    if (node.children && Array.isArray(node.children)) {
                      for (const child of node.children) {
                        buildFlatNodeList(child, currentList);
                      }
                    }
                    return currentList;
                  };
                  
                  // Función para encontrar y añadir hijo al nodo correcto usando lista flat
                  const addChildToNodeImproved = (targetIndex: number): boolean => {
                    const flatNodes = buildFlatNodeList(currentData.nodeData);
                    console.log('📋 Lista plana de nodos:', flatNodes.map((n, i) => ({ index: i, topic: n.topic })));
                    
                    if (targetIndex >= 0 && targetIndex < flatNodes.length) {
                      const targetNode = flatNodes[targetIndex];
                      if (!targetNode.children) {
                        targetNode.children = [];
                      }
                      targetNode.children.push(newNode);
                      console.log(`📋 Nodo hijo añadido exitosamente al nodo ${targetIndex} (${targetNode.topic}):`, newNode);
                      return true;
                    } else {
                      console.error(`❌ Índice ${targetIndex} fuera de rango (0-${flatNodes.length - 1})`);
                      return false;
                    }
                  };
                  
                  // Intentar añadir hijo al nodo específico usando algoritmo mejorado
                  const success = addChildToNodeImproved(index);
                  
                  if (success) {
                    console.log('📋 Datos después de añadir nodo:', currentData);
                    
                    // REINICIALIZAR COMPLETAMENTE
                    console.log('🔄 Reinicializando Mind Map...');
                    mindRef.current.init(currentData);
                    
                    // Recrear botones después de reinicializar
                    setTimeout(() => {
                      console.log('🔄 Recreando botones después de añadir nodo...');
                      ensureExpandButtons();
                    }, 1000);
                    
                    message.success(`Nodo hijo añadido al nodo ${index}`);
                  } else {
                    console.error(`❌ No se pudo encontrar el nodo ${index}`);
                    message.error(`No se pudo añadir hijo al nodo ${index}`);
                  }
                } else {
                  message.error('No se pudieron obtener los datos del Mind Map');
                }
              }
            } catch (error) {
              console.error('❌ Error añadiendo nodo:', error);
              message.error('Error al añadir nodo: ' + error.message);
            }
          });
          
          // Añadir efectos hover
          expandButton.addEventListener('mouseenter', () => {
            expandButton.style.background = '#389e0d';
            expandButton.style.transform = 'translateY(-50%) scale(1.1)';
          });
          
          expandButton.addEventListener('mouseleave', () => {
            expandButton.style.background = '#52c41a';
            expandButton.style.transform = 'translateY(-50%) scale(1)';
          });
          
          // Añadir el botón al nodo
          const nodeContainer = topicElement.parentNode;
          if (nodeContainer) {
            nodeContainer.style.position = 'relative';
            nodeContainer.appendChild(expandButton);
          }
        }
    });
  };

  // Inicializar Mind Elixir
  useEffect(() => {
    console.log('🧠 MindMapEditor useEffect triggered:', { 
      isOpen, 
      hasContainer: !!containerRef.current, 
      hasMindRef: !!mindRef.current,
      MindElixirAvailable: typeof MindElixir !== 'undefined',
      containerElement: containerRef.current
    });
    
    // Verificar que Mind Elixir esté disponible
    if (typeof MindElixir === 'undefined') {
      console.error('🚨 Mind Elixir no está disponible!');
      message.error('Mind Elixir no se ha cargado correctamente');
      return;
    }
    
    if (!isOpen) {
      return;
    }

    // Función para inicializar cuando el container esté disponible
    const initializeMindElixir = () => {
      // Verificar que el DOM esté completamente cargado
      if (document.readyState !== 'complete') {
        console.log('🧠 DOM no está completamente cargado, esperando...');
        setTimeout(initializeMindElixir, 200);
        return;
      }
      if (!containerRef.current) {
        console.log('🧠 Container aún no disponible, reintentando en 100ms...');
        setTimeout(initializeMindElixir, 100);
        return;
      }

      console.log('🧠 Modal está abierto y container está disponible');
      
      // Limpiar instancia anterior si existe
      if (mindRef.current) {
        try {
          console.log('🧠 Limpiando instancia anterior...');
          mindRef.current.destroy?.();
          mindRef.current = null;
        } catch (e) {
          console.log('⚠️ Error destroying previous instance:', e);
        }
      }

      try {
        console.log('🧠 Iniciando inicialización de Mind Elixir...');
        console.log('🧠 Container dimensions:', {
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
          clientWidth: containerRef.current.clientWidth,
          clientHeight: containerRef.current.clientHeight
        });
        
        const options = {
          el: containerRef.current,
          direction: MindElixir.LEFT,
          draggable: true,
          contextMenu: true,
          toolBar: true,
          nodeMenu: true,
          keypress: true,
          locale: 'es', // Cambiar a español
          overflowHidden: false,
          mainLinkStyle: 2,
          mainNodeVerticalGap: 15,
          mainNodeHorizontalGap: 25,
          // Configuraciones mejoradas
          allowFocus: true,
          enableMapEdit: true,
          enableEditNodeTitle: true,
          // Configuración de idioma personalizada
          contextMenuOption: {
            focus: 'Enfocar',
            addChild: 'Añadir Hijo',
            addParent: 'Añadir Padre', 
            addSibling: 'Añadir Hermano',
            removeNode: 'Eliminar Nodo',
            editNode: 'Editar Nodo'
          },
          // Forzar plugins
          plugins: [
            'ToolBar',
            'NodeMenu', 
            'ContextMenu',
            'KeyPress',
            'NodeDraggable'
          ]
        };

        console.log('🧠 Opciones de Mind Elixir:', options);
        
        mindRef.current = new MindElixir(options);
        console.log('🧠 Instancia de Mind Elixir creada:', mindRef.current);

        // Inicializar con datos existentes o crear nuevo
        let data;
        if (initialData?.mindMapData) {
          // CONVERSIÓN CRÍTICA: Usar el mismo convertidor que en el Viewer
          const rawData = initialData.mindMapData.nodeData;
          data = convertToMindElixirFormat(rawData);
          console.log('🧠 Cargando datos existentes (convertidos):', {
            raw: rawData,
            converted: data
          });
        } else {
          data = MindElixir.new('Mi Mind Map');
          console.log('🧠 Creando nuevo mind map:', data);
        }

        console.log('🧠 Llamando a mindRef.current.init con data:', data);
        mindRef.current.init(data);
        console.log('🧠 mindRef.current.init completado');

        // Apply theme and Spanish localization after initialization
        setTimeout(() => {
          console.log('🧠 Aplicando tema inicial:', currentTheme);
          setTheme(currentTheme);
          
          // Configurar textos en español
          configureSpanishTexts();
          
          // Asegurar que los botones + estén presentes
          ensureExpandButtons();
        }, 500);

        // Configurar eventos para debugging
        mindRef.current.bus.addListener('operation', (operation: any) => {
          console.log('🧠 Mind map operation:', operation);
        });

        mindRef.current.bus.addListener('selectNode', (node: any) => {
          console.log('🧠 Node selected:', node);
        });

        // Event listeners adicionales para debugging de interactividad
        mindRef.current.bus.addListener('addChild', (data: any) => {
          console.log('🧠 Child node added:', data);
          // Recrear botones después de añadir nodos
          setTimeout(() => ensureExpandButtons(), 200);
        });

        mindRef.current.bus.addListener('removeNode', (data: any) => {
          console.log('🧠 Node removed:', data);
        });

        mindRef.current.bus.addListener('editNode', (data: any) => {
          console.log('🧠 Node edited:', data);
        });

        // Event listener para cambios de layout/dirección
        mindRef.current.bus.addListener('layout', (data: any) => {
          console.log('🔄 Layout changed:', data);
          // Guardar colores antes del cambio
          saveNodeColors();
          // Restaurar colores y botones después del cambio
          setTimeout(() => {
            restoreNodeColors();
            ensureExpandButtons();
          }, 1000);
        });

        // Event listener para refresh/redraw
        mindRef.current.bus.addListener('redraw', (data: any) => {
          console.log('🔄 Mind map redrawn:', data);
          // Restaurar colores y botones después del redraw
          setTimeout(() => {
            restoreNodeColors();
            ensureExpandButtons();
          }, 500);
        });

        // Verificar que la instancia tiene los métodos necesarios
        console.log('🧠 Métodos disponibles en mindRef.current:', {
          addChild: typeof mindRef.current.addChild,
          removeNode: typeof mindRef.current.removeNode,
          undo: typeof mindRef.current.undo,
          redo: typeof mindRef.current.redo,
          exportPng: typeof mindRef.current.exportPng,
          getData: typeof mindRef.current.getData,
          refresh: typeof mindRef.current.refresh
        });

        // Configurar interacción y botones de expansión
        setTimeout(() => {
          try {
            if (mindRef.current && typeof mindRef.current.refresh === 'function') {
              console.log('🔄 Forzando refresh del mind map...');
              mindRef.current.refresh();
            }
          } catch (error) {
            console.warn('⚠️ Error en refresh (continuando normalmente):', error);
          }

          // Configurar observer para botones que cambien la dirección/layout
          const setupLayoutChangeDetection = () => {
            console.log('🔧 Configurando detección de cambios de layout...');
            
            // Usar event delegation en el toolbar completo
            const toolbar = containerRef.current?.querySelector('.mind-elixir-toolbar');
            if (toolbar) {
              toolbar.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                console.log('🔧 Click detectado en toolbar elemento:', target.tagName, target.className, target.innerHTML);
                
                // Detectar cualquier click en el toolbar (todos son potencialmente botones de layout)
                if (target.tagName === 'SPAN' || target.tagName === 'BUTTON' || target.closest('span') || target.closest('button')) {
                  console.log('🔄 Botón de layout clickeado, programando recreación de botones +');
                  
                  // Recrear botones después de que el layout haya cambiado con múltiples intentos
                  setTimeout(() => {
                    console.log('🔄 Primer intento de recreación de botones +');
                    restoreNodeColors();
                    ensureExpandButtons(0, 5); // Usar sistema de retry
                  }, 800);
                  
                  // Segundo intento por si el primero no funciona
                  setTimeout(() => {
                    console.log('🔄 Segundo intento de recreación de botones +');
                    ensureExpandButtons(0, 3);
                  }, 1500);
                }
              }, true); // Use capture para interceptar todos los clicks
              console.log('🔧 Event listener del toolbar configurado exitosamente');
            } else {
              console.log('🚨 No se encontró toolbar, reintentando en 500ms...');
              setTimeout(() => setupLayoutChangeDetection(), 500);
            }

            // Observer para cambios en el DOM del mind map - DESHABILITADO TEMPORALMENTE
            // const layoutObserver = new MutationObserver((mutations) => {
            //   let layoutChanged = false;
            //   mutations.forEach((mutation) => {
            //     if (mutation.type === 'attributes' && 
            //         (mutation.attributeName === 'class' || mutation.attributeName === 'style')) {
            //       layoutChanged = true;
            //     }
            //   });
            //   
            //   if (layoutChanged) {
            //     console.log('🔄 Cambio de layout detectado por MutationObserver');
            //     setTimeout(() => {
            //       restoreNodeColors();
            //       ensureExpandButtons();
            //     }, 300);
            //   }
            // });

            // Observar el container del mind map - DESHABILITADO TEMPORALMENTE
            // if (containerRef.current) {
            //   layoutObserver.observe(containerRef.current, {
            //     attributes: true,
            //     subtree: true,
            //     attributeFilter: ['class', 'style']
            //   });
            // }
          };

          setupLayoutChangeDetection();
          
          // Asegurar botones + adicionales
          // Usar el nuevo sistema de retry mejorado
          setTimeout(() => ensureExpandButtons(0, 8), 500);
          
          // Verificar que los elementos del toolbar están presentes
          const toolbar = containerRef.current?.querySelector('.mind-elixir-toolbar');
          console.log('🔧 Toolbar encontrado:', !!toolbar);
          
          if (toolbar) {
            const buttons = toolbar.querySelectorAll('button, .mind-elixir-toolbar-btn, span');
            console.log('🔧 Elementos en toolbar:', buttons.length);
            
            // Si no hay botones, crear toolbar personalizado
            if (buttons.length === 0 || !toolbar.innerHTML.trim()) {
              console.log('🔧 Creando toolbar personalizado...');
              createCustomToolbar(toolbar);
            }
          }
          
          // Verificar que el SVG principal está presente
          const svg = containerRef.current?.querySelector('svg');
          console.log('🎨 SVG encontrado:', !!svg);
          
          if (svg) {
            console.log('🎨 SVG dimensions:', {
              width: svg.getAttribute('width'),
              height: svg.getAttribute('height')
            });
            
            // Let Mind Elixir handle its own interactions
          }
          
          // Let Mind Elixir handle buttons natively
        }, 500);
        
        // Only create buttons once, don't recreate them
        setTimeout(() => {
          console.log('🔧 Creating buttons once...');
          ensureExpandButtons();
        }, 1000);
        
        console.log('✅ Mind Elixir inicializado correctamente');
      } catch (error) {
        console.error('🚨 Error inicializando Mind Elixir:', error);
        console.error('🚨 Error stack:', error.stack);
        message.error('Error al inicializar el editor de mind maps: ' + error.message);
      }
    };

    // Iniciar el proceso de inicialización con un pequeño delay
    setTimeout(initializeMindElixir, 100);

    // Cleanup
    return () => {
      if (mindRef.current) {
        try {
          console.log('🧠 Cleanup: destruyendo Mind Elixir');
          mindRef.current.destroy?.();
          mindRef.current = null;
        } catch (e) {
          console.log('⚠️ Error destroying mind map:', e);
        }
      }
    };
  }, [isOpen, initialData]);

  // Función para cambiar tema SOLO EN NODOS SELECCIONADOS
  const setTheme = (theme: string) => {
    console.log('🎨 Cambiando tema a:', theme);
    
    if (mindRef.current && containerRef.current) {
      const themeColors: Record<string, string> = {
        default: '#3298db',
        primary: '#1890ff', 
        warning: '#fa8c16',
        danger: '#ff4d4f',
        success: '#52c41a',
        info: '#13c2c2',
      };

      const color = themeColors[theme] || '#3298db';
      console.log('🎨 Color seleccionado:', color);
      
      // Aplicar color SOLO a nodos seleccionados
      const selectedNodes = containerRef.current.querySelectorAll('.selected me-tpc, me-tpc.selected');
      console.log('🎨 Nodos seleccionados encontrados:', selectedNodes.length);
      
      if (selectedNodes.length === 0) {
        // Si no hay nodos seleccionados, avisar al usuario
        message.info('Selecciona uno o más nodos primero para cambiar su color');
        return;
      }
      
      // Apply color to each selected node - simple approach
      selectedNodes.forEach((node, index) => {
        const topicElement = node as HTMLElement;
        topicElement.style.backgroundColor = color;
        topicElement.style.borderColor = color;
        topicElement.style.color = '#ffffff';
        console.log(`🎨 Color ${color} applied to node ${index}`);
      });
      
      // Guardar los nuevos colores
      setTimeout(() => saveNodeColors(), 100);
      
      setCurrentTheme(theme);
      message.success(`Color ${themes.find(t => t.value === theme)?.label} aplicado a ${selectedNodes.length} nodo(s)`);
    } else {
      console.log('⚠️ No se puede cambiar tema - Mind Elixir no inicializado');
    }
  };

  const handleSave = () => {
    
    if (!mindRef.current) {
      message.error('Editor no inicializado');
      return;
    }

    if (!noteTitle?.trim()) {
      message.error('El título es obligatorio');
      return;
    }

    try {
      const mindMapData = mindRef.current.getData();
      console.log('📊 Datos obtenidos de Mind Elixir:', mindMapData);
      
      
      const preparedData = {
        nodeData: mindMapData.nodeData,
        theme: mindMapData.theme || 'default',
        layout: mindMapData.layout || 'default'
      };
      
      console.log('🎯 Datos preparados finales:', preparedData);
      onSave(noteTitle.trim(), preparedData);
      
    } catch (error) {
      console.error('❌ Error al obtener datos del Mind Map:', error);
      message.error('Error al procesar el Mind Map');
    }
  };

  // Función para deshacer
  const handleUndo = () => {
    if (mindRef.current && mindRef.current.undo) {
      mindRef.current.undo();
    }
  };

  // Función para rehacer
  const handleRedo = () => {
    if (mindRef.current && mindRef.current.redo) {
      mindRef.current.redo();
    }
  };

  // Función para exportar como imagen
  const handleExport = () => {
    if (mindRef.current && mindRef.current.exportPng) {
      mindRef.current.exportPng().then((blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${noteTitle || 'mind-map'}.png`;
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

  const modalProps = isFullscreen ? {
    width: '100vw',
    style: { top: 0, padding: 0, maxWidth: 'none' },
    bodyStyle: { padding: '0', height: 'calc(100vh - 110px)' }
  } : {
    width: 1000,
    bodyStyle: { padding: '0', height: '600px' }
  };

  // Función para crear toolbar personalizado
  const createCustomToolbar = (toolbar: Element) => {
    const customButtons = [
      { 
        icon: '➕', 
        title: 'Añadir nodo hijo', 
        action: () => {
          console.log('🔧 Añadiendo nodo hijo...');
          if (mindRef.current && mindRef.current.addChild) {
            const selectedNode = mindRef.current.getSelectedNode?.() || mindRef.current.currentNode;
            if (selectedNode) {
              mindRef.current.addChild(selectedNode, 'Nuevo nodo');
            } else {
              console.log('⚠️ No hay nodo seleccionado');
            }
          }
        }
      },
      { 
        icon: '✏️', 
        title: 'Editar nodo', 
        action: () => {
          console.log('🔧 Editando nodo...');
          const selectedNode = mindRef.current?.getSelectedNode?.() || mindRef.current?.currentNode;
          if (selectedNode) {
            const newText = prompt('Nuevo texto:', selectedNode.topic || 'Nodo');
            if (newText && mindRef.current.updateNode) {
              mindRef.current.updateNode(selectedNode, newText);
            }
          } else {
            console.log('⚠️ No hay nodo seleccionado para editar');
          }
        }
      },
      { 
        icon: '🗑️', 
        title: 'Eliminar nodo', 
        action: () => {
          console.log('🔧 Eliminando nodo...');
          const selectedNode = mindRef.current?.getSelectedNode?.() || mindRef.current?.currentNode;
          if (selectedNode && mindRef.current.removeNode) {
            mindRef.current.removeNode(selectedNode);
          } else {
            console.log('⚠️ No hay nodo seleccionado para eliminar');
          }
        }
      }
    ];
    
    toolbar.innerHTML = '';
    customButtons.forEach(btn => {
      const button = document.createElement('span');
      button.innerHTML = btn.icon;
      button.title = btn.title;
      button.style.cssText = `
        display: inline-block;
        padding: 8px;
        margin: 0 4px;
        cursor: pointer;
        border-radius: 4px;
        background: rgba(255,255,255,0.1);
        transition: all 0.2s;
      `;
      
      button.addEventListener('click', btn.action);
      button.addEventListener('mouseenter', () => {
        button.style.background = 'rgba(255,255,255,0.2)';
      });
      button.addEventListener('mouseleave', () => {
        button.style.background = 'rgba(255,255,255,0.1)';
      });
      
      toolbar.appendChild(button);
    });
    
    console.log('✅ Toolbar personalizado creado con', customButtons.length, 'botones');
  };
  
  // Configurar textos en español para Mind Elixir
  const configureSpanishTexts = () => {
    if (!containerRef.current || !mindRef.current) return;
    
    console.log('🇪🇸 Configurando textos en español...');
    
    try {
      // Configurar menú contextual en español
      const contextMenuTexts = {
        'Focus': 'Enfocar',
        'Add Child': 'Añadir Hijo',
        'Add Parent': 'Añadir Padre',
        'Add Sibling': 'Añadir Hermano', 
        'Remove Node': 'Eliminar Nodo',
        'Edit Node': 'Editar Nodo',
        'Copy': 'Copiar',
        'Cut': 'Cortar',
        'Paste': 'Pegar'
      };
      
      // Buscar elementos del menú contextual y traducir
      setTimeout(() => {
        const menuItems = document.querySelectorAll('.mind-elixir-context-menu li, .context-menu li');
        menuItems.forEach(item => {
          const originalText = item.textContent?.trim();
          if (originalText && contextMenuTexts[originalText]) {
            item.textContent = contextMenuTexts[originalText];
            console.log(`🇪🇸 Traducido: "${originalText}" → "${contextMenuTexts[originalText]}"`);
          }
        });
      }, 100);
      
      // Configurar tooltips del toolbar en español
      const toolbarTexts = {
        'Add Child': 'Añadir nodo hijo',
        'Add Sibling': 'Añadir nodo hermano',
        'Remove Node': 'Eliminar nodo',
        'Edit': 'Editar',
        'Focus': 'Enfocar',
        'Undo': 'Deshacer',
        'Redo': 'Rehacer',
        'Layout': 'Diseño',
        'Theme': 'Tema'
      };
      
      // Traducir tooltips de botones
      setTimeout(() => {
        const toolbarButtons = containerRef.current?.querySelectorAll('[title], .mind-elixir-toolbar [title]');
        toolbarButtons?.forEach(button => {
          const originalTitle = button.getAttribute('title');
          if (originalTitle && toolbarTexts[originalTitle]) {
            button.setAttribute('title', toolbarTexts[originalTitle]);
            console.log(`🇪🇸 Tooltip traducido: "${originalTitle}" → "${toolbarTexts[originalTitle]}"`);
          }
        });
      }, 200);
      
      // Personalizar mensajes de Mind Elixir si es posible
      if (mindRef.current && mindRef.current.locale) {
        mindRef.current.locale = 'es';
      }
      
      console.log('✅ Configuración de español completada');
      
      // Configurar observer para traducciones dinámicas
      const translationObserver = new MutationObserver(() => {
        // Re-traducir menús contextuales cuando aparezcan
        const newMenuItems = document.querySelectorAll('.mind-elixir-context-menu li, .context-menu li');
        newMenuItems.forEach(item => {
          const originalText = item.textContent?.trim();
          if (originalText && contextMenuTexts[originalText] && !item.dataset.translated) {
            item.textContent = contextMenuTexts[originalText];
            item.dataset.translated = 'true';
          }
        });
      });
      
      // Observar cambios en el document para capturar menús dinámicos
      translationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Limpiar observer después de 30 segundos
      setTimeout(() => {
        translationObserver.disconnect();
      }, 30000);
      
    } catch (error) {
      console.error('❌ Error configurando español:', error);
    }
  };
  
  
  

  return (
    <>
    <Modal
      title={
        <div className="flex justify-between items-center">
          <Space>
            <span>{title}</span>
            <Button 
              icon={<QuestionCircleOutlined />} 
              type="link" 
              size="small"
              onClick={() => setIsHelpModalOpen(true)}
              title="¿Cómo usar el Mind Map?"
              style={{ color: '#1890ff' }}
            >
              Ayuda
            </Button>
          </Space>
          <Space>
            <Select
              value={currentTheme}
              onChange={setTheme}
              style={{ width: 120 }}
              size="small"
              placeholder="Elegir color"
            >
              {themes.map(theme => (
                <Select.Option key={theme.value} value={theme.value}>
                  <Space>
                    <div 
                      style={{ 
                        width: 12, 
                        height: 12, 
                        backgroundColor: theme.color,
                        borderRadius: 2,
                        border: '1px solid #d9d9d9'
                      }} 
                    />
                    {theme.label}
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Space>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      footer={[
        <Space key="toolbar" className="w-full justify-between">
          <Space>
            <Input
              placeholder="Título del Mind Map"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              style={{ width: 200 }}
              size="small"
            />
            <Tag color="blue">🧠 Mind Map</Tag>
          </Space>
          <Space>
            <Button icon={<UndoOutlined />} onClick={handleUndo} size="small" title="Deshacer" />
            <Button icon={<RedoOutlined />} onClick={handleRedo} size="small" title="Rehacer" />
            <Button icon={<DownloadOutlined />} onClick={handleExport} size="small" title="Exportar PNG" />
            <Button 
              icon={<ExpandOutlined />} 
              onClick={handleFullscreen} 
              size="small" 
              title={isFullscreen ? "Salir pantalla completa" : "Pantalla completa"} 
            />
            <Button onClick={onClose} size="small">
              Cancelar
            </Button>
            <Button 
              type="primary" 
              icon={<SaveOutlined />} 
              onClick={(e) => {
                handleSave();
              }} 
              size="small"
            >
              Guardar
            </Button>
          </Space>
        </Space>
      ]}
      {...modalProps}
      centered={!isFullscreen}
      destroyOnClose={true}
      maskClosable={false}
    >
      <div 
        ref={containerRef} 
        className="mind-elixir-container"
        style={{ 
          width: '100%', 
          height: '100%',
          minHeight: '500px',
          backgroundColor: '#fafafa',
          border: '1px solid #e8e8e8',
          borderRadius: '6px',
          // Asegurar que el container puede recibir eventos
          pointerEvents: 'auto',
          touchAction: 'none'
        }} 
      />
    </Modal>
    
    {/* Modal de ayuda */}
    <MindMapHelpModal 
      isOpen={isHelpModalOpen}
      onClose={() => setIsHelpModalOpen(false)}
    />
    </>
  );
};

export default MindMapEditor;