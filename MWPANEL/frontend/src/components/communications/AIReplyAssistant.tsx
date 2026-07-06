import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Select, 
  Spin, 
  message as antdMessage, 
  Popover, 
  Space, 
  Typography, 
  Card,
  Tooltip,
  Alert
} from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RobotOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  SettingOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import '../../styles/ai-assistant.css';
import aiAssistantService, { AIResponseOptions } from '../../services/aiAssistantService';
import { useAuthStore } from '../../store/authStore';

const { Text, Paragraph } = Typography;
const { Option } = Select;

interface Message {
  id: string;
  content: string;
  sender: {
    id: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  relatedStudent?: {
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };
}

interface AIReplyAssistantProps {
  message: Message;
  previousMessages?: Message[];
  onResponseGenerated: (content: string) => void;
  className?: string;
}

const AIReplyAssistant: React.FC<AIReplyAssistantProps> = ({
  message,
  previousMessages = [],
  onResponseGenerated,
  className = '',
}) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [canUseAI, setCanUseAI] = useState(false);
  const [tone, setTone] = useState<'formal' | 'empático' | 'informativo' | 'neutro'>('empático');
  const [isTyping, setIsTyping] = useState(false);
  const [showParticles, setShowParticles] = useState(false);

  useEffect(() => {
    checkAIAvailability();
  }, []);

  const checkAIAvailability = async () => {
    try {
      const [enabled, permissions] = await Promise.all([
        aiAssistantService.isAIEnabled(),
        aiAssistantService.validateUserPermissions(),
      ]);
      
      setAiEnabled(enabled);
      setCanUseAI(permissions);
    } catch (err) {
      console.error('Error checking AI availability:', err);
      setAiEnabled(false);
      setCanUseAI(false);
    }
  };

  const isUserAuthorized = () => {
    return user?.role === 'teacher' || user?.role === 'admin';
  };

