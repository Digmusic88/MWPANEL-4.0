import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  Card,
  Row,
  Col,
  Avatar,
  Button,
  Select,
  Input,
  AutoComplete,
  Typography,
  Space,
  Tag,
  Tooltip,
  message,
  Modal,
  Image,
  Spin,
  Empty
} from 'antd';
import {
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { debounce } from 'lodash';
import { useAuthStore } from '@store/authStore';

const { Title, Text } = Typography;

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

interface Student {
  id: string;
  name: string;
  enrollmentNumber: string;
  educationalLevel?: string;
  course?: string;
  photoUrl?: string;
}

interface FaceDetectionGridProps {
  groupPhotoId: string;
  faceDetections: FaceDetection[];
  onFaceAssigned: (faceId: string, studentId: string) => void;
  onFaceUnassigned: (faceId: string) => void;
  onRefresh: () => void;
}

export const FaceDetectionGrid: React.FC<FaceDetectionGridProps> = memo(({
  groupPhotoId,
  faceDetections,
  onFaceAssigned,
  onFaceUnassigned,
  onRefresh
}) => {
  const [assigningFace, setAssigningFace] = useState<string | null>(null);
  const [selectedFace, setSelectedFace] = useState<FaceDetection | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Estados para búsqueda por cara específica
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  const [studentResults, setStudentResults] = useState<Record<string, Student[]>>({});
  const [searchLoading, setSearchLoading] = useState<Record<string, boolean>>({});
  const activeSearchRef = useRef<string | null>(null);

  // Get access token and user from auth store
  const { accessToken, user } = useAuthStore();

  // Búsqueda de estudiantes con debounce para una cara específica
  const searchStudents = debounce(async (search: string, faceId: string) => {
    console.log('🔍 Buscando estudiantes con término:', search, 'para cara:', faceId);
    
    if (search.length < 2) {
      console.log('🔍 Búsqueda muy corta, limpiando lista');
      setStudentResults(prev => ({ ...prev, [faceId]: [] }));
      setSearchLoading(prev => ({ ...prev, [faceId]: false }));
      return;
    }

    // Set loading para esta cara
    setSearchLoading(prev => ({ ...prev, [faceId]: true }));
    activeSearchRef.current = faceId;
    
    try {
      console.log('🔍 Token desde auth store:', accessToken ? 'OK' : 'NO ENCONTRADO');
      
      if (!accessToken) {
        console.error('🔍 ERROR: No hay token de autenticación disponible');
        message.error('No se encontró token de autenticación');
        return;
      }

      const url = `/api/face-detections/search-students?search=${encodeURIComponent(search)}`;
      console.log('🔍 Llamando a URL:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🔍 Respuesta status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('🔍 Respuesta completa:', result);
        console.log('🔍 Estudiantes encontrados:', result.data?.length || 0);
        
        if (result.success && result.data) {
          setStudentResults(prev => ({ ...prev, [faceId]: result.data }));
          if (result.data.length === 0) {
            console.log('🔍 No se encontraron estudiantes para la búsqueda:', search);
          }
        } else {
          console.error('🔍 Respuesta con formato inesperado:', result);
          setStudentResults(prev => ({ ...prev, [faceId]: [] }));
        }
      } else {
        const errorData = await response.text();
        console.error('🔍 Error en respuesta:', response.status, errorData);
        
        if (response.status === 401) {
          message.error('Token de autenticación inválido o expirado');
        } else if (response.status === 403) {
          message.error('No tienes permisos para buscar estudiantes');
        } else {
          message.error(`Error en búsqueda: ${response.status}`);
        }
      }
    } catch (error) {
      console.error('🔍 Error en búsqueda:', error);
      message.error('Error de conexión al buscar estudiantes');
    } finally {
      setSearchLoading(prev => ({ ...prev, [faceId]: false }));
    }
  }, 300);

  // Manejar cambio de término de búsqueda para una cara específica (optimizado)
  const handleSearchChange = useCallback((value: string, faceId: string) => {
    console.log('🔍 Cambio de búsqueda para cara:', faceId, 'término:', value);
    
    // Actualizar el término de búsqueda para esta cara específica
    setSearchTerms(prev => ({ ...prev, [faceId]: value }));

    // Establecer esta cara como activa para búsqueda
    activeSearchRef.current = faceId;
    
    // Realizar búsqueda
    searchStudents(value, faceId);
  }, [searchStudents]);

  // Asignar cara a estudiante (optimizado)
  const handleAssignFace = useCallback(async (faceId: string, studentId: string) => {
    console.log('🔍 Asignando cara:', faceId, 'a estudiante:', studentId);
    console.log('🔍 Usuario actual:', user?.id);
    
    setAssigningFace(faceId);
    try {
      if (!accessToken) {
        message.error('No se encontró token de autenticación');
        return;
      }

      const requestBody = {
        studentId,
        assignedById: user?.id || null
      };
      
      console.log('🔍 Body de la petición:', requestBody);

      const response = await fetch(`/api/face-detections/${faceId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        message.success('Cara asignada exitosamente');
        onFaceAssigned(faceId, studentId);
        
        // Limpiar el estado de búsqueda para esta cara
        setSearchTerms(prev => {
          const newTerms = { ...prev };
          delete newTerms[faceId];
          return newTerms;
        });
        
        // Limpiar búsqueda activa si era esta cara
        if (activeSearchRef.current === faceId) {
          activeSearchRef.current = null;
        }
        
        // Limpiar estudiantes para esta cara
        setStudentResults(prev => {
          const newResults = { ...prev };
          delete newResults[faceId];
          return newResults;
        });
        setSearchLoading(prev => {
          const newLoading = { ...prev };
          delete newLoading[faceId];
          return newLoading;
        });
      } else {
        const errorData = await response.text();
        console.error('🔍 Error al asignar cara:', response.status, errorData);
        message.error(`Error asignando cara: ${response.status} - ${errorData}`);
      }
    } catch (error) {
      console.error('🔍 Error en asignación:', error);
      message.error('Error asignando cara al estudiante');
    } finally {
      setAssigningFace(null);
    }
  }, [accessToken, user?.id, onFaceAssigned]);

  // Desasignar cara de estudiante (optimizado)
  const handleUnassignFace = useCallback(async (faceId: string) => {
    try {
      if (!accessToken) {
        message.error('No se encontró token de autenticación');
        return;
      }

      const response = await fetch(`/api/face-detections/${faceId}/unassign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        message.success('Cara desasignada exitosamente');
        onFaceUnassigned(faceId);
      } else {
        throw new Error('Error desasignando cara');
      }
    } catch (error) {
      message.error('Error desasignando cara');
    }
  }, [accessToken, onFaceUnassigned]);

  // Mostrar detalles de la cara (optimizado)
  const showFaceDetails = useCallback((face: FaceDetection) => {
    setSelectedFace(face);
    setShowDetailModal(true);
  }, []);

  // Componente para cada cara detectada
  const FaceCard: React.FC<{ face: FaceDetection; index: number }> = React.memo(({ face, index }) => {
    const isAssigned = !!face.assignedStudent;
    const isAssigning = assigningFace === face.id;

    // Corregir URL de thumbnail si viene con /api/uploads/ incorrecto
    let correctedThumbnailUrl = face.thumbnailUrl;
    if (correctedThumbnailUrl && correctedThumbnailUrl.startsWith('/api/uploads/')) {
      correctedThumbnailUrl = correctedThumbnailUrl.replace('/api/uploads/', '/uploads/');
      console.log('🔧 Corrigiendo URL de thumbnail:', face.thumbnailUrl, '→', correctedThumbnailUrl);
    }
    
    // Generar URL de imagen placeholder si no hay thumbnail
    const imageUrl = correctedThumbnailUrl || `https://via.placeholder.com/200x200/f0f0f0/d9d9d9?text=Cara+${index + 1}`;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
        whileHover={{ scale: 1.02 }}
      >
        <Card
          hoverable
          style={{
            height: '100%',
            border: isAssigned ? '2px solid #52c41a' : '2px solid #d9d9d9',
            minHeight: '400px'
          }}
        >
          {/* Imagen de la cara */}
          <div style={{ position: 'relative', height: '200px', overflow: 'hidden', marginBottom: '16px' }}>
            <Image
              src={imageUrl}
              alt={`Cara ${index + 1}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '8px'
              }}
              preview={false}
              fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAzCDLwMfAzSCTmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYzN2rJkOHFiSI7elMEbcGrXrl07HbmyOoA3YOzUFiGilYOVnbgCZyAH3oARBQoTO18ZgnGF3sHOAOPNDNjMhQy4EGvUJCJEwzDCpOHh6Lef+nG5VJL/VJsoBJy6FhLXRIqA+7VzPv/9qx64cRGCIAhBcAMKgiIoBBCBOxA"
            />
            
            {/* Indicador de estado */}
            <div
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px'
              }}
            >
              {isAssigned ? (
                <Tag color="success" icon={<CheckCircleOutlined />}>
                  Asignado
                </Tag>
              ) : (
                <Tag color="warning" icon={<CloseCircleOutlined />}>
                  Sin asignar
                </Tag>
              )}
            </div>

            {/* Puntuación de confianza */}
            {face.confidenceScore && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '8px',
                  left: '8px'
                }}
              >
                <Tag color="blue">
                  {Math.round(face.confidenceScore * 100)}%
                </Tag>
              </div>
            )}
          </div>

          {/* Título */}
          <div style={{ marginBottom: '12px' }}>
            <Text strong style={{ fontSize: '16px' }}>
              Cara {index + 1}
            </Text>
          </div>

          {/* Contenido de asignación */}
          {isAssigned ? (
            <div style={{ marginBottom: '16px' }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Text strong style={{ color: '#52c41a', fontSize: '14px' }}>
                  Asignado a:
                </Text>
                <Text strong style={{ fontSize: '15px' }}>
                  {face.assignedStudent?.user?.profile?.firstName || ''}{' '}
                  {face.assignedStudent?.user?.profile?.lastName || ''}
                </Text>
                <Text type="secondary" style={{ fontSize: '13px' }}>
                  Matrícula: {face.assignedStudent?.enrollmentNumber}
                </Text>
              </Space>
            </div>
          ) : (
            <div style={{ marginBottom: '16px' }}>
              <Text strong style={{ color: '#fa8c16', marginBottom: '8px', display: 'block' }}>
                Sin asignar
              </Text>
              <AutoComplete
                placeholder="Buscar estudiante por nombre..."
                style={{ width: '100%', minHeight: '40px' }}
                size="large"
                value={searchTerms[face.id] || ''}
                options={
                  (studentResults[face.id] || []).map(student => ({
                    value: student.id,
                    label: (
                      <div style={{ display: 'flex', alignItems: 'center', padding: '4px 0' }}>
                        <Avatar 
                          src={student.photoUrl} 
                          icon={<UserOutlined />} 
                          size="small" 
                          style={{ marginRight: '8px' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'bold' }}>{student.name}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {student.enrollmentNumber}
                          </div>
                        </div>
                      </div>
                    )
                  }))
                }
                onSearch={(value) => {
                  console.log('🔍 onSearch llamado para cara:', face.id, 'valor:', value);
                  handleSearchChange(value, face.id);
                }}
                onSelect={(value) => {
                  console.log('🔍 onSelect llamado para cara:', face.id, 'estudiante:', value);
                  handleAssignFace(face.id, value);
                }}
                onFocus={() => {
                  console.log('🔍 onFocus llamado para cara:', face.id);
                  activeSearchRef.current = face.id;
                }}
                filterOption={false}
                notFoundContent={
                  searchLoading[face.id] ? 
                    <Spin size="small" /> : 
                    ((studentResults[face.id] || []).length === 0 && searchTerms[face.id] && searchTerms[face.id].length >= 2) ?
                      'No se encontraron estudiantes' : null
                }
              />
            </div>
          )}

          {/* Botones de acción */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <Button
              icon={<EyeOutlined />}
              onClick={() => showFaceDetails(face)}
              size="small"
            >
              Detalles
            </Button>
            {isAssigned ? (
              <Button
                icon={<DeleteOutlined />}
                onClick={() => handleUnassignFace(face.id)}
                size="small"
                danger
              >
                Desasignar
              </Button>
            ) : (
              <Button
                icon={<EditOutlined />}
                loading={isAssigning}
                size="small"
                disabled
              >
                Asignar
              </Button>
            )}
          </div>
        </Card>
      </motion.div>
    );
  });

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4}>
              Caras Detectadas ({faceDetections.length})
            </Title>
            <Text type="secondary">
              Asignadas: {faceDetections.filter(f => f.assignedStudent).length} | 
              Sin asignar: {faceDetections.filter(f => !f.assignedStudent).length}
            </Text>
          </Col>
          <Col>
            <Button icon={<SearchOutlined />} onClick={onRefresh}>
              Actualizar
            </Button>
          </Col>
        </Row>
      </div>

      {faceDetections.length === 0 ? (
        <Empty
          description="No hay caras detectadas"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <Row gutter={[16, 16]}>
          {faceDetections.map((face, index) => (
            <Col key={face.id} xs={24} sm={12} md={8} lg={6}>
              <FaceCard face={face} index={index} />
            </Col>
          ))}
        </Row>
      )}

      {/* Modal de detalles */}
      <Modal
        title="Detalles de la Cara"
        open={showDetailModal}
        onCancel={() => setShowDetailModal(false)}
        footer={null}
        width={600}
      >
        {selectedFace && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              {selectedFace.thumbnailUrl ? (
                <Image
                  src={selectedFace.thumbnailUrl.startsWith('/api/uploads/') 
                    ? selectedFace.thumbnailUrl.replace('/api/uploads/', '/uploads/')
                    : selectedFace.thumbnailUrl}
                  alt="Cara seleccionada"
                  style={{ maxWidth: '200px', maxHeight: '200px' }}
                />
              ) : (
                <Avatar size={200} icon={<UserOutlined />} />
              )}
            </div>

            <div>
              <Title level={5}>Información de Detección</Title>
              <Space direction="vertical">
                <Text>
                  <strong>Confianza:</strong> {selectedFace.confidenceScore ? 
                    `${Math.round(selectedFace.confidenceScore * 100)}%` : 'N/A'}
                </Text>
                <Text>
                  <strong>Coordenadas:</strong> X: {selectedFace.faceCoordinates.x}, 
                  Y: {selectedFace.faceCoordinates.y}
                </Text>
                <Text>
                  <strong>Tamaño:</strong> {selectedFace.faceCoordinates.width} × {selectedFace.faceCoordinates.height}
                </Text>
                <Text>
                  <strong>Detectado:</strong> {new Date(selectedFace.createdAt).toLocaleString()}
                </Text>
              </Space>
            </div>

            {selectedFace.assignedStudent && (
              <div>
                <Title level={5}>Estudiante Asignado</Title>
                <Space>
                  <Avatar src={selectedFace.assignedStudent?.photoUrl} icon={<UserOutlined />} />
                  <div>
                    <Text strong>
                      {selectedFace.assignedStudent?.user?.profile?.firstName}{' '}
                      {selectedFace.assignedStudent?.user?.profile?.lastName}
                    </Text>
                    <br />
                    <Text type="secondary">
                      {selectedFace.assignedStudent?.enrollmentNumber}
                    </Text>
                  </div>
                </Space>
                <br />
                <Text>
                  <strong>Asignado:</strong> {selectedFace.assignedAt ? 
                    new Date(selectedFace.assignedAt).toLocaleString() : 'N/A'}
                </Text>
              </div>
            )}
          </Space>
        )}
      </Modal>
    </div>
  );
});

FaceDetectionGrid.displayName = 'FaceDetectionGrid';