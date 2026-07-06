import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Steps,
  Button,
  Space,
  Divider,
  message,
  Spin,
  Alert,
  Statistic
} from 'antd';
import {
  UploadOutlined,
  ScanOutlined,
  UserAddOutlined,
  CheckCircleOutlined,
  CameraOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { GroupPhotoUpload } from './GroupPhotoUpload';
import { FaceDetectionGrid } from './FaceDetectionGrid';
import { useAuthStore } from '@store/authStore';

const { Title, Text } = Typography;
const { Step } = Steps;

interface GroupPhoto {
  id: string;
  originalFilename: string;
  originalUrl: string;
  uploadDate: string;
  facesDetected: number;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  classGroup?: {
    id: string;
    name: string;
    section?: string;
  };
}

interface FaceDetection {
  id: string;
  faceCoordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  thumbnailUrl?: string;
  confidenceScore?: number;
  assignedStudent?: {
    id: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
    enrollmentNumber: string;
    photoUrl?: string;
  };
  assignedAt?: string;
  createdAt: string;
}

interface ClassGroup {
  id: string;
  name: string;
  section?: string;
  studentsCount: number;
}

interface FacialRecognitionBulkProps {
  editingPhotoId?: string | null;
  onBackToHistory?: () => void;
}

export const FacialRecognitionBulk: React.FC<FacialRecognitionBulkProps> = ({
  editingPhotoId = null,
  onBackToHistory
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [currentGroupPhoto, setCurrentGroupPhoto] = useState<GroupPhoto | null>(null);
  const [faceDetections, setFaceDetections] = useState<FaceDetection[]>([]);
  const [statistics, setStatistics] = useState({
    totalFaces: 0,
    assignedFaces: 0,
    unassignedFaces: 0,
    processingTime: 0
  });

  // Get access token from auth store
  const { accessToken } = useAuthStore();

  // Cargar grupos de clase al montar el componente
  useEffect(() => {
    loadClassGroups();
  }, [accessToken]); // Add accessToken as dependency

  // Handle editing mode - load existing photo when editingPhotoId is provided
  useEffect(() => {
    if (editingPhotoId && accessToken) {
      loadExistingPhoto(editingPhotoId);
    }
  }, [editingPhotoId, accessToken]);

  const loadClassGroups = async () => {
    try {
      if (!accessToken) {
        console.log('🔄 Sin token de autenticación, esperando...');
        return;
      }

      console.log('🔄 Cargando grupos de clase...');
      const response = await fetch('/api/class-groups', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      console.log('🔄 Respuesta grupos de clase:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('🔄 Grupos de clase recibidos:', result.length || result.data?.length || 0);
        // Handle both formats - direct array or wrapped in data
        const groups = Array.isArray(result) ? result : (result.data || []);
        setClassGroups(groups);
        
        if (groups.length === 0) {
          message.info('No hay grupos de clase disponibles');
        }
      } else {
        const errorText = await response.text();
        console.error('🔄 Error respuesta grupos:', response.status, errorText);
        message.error('Error cargando grupos de clase');
      }
    } catch (error) {
      console.error('🔄 Error cargando grupos de clase:', error);
      message.error('Error cargando grupos de clase');
    }
  };

  // Load existing photo for editing mode
  const loadExistingPhoto = async (photoId: string) => {
    setLoading(true);
    try {
      console.log('🔄 Cargando foto existente para edición:', photoId);
      
      // Load photo details
      const photoResponse = await fetch(`/api/group-photos/${photoId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (photoResponse.ok) {
        const photoResult = await photoResponse.json();
        const groupPhoto = photoResult.data;
        setCurrentGroupPhoto(groupPhoto);
        console.log('🔄 Foto cargada:', groupPhoto.originalFilename);

        // Load face detections for this photo
        await loadFaceDetections(photoId);
        
        // Set to assignment step (skip upload)
        setCurrentStep(1);
        
        message.success(`Editando asignaciones para: ${groupPhoto.originalFilename}`);
      } else {
        message.error('Error cargando la foto para edición');
      }
    } catch (error) {
      console.error('🔄 Error cargando foto existente:', error);
      message.error('Error cargando la foto para edición');
    } finally {
      setLoading(false);
    }
  };

  // Cargar detecciones faciales
  const loadFaceDetections = async (groupPhotoId: string) => {
    setLoading(true);
    try {
      if (!accessToken) {
        message.error('No se encontró token de autenticación');
        return;
      }

      const response = await fetch(`/api/face-detections?groupPhotoId=${groupPhotoId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setFaceDetections(result.data || []);
        updateStatistics(result.data || []);
      }
    } catch (error) {
      message.error('Error cargando detecciones faciales');
    } finally {
      setLoading(false);
    }
  };

  // Actualizar estadísticas
  const updateStatistics = (faces: FaceDetection[]) => {
    const assigned = faces.filter(f => f.assignedStudent).length;
    const unassigned = faces.filter(f => !f.assignedStudent).length;
    
    setStatistics({
      totalFaces: faces.length,
      assignedFaces: assigned,
      unassignedFaces: unassigned,
      processingTime: 0 // Se calcularía en implementación real
    });
  };

  // Manejar subida completada
  const handleUploadComplete = (groupPhoto: GroupPhoto, faces: FaceDetection[]) => {
    console.log('🔍 [FacialRecognitionBulk] handleUploadComplete called with:', {
      groupPhoto: groupPhoto?.id,
      facesCount: faces?.length,
      currentStep: currentStep
    });
    
    setCurrentGroupPhoto(groupPhoto);
    setFaceDetections(faces);
    updateStatistics(faces);
    setCurrentStep(1);
    
    console.log('🔍 [FacialRecognitionBulk] Setting currentStep to 1');
    message.success('Foto procesada exitosamente');
  };

  // Manejar asignación de cara
  const handleFaceAssigned = useCallback((faceId: string, studentId: string) => {
    setFaceDetections(prev => 
      prev.map(face => 
        face.id === faceId 
          ? { ...face, assignedStudent: { id: studentId } as any }
          : face
      )
    );
    updateStatistics(faceDetections);
  }, [faceDetections]);

  // Manejar desasignación de cara
  const handleFaceUnassigned = useCallback((faceId: string) => {
    setFaceDetections(prev => 
      prev.map(face => 
        face.id === faceId 
          ? { ...face, assignedStudent: undefined }
          : face
      )
    );
    updateStatistics(faceDetections);
  }, [faceDetections]);

  // Memoized refresh callback
  const handleRefresh = useCallback(() => {
    if (currentGroupPhoto?.id) {
      loadFaceDetections(currentGroupPhoto.id);
    }
  }, [currentGroupPhoto?.id]);

  // Completar proceso
  const handleComplete = () => {
    const unassignedCount = statistics.unassignedFaces;
    if (unassignedCount > 0) {
      message.warning(`Quedan ${unassignedCount} caras sin asignar`);
      return;
    }

    if (editingPhotoId) {
      // In editing mode, go back to history
      message.success('¡Cambios guardados exitosamente!');
      if (onBackToHistory) {
        onBackToHistory();
      }
    } else {
      // Normal flow, go to completion step
      setCurrentStep(2);
      message.success('¡Proceso completado exitosamente!');
    }
  };

  // Reiniciar proceso
  const handleReset = () => {
    setCurrentStep(0);
    setCurrentGroupPhoto(null);
    setFaceDetections([]);
    setStatistics({
      totalFaces: 0,
      assignedFaces: 0,
      unassignedFaces: 0,
      processingTime: 0
    });
  };

  const steps = [
    {
      title: 'Subir Foto',
      description: 'Seleccionar y procesar foto grupal',
      icon: <UploadOutlined />
    },
    {
      title: 'Asignar Estudiantes',
      description: 'Identificar caras con estudiantes',
      icon: <UserAddOutlined />
    },
    {
      title: 'Completado',
      description: 'Proceso finalizado exitosamente',
      icon: <CheckCircleOutlined />
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Encabezado */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2}>
              <CameraOutlined /> {editingPhotoId ? 'Editar Asignaciones de Caras' : 'Reconocimiento Facial Bulk'}
            </Title>
            <Text type="secondary">
              {editingPhotoId 
                ? 'Edita las asignaciones de caras para esta foto grupal'
                : 'Sube una foto grupal y asigna automáticamente las caras detectadas a los estudiantes'
              }
            </Text>
          </div>
          {editingPhotoId && onBackToHistory && (
            <Button 
              icon={<HistoryOutlined />}
              onClick={onBackToHistory}
              size="large"
            >
              Volver al Historial
            </Button>
          )}
        </div>
      </div>

      {/* Progreso */}
      <Card style={{ marginBottom: '24px' }}>
        <Steps 
          current={editingPhotoId ? Math.max(0, currentStep - 1) : currentStep} 
          items={editingPhotoId ? steps.slice(1) : steps} // Skip upload step in editing mode
        />
      </Card>

      {/* Estadísticas */}
      {currentStep > 0 && (
        <Card style={{ marginBottom: '24px' }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="Total de Caras"
                value={statistics.totalFaces}
                prefix={<ScanOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Asignadas"
                value={statistics.assignedFaces}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Sin Asignar"
                value={statistics.unassignedFaces}
                prefix={<UserAddOutlined />}
                valueStyle={{ color: '#cf1322' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Progreso"
                value={statistics.totalFaces > 0 ? Math.round(((statistics.assignedFaces / statistics.totalFaces) * 100) * 10) / 10 : 0}
                suffix="%"
                valueStyle={{ color: statistics.unassignedFaces === 0 ? '#3f8600' : '#1890ff' }}
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* Contenido principal */}
      <AnimatePresence mode="wait">
        {currentStep === 0 && !editingPhotoId && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <GroupPhotoUpload
              onUploadComplete={handleUploadComplete}
              classGroups={classGroups}
              onFacesDetected={() => {}}
            />
          </motion.div>
        )}

        {currentStep === 1 && (
          <motion.div
            key="assign"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {/* Información de la foto actual */}
              {currentGroupPhoto && (
                <Alert
                  message={
                    <Space>
                      <Text strong>Foto actual:</Text>
                      <Text>{currentGroupPhoto.originalFilename}</Text>
                      {currentGroupPhoto.classGroup && (
                        <Text type="secondary">
                          - {currentGroupPhoto.classGroup.name}
                        </Text>
                      )}
                    </Space>
                  }
                  type="info"
                  showIcon
                />
              )}

              {/* Grid de caras */}
              <Spin spinning={loading}>
                <FaceDetectionGrid
                  groupPhotoId={currentGroupPhoto?.id || ''}
                  faceDetections={faceDetections}
                  onFaceAssigned={handleFaceAssigned}
                  onFaceUnassigned={handleFaceUnassigned}
                  onRefresh={handleRefresh}
                />
              </Spin>

              {/* Botones de navegación */}
              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <Space>
                  {editingPhotoId ? (
                    <Button 
                      icon={<HistoryOutlined />}
                      onClick={onBackToHistory}
                    >
                      Volver al Historial
                    </Button>
                  ) : (
                    <Button onClick={() => setCurrentStep(0)}>
                      Volver
                    </Button>
                  )}
                  <Button
                    type="primary"
                    onClick={handleComplete}
                    disabled={statistics.unassignedFaces > 0}
                  >
                    {editingPhotoId ? 'Guardar Cambios' : 'Completar Proceso'}
                  </Button>
                </Space>
              </div>
            </Space>
          </motion.div>
        )}

        {currentStep === 2 && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <Card style={{ textAlign: 'center' }}>
              <Space direction="vertical" size="large">
                <CheckCircleOutlined style={{ fontSize: '64px', color: '#52c41a' }} />
                <Title level={2}>¡Proceso Completado!</Title>
                <Text>
                  Se han asignado exitosamente {statistics.assignedFaces} caras a los estudiantes
                </Text>
                
                <div style={{ marginTop: '24px' }}>
                  <Space>
                    <Button type="primary" onClick={handleReset}>
                      Procesar Nueva Foto
                    </Button>
                    <Button onClick={() => window.location.reload()}>
                      Ir al Dashboard
                    </Button>
                  </Space>
                </div>
              </Space>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};