  const generateAIResponse = async () => {
    if (!canUseAI || !aiEnabled || !isUserAuthorized()) {
      antdMessage.error('No tienes permisos para usar la IA o la funcionalidad está deshabilitada');
      return;
    }

    setLoading(true);
    setIsTyping(true);

    try {
      const messageContext = previousMessages.slice(-3).map(msg => msg.content);
      
      const options: AIResponseOptions = {
        tone,
        messageContext,
        senderRole: message.sender ? 'family' : 'unknown',
        recipientRole: user?.role || 'teacher',
        relatedStudent: message.relatedStudent?.user.profile.firstName || undefined,
      };

      const aiResponse = await aiAssistantService.generateResponse(
        message.content,
        options
      );

      // Activar animaciones futuristas
      setShowParticles(true);
      
      // Simular escritura tipo Gemini con efectos avanzados
      await aiAssistantService.simulateTyping(
        aiResponse.content,
        (partialText, isComplete) => {
          onResponseGenerated(partialText);
          
          // Agregar efectos visuales durante la escritura
          if (!isComplete) {
            // Efecto de "pensando" mientras escribe
            setShowParticles(true);
          }
        },
        50 // velocidad de escritura (más rápida para mejor UX)
      );
      
      setShowParticles(false);

      antdMessage.success('Respuesta generada con IA');
    } catch (err) {
      console.error('Error generating AI response:', err);
      antdMessage.error('Error al generar respuesta automática');
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  const insertQuickTemplate = (template: string) => {
    const templates = aiAssistantService.getQuickTemplates(user?.role || 'teacher');
    let content = templates[template] || template;
    
    // Reemplazar placeholders
    if (message.relatedStudent) {
      content = content.replace(
        '{estudiante}', 
        message.relatedStudent.user.profile.firstName
      );
    }

    onResponseGenerated(content);
    antdMessage.success('Plantilla insertada');
  };

  const settingsContent = (
    <div style={{ width: 250 }}>
      <div style={{ marginBottom: 16 }}>
        <Text strong>Tono de respuesta:</Text>
        <Select
          value={tone}
          onChange={setTone}
          style={{ width: '100%', marginTop: 8 }}
          size="small"
        >
          <Option value="empático">😊 Empático</Option>
          <Option value="formal">📋 Formal</Option>
          <Option value="informativo">📚 Informativo</Option>
          <Option value="neutro">⚖️ Neutro</Option>
        </Select>
      </div>
      
      <div>
        <Text strong>Estado del sistema:</Text>
        <div style={{ marginTop: 8 }}>
          <Text type={aiEnabled ? 'success' : 'danger'}>
            IA: {aiEnabled ? 'Activa' : 'Inactiva'}
          </Text>
          <br />
          <Text type={canUseAI ? 'success' : 'danger'}>
            Permisos: {canUseAI ? 'Autorizados' : 'Sin autorización'}
          </Text>
        </div>
      </div>
    </div>
  );

  const quickTemplates = aiAssistantService.getQuickTemplates(user?.role || 'teacher');
  const templateContent = (
    <div style={{ width: 300, maxHeight: 400, overflowY: 'auto' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {Object.entries(quickTemplates).map(([key, template]) => (
          <Button
            key={key}
            size="small"
            block
            onClick={() => insertQuickTemplate(key)}
            style={{ 
              textAlign: 'left', 
              height: 'auto', 
              whiteSpace: 'normal',
              padding: '8px 12px',
            }}
          >
            <div>
              <Text strong style={{ fontSize: '12px' }}>{key}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {template.length > 60 ? `${template.substring(0, 60)}...` : template}
              </Text>
            </div>
          </Button>
        ))}
      </Space>
    </div>
  );

  if (!isUserAuthorized()) {
    return null;
  }

  if (!aiEnabled) {
    return (
      <Alert
        message="IA no disponible"
        description="La funcionalidad de respuesta inteligente está deshabilitada"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
    );
  }

  if (!canUseAI) {
    return (
      <Alert
        message="Sin permisos"
        description="No tienes autorización para usar la respuesta inteligente"
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Card 
        size="small" 
        className={`mb-4 relative overflow-hidden ${className}`}
        style={{
          background: isTyping ? 
            'rgba(255, 255, 255, 0.1)' : 
            'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          borderRadius: '20px',
          boxShadow: isTyping ? 
            '0 12px 40px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)' : 
            '0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
        }}
      >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <div className="flex items-center justify-between">
          <Space>
            <motion.div
              animate={isTyping ? { 
                scale: [1, 1.2, 1], 
                rotate: [0, 360] 
              } : { scale: 1, rotate: 0 }}
              transition={{ 
                duration: isTyping ? 2 : 0, 
                repeat: isTyping ? Infinity : 0,
                ease: "easeInOut" 
              }}
            >
              <RobotOutlined 
                style={{ 
                  fontSize: '18px',
                  color: isTyping ? 'rgba(100, 116, 139, 0.9)' : 'rgba(71, 85, 105, 0.8)',
                  filter: isTyping ? 'drop-shadow(0 0 6px rgba(100, 116, 139, 0.3))' : 'none',
                  transition: 'all 0.3s ease'
                }} 
              />
            </motion.div>
            <Text strong style={{ 
              color: 'rgba(51, 65, 85, 0.9)', 
              fontSize: '16px', 
              fontWeight: 600,
              letterSpacing: '-0.01em'
            }}>
              Asistente IA
            </Text>
            <AnimatePresence>
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Space>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <LoadingOutlined style={{ color: 'rgba(100, 116, 139, 0.8)' }} />
                    </motion.div>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: 'auto' }}
                      transition={{ duration: 0.5 }}
                    >
                      <Text style={{ 
                        color: 'rgba(71, 85, 105, 0.8)', 
                        fontSize: '12px',
                        fontWeight: 500
                      }}>
                        Generando respuesta inteligente...
                      </Text>
                    </motion.div>
                  </Space>
                </motion.div>
              )}
            </AnimatePresence>
          </Space>
          
          <Space>
            <Popover
              content={templateContent}
              title="Plantillas rápidas"
              trigger="click"
              placement="topRight"
            >
              <Tooltip title="Plantillas rápidas">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    size="small" 
                    icon={<BulbOutlined />}
                    type="text"
                    style={{
                      color: 'rgba(71, 85, 105, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(10px)',
                      transition: 'all 0.3s ease'
                    }}
                    className="hover:shadow-lg"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.color = 'rgba(71, 85, 105, 0.9)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.color = 'rgba(71, 85, 105, 0.7)';
                    }}
                  />
                </motion.div>
              </Tooltip>
            </Popover>
            
