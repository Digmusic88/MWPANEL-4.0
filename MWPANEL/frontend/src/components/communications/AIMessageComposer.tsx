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
  Alert,
  Input,
  Row,
  Col
} from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RobotOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  SettingOutlined,
  LoadingOutlined,
  EditOutlined,
  SendOutlined,
} from '@ant-design/icons';
import '../../styles/ai-assistant.css';
import aiAssistantService, { AIComposeOptions } from '../../services/aiAssistantService';
import { useAuthStore } from '../../store/authStore';

const { Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface User {
  id: string;
  profile: {
    firstName: string;
    lastName: string;
  };
}

interface Student {
  id: string;
  user: {
    profile: {
      firstName: string;
      lastName: string;
    };
  };
}

interface AIMessageComposerProps {
  messageType?: 'announcement' | 'direct' | 'concern' | 'question' | 'request';
  recipientId?: string;
  recipients?: User[];
  students?: Student[];
  onMessageGenerated: (content: string) => void;
  className?: string;
}

const AIMessageComposer: React.FC<AIMessageComposerProps> = ({
  messageType = 'direct',
  recipientId,
  recipients = [],
  students = [],
  onMessageGenerated,
  className = '',
}) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [canUseAI, setCanUseAI] = useState(false);
  const [tone, setTone] = useState<'formal' | 'empático' | 'informativo' | 'neutro'>('empático');
  const [isTyping, setIsTyping] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [intention, setIntention] = useState<string>('');
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>(recipientId || '');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  useEffect(() => {
    checkAIAvailability();
  }, []);

  useEffect(() => {
    setSelectedRecipientId(recipientId || '');
  }, [recipientId]);

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
    return user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'family';
  };

  const getRecipientName = () => {
    if (!selectedRecipientId) return '';
    const recipient = recipients.find(r => r.id === selectedRecipientId);
    return recipient 
      ? `${recipient.profile.firstName} ${recipient.profile.lastName}`
      : '';
  };

  const getRelatedStudentName = () => {
    if (!selectedStudentId) return undefined;
    const student = students.find(s => s.id === selectedStudentId);
    return student 
      ? `${student.user.profile.firstName} ${student.user.profile.lastName}`
      : undefined;
  };

  const generateAIMessage = async () => {
    if (!canUseAI || !aiEnabled || !isUserAuthorized()) {
      return;
    }

    if (!intention.trim()) {
      antdMessage.error('Por favor, describe qué quieres comunicar');
      return;
    }

    setLoading(true);
    setIsTyping(true);

    try {
      const composeOptions: AIComposeOptions = {
        recipientId: selectedRecipientId || undefined,
        recipientName: getRecipientName() || undefined,
        relatedStudent: getRelatedStudentName(),
        messageType,
        tone,
      };

      const aiResponse = await aiAssistantService.composeMessage(
        intention,
        composeOptions
      );

      // Activar animaciones futuristas
      setShowParticles(true);
      
      // Simular escritura tipo Gemini con efectos avanzados
      await aiAssistantService.simulateTyping(
        aiResponse.content,
        (partialText, isComplete) => {
          onMessageGenerated(partialText);
          
          // Agregar efectos visuales durante la escritura
          if (!isComplete) {
            // Efecto de "pensando" mientras escribe
            setShowParticles(true);
          }
        },
        40 // velocidad de escritura optimizada
      );
      
      setShowParticles(false);
      antdMessage.success('Mensaje generado con IA');
      
      // Limpiar la intención después de generar el mensaje
      setIntention('');
    } catch (err) {
      console.error('Error generating AI message:', err);
      antdMessage.error('Error al generar mensaje automático');
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  const insertQuickTemplate = (template: string) => {
    const templates = aiAssistantService.getQuickTemplates(user?.role || 'teacher');
    let content = templates[template] || template;
    
    // Reemplazar placeholders
    const relatedStudent = getRelatedStudentName();
    if (relatedStudent) {
      content = content.replace('{estudiante}', relatedStudent);
    }

    onMessageGenerated(content);
    antdMessage.success('Plantilla insertada');
  };

  const intentionSuggestions = {
    announcement: [
      'Informar sobre un evento escolar importante',
      'Comunicar cambios en el horario',
      'Anunciar una reunión de padres', 
      'Notificar sobre actividades extracurriculares'
    ],
    direct: [
      'Informar sobre el progreso académico del estudiante',
      'Solicitar reunión para hablar sobre el comportamiento',
      'Comunicar una preocupación específica',
      'Felicitar por los logros del estudiante'
    ],
    concern: [
      'Expresar preocupación sobre el rendimiento académico',
      'Discutir problemas de comportamiento en clase',
      'Solicitar apoyo adicional para el estudiante',
      'Informar sobre dificultades observadas'
    ],
    question: [
      'Preguntar sobre la situación familiar del estudiante',
      'Consultar sobre necesidades especiales',
      'Solicitar información adicional',
      'Preguntar sobre disponibilidad para reunión'
    ],
    request: [
      'Solicitar documentación necesaria',
      'Pedir colaboración en una actividad',
      'Solicitar presencia en evento escolar',
      'Pedir apoyo para refuerzo en casa'
    ]
  };

  const settingsContent = (
    <div style={{ width: 300 }}>
      <div style={{ marginBottom: 16 }}>
        <Text strong>Tono del mensaje:</Text>
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

      <div style={{ marginBottom: 16 }}>
        <Text strong>Destinatario:</Text>
        <Select
          value={selectedRecipientId}
          onChange={setSelectedRecipientId}
          style={{ width: '100%', marginTop: 8 }}
          size="small"
          placeholder="Seleccionar destinatario"
          allowClear
        >
          {recipients.map(recipient => (
            <Option key={recipient.id} value={recipient.id}>
              {recipient.profile.firstName} {recipient.profile.lastName}
            </Option>
          ))}
        </Select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Text strong>Estudiante relacionado:</Text>
        <Select
          value={selectedStudentId}
          onChange={setSelectedStudentId}
          style={{ width: '100%', marginTop: 8 }}
          size="small"
          placeholder="Opcional"
          allowClear
        >
          {students.map(student => (
            <Option key={student.id} value={student.id}>
              {student.user.profile.firstName} {student.user.profile.lastName}
            </Option>
          ))}
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
    <div style={{ width: 350, maxHeight: 400, overflowY: 'auto' }}>
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
                {template.length > 80 ? `${template.substring(0, 80)}...` : template}
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

  if (!aiEnabled || !canUseAI) {
    return null;
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
                <EditOutlined 
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
                Compositor IA
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
                          Componiendo mensaje...
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
                title="Configuración de composición"
                trigger="click"
                placement="topRight"
              >
                <Tooltip title="Configurar compositor">
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

          {/* Campo de intención */}
          <div>
            <Text style={{ 
              color: 'rgba(71, 85, 105, 0.8)', 
              fontSize: '13px',
              fontWeight: 500
            }}>
              Describe qué quieres comunicar:
            </Text>
            <TextArea
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              placeholder="Ej: Quiero informar a los padres sobre el excelente progreso del estudiante en matemáticas..."
              autoSize={{ minRows: 2, maxRows: 4 }}
              style={{
                marginTop: 8,
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                color: 'rgba(51, 65, 85, 0.9)',
                fontSize: '14px',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.3s ease',
                padding: '12px 16px'
              }}
              onFocus={(e) => {
                e.target.style.border = '1px solid rgba(100, 116, 139, 0.4)';
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.18)';
              }}
              onBlur={(e) => {
                e.target.style.border = '1px solid rgba(255, 255, 255, 0.2)';
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
              }}
            />
          </div>

          {/* Sugerencias rápidas */}
          {intentionSuggestions[messageType] && (
            <div>
              <Text style={{ 
                fontSize: '11px',
                color: 'rgba(71, 85, 105, 0.7)',
                fontWeight: 500
              }}>
                Sugerencias:
              </Text>
              <Row gutter={[4, 4]} style={{ marginTop: 4 }}>
                {intentionSuggestions[messageType].slice(0, 3).map((suggestion, index) => (
                  <Col key={index}>
                    <Button
                      size="small"
                      type="text"
                      onClick={() => setIntention(suggestion)}
                      style={{
                        fontSize: '10px',
                        padding: '4px 12px',
                        height: 'auto',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '16px',
                        color: 'rgba(71, 85, 105, 0.8)',
                        backdropFilter: 'blur(8px)',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
                        e.currentTarget.style.color = 'rgba(51, 65, 85, 0.9)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.color = 'rgba(71, 85, 105, 0.8)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
                      }}
                    >
                      {suggestion.length > 30 ? `${suggestion.substring(0, 27)}...` : suggestion}
                    </Button>
                  </Col>
                ))}
              </Row>
            </div>
          )}

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
                    {loading ? <LoadingOutlined /> : <SendOutlined />}
                  </motion.div>
                }
                loading={false}
                onClick={generateAIMessage}
                disabled={isTyping || !intention.trim()}
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
                  height: '48px',
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
                    ? 'Componiendo mensaje...' 
                    : isTyping 
                      ? 'Escribiendo...'
                      : 'Componer mensaje con IA'
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
                          className="absolute w-1 h-1 bg-white rounded-full"
                          style={{
                            left: `${20 + i * 15}%`,
                            top: '50%'
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
                fontSize: '11px', 
                margin: 0, 
                textAlign: 'center',
                color: 'rgba(71, 85, 105, 0.7)',
                fontWeight: 400,
                lineHeight: 1.4
              }}
            >
              La IA creará un mensaje personalizado con tono{' '}
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
              {getRecipientName() && ` para ${getRecipientName()}`}
              {getRelatedStudentName() && ` sobre ${getRelatedStudentName()}`}
              . Revisa antes de enviar.
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

export default AIMessageComposer;