            <Popover
              content={settingsContent}
              title="Configuración IA"
              trigger="click"
              placement="topRight"
            >
              <Tooltip title="Configurar IA">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    size="small" 
                    icon={<SettingOutlined />}
                    type="text"
                    style={{
                      color: 'rgba(71, 85, 105, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(10px)',
                      transition: 'all 0.3s ease'
                    }}
                    className="hover:shadow-lg"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.color = 'rgba(71, 85, 105, 0.9)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.color = 'rgba(71, 85, 105, 0.7)';
                    }}
                  />
                </motion.div>
              </Tooltip>
            </Popover>
          </Space>
        </div>

        <div>
          <motion.div
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Button
              type="primary"
              icon={
                <motion.div
                  animate={loading ? { 
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.7, 1] 
                  } : {}}
                  transition={{ 
                    duration: 1, 
                    repeat: loading ? Infinity : 0,
                    ease: "easeInOut" 
                  }}
                >
                  {loading ? <LoadingOutlined /> : <ThunderboltOutlined />}
                </motion.div>
              }
              loading={false}
              onClick={generateAIResponse}
              disabled={isTyping}
              size="large"
              block
              className="relative overflow-hidden"
              style={{
                background: loading ? 
                  'rgba(255, 255, 255, 0.15)' : 
                  'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '16px',
                color: loading ? 'rgba(51, 65, 85, 0.9)' : 'rgba(71, 85, 105, 0.9)',
                fontWeight: 600,
                fontSize: '14px',
                height: '56px',
                backdropFilter: 'blur(20px)',
                boxShadow: loading ? 
                  '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.3)' : 
                  '0 6px 24px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={(e) => {
                if (!loading && !isTyping) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && !isTyping) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 6px 24px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                }
              }}
            >
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {loading 
                  ? 'Generando respuesta...' 
                  : isTyping 
                    ? 'Escribiendo...'
                    : 'Generar respuesta con IA'
                }
              </motion.span>
              
              {/* Partículas de fondo cuando está generando */}
              <AnimatePresence>
                {showParticles && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {[...Array(6)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-1 h-1 rounded-full"
                        style={{
                          left: `${20 + i * 15}%`,
                          top: '50%',
                          backgroundColor: 'rgba(100, 116, 139, 0.6)'
                        }}
                        animate={{
                          y: [-10, 10, -10],
                          opacity: [0.3, 1, 0.3]
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.2
                        }}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Paragraph 
            style={{ 
              fontSize: '12px', 
              margin: 0, 
              textAlign: 'center',
              color: 'rgba(71, 85, 105, 0.7)',
              fontWeight: 400,
              lineHeight: 1.4
            }}
          >
            La IA analizará el mensaje y el contexto para sugerir una respuesta apropiada con tono{' '}
            <motion.strong
              style={{ color: 'rgba(51, 65, 85, 0.9)', fontWeight: 600 }}
              animate={{ 
                color: [
                  'rgba(51, 65, 85, 0.9)', 
                  'rgba(100, 116, 139, 1)', 
                  'rgba(51, 65, 85, 0.9)'
                ] 
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {tone}
            </motion.strong>
            . Siempre revisa la respuesta antes de enviarla.
          </Paragraph>
        </motion.div>
        
        {/* Efecto de ondas cuando está escribiendo */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    border: '1px solid rgba(100, 116, 139, 0.2)',
                    backdropFilter: 'blur(4px)'
                  }}
                  animate={{
                    scale: [1, 1.05, 1.1],
                    opacity: [0.4, 0.2, 0]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.5,
                    ease: "easeOut"
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </Space>
    </Card>
    </motion.div>
  );
};

export default AIReplyAssistant;