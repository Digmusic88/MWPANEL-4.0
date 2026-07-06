import React, { useState, useRef, useCallback } from 'react';
import { 
  Upload, 
  Button, 
  Progress, 
  Card, 
  Select, 
  message, 
  Modal, 
  Image,
  Typography,
  Space,
  Spin
} from 'antd';
import { 
  UploadOutlined, 
  CameraOutlined, 
  ScanOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { faceDetectionService, FaceDetectionResult } from '../../services/faceDetectionService';
import apiClient from '@services/apiClient';
import axios from 'axios';

const { Title, Text } = Typography;
const { Option } = Select;

interface GroupPhotoUploadProps {
  onUploadComplete: (groupPhoto: any, faces: any[]) => void;
  classGroups: Array<{
    id: string;
    name: string;
    section?: string;
  }>;
  onFacesDetected: (faces: Array<{ x: number; y: number; width: number; height: number }>) => void;
}

export const GroupPhotoUpload: React.FC<GroupPhotoUploadProps> = ({
  onUploadComplete,
  classGroups,
  onFacesDetected
}) => {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedClassGroup, setSelectedClassGroup] = useState<string | undefined>();
  const [progress, setProgress] = useState(0);
  const [detectedFaces, setDetectedFaces] = useState<Array<{ x: number; y: number; width: number; height: number }>>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Create a robust fetch request with extended timeout for face processing
  const createFacialRecognitionRequest = async (url: string, formData: FormData, timeoutMs = 120000) => {
    // Get auth token manually
    const authData = localStorage.getItem('mw-panel-auth');
    let accessToken = '';
    if (authData) {
      try {
        const { state } = JSON.parse(authData);
        accessToken = state?.accessToken || '';
      } catch (error) {
        console.warn('Failed to parse auth data:', error);
      }
    }

    console.log('🔍 [createFacialRecognitionRequest] Making request to:', url);
    console.log('🔍 [createFacialRecognitionRequest] Has auth token:', !!accessToken);
    console.log('🔍 [createFacialRecognitionRequest] Using timeout:', timeoutMs, 'ms');

    // Create controller for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('🔍 [createFacialRecognitionRequest] Request timeout reached, aborting...');
      controller.abort();
    }, timeoutMs);

    try {
      // Direct fetch API call with extended timeout
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('🔍 [createFacialRecognitionRequest] Response received with status:', response.status);
      console.log('🔍 [createFacialRecognitionRequest] Response headers:', response.headers.get('content-type'));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 [createFacialRecognitionRequest] Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      console.log('🔍 [createFacialRecognitionRequest] About to parse JSON response...');
      const jsonResponse = await response.json();
      console.log('🔍 [createFacialRecognitionRequest] JSON response parsed successfully:', {
        hasData: !!jsonResponse.data,
        dataId: jsonResponse.data?.id,
        success: jsonResponse.success
      });
      
      return jsonResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.error('🔍 [createFacialRecognitionRequest] Request was aborted due to timeout');
        throw new Error(`Request timeout after ${timeoutMs / 1000} seconds`);
      }
      console.error('🔍 [createFacialRecognitionRequest] Network error:', error);
      throw error;
    }
  };

  // Create a robust JSON request with timeout handling
  const createJSONRequest = async (url: string, jsonData: any, timeoutMs = 60000) => {
    // Get auth token manually
    const authData = localStorage.getItem('mw-panel-auth');
    let accessToken = '';
    if (authData) {
      try {
        const { state } = JSON.parse(authData);
        accessToken = state?.accessToken || '';
      } catch (error) {
        console.warn('Failed to parse auth data:', error);
      }
    }

    console.log('🔍 [createJSONRequest] Making JSON request to:', url);
    console.log('🔍 [createJSONRequest] Request data:', { facesCount: jsonData?.faces?.length });

    // Create controller for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('🔍 [createJSONRequest] Request timeout reached, aborting...');
      controller.abort();
    }, timeoutMs);

    try {
      // Direct fetch API call for JSON
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(jsonData),
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('🔍 [createJSONRequest] JSON Response received with status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 [createJSONRequest] Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const jsonResponse = await response.json();
      console.log('🔍 [createJSONRequest] JSON response parsed successfully');
      return jsonResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.error('🔍 [createJSONRequest] Request was aborted due to timeout');
        throw new Error(`JSON request timeout after ${timeoutMs / 1000} seconds`);
      }
      console.error('🔍 [createJSONRequest] Network error:', error);
      throw error;
    }
  };

  // Configuración del dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      // No abrir modal, mostrar preview inline
      message.success(`Imagen cargada: ${file.name}`);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  // Función para detectar caras usando MediaPipe
  const detectFaces = useCallback(async (imageFile: File) => {
    setProcessing(true);
    setProgress(20);

    try {
      // Validar imagen antes de procesar
      const validation = await faceDetectionService.validateImageForFaceDetection(imageFile);
      if (!validation.isValid) {
        message.error(`Imagen no válida: ${validation.issues.join(', ')}`);
        return [];
      }

      setProgress(40);

      // Detectar caras usando MediaPipe
      const faces: FaceDetectionResult[] = await faceDetectionService.detectFaces(imageFile);
      
      setProgress(80);

      // Convertir a formato esperado por el componente
      const detectedFaces = faces.map(face => ({
        x: face.x,
        y: face.y,
        width: face.width,
        height: face.height,
        confidence: face.confidence
      }));

      setDetectedFaces(detectedFaces);
      onFacesDetected(detectedFaces);
      setProgress(100);

      if (detectedFaces.length === 0) {
        message.warning('No se detectaron caras en la imagen. Intenta con una imagen más clara.');
      } else {
        message.success(`Se detectaron ${detectedFaces.length} cara(s) en la imagen`);
      }

      return detectedFaces;
    } catch (error) {
      console.error('Error detectando caras:', error);
      message.error('Error detectando caras en la imagen. Verifica que la imagen sea clara y contenga caras visibles.');
      return [];
    } finally {
      setProcessing(false);
    }
  }, [onFacesDetected]);

  // Función para subir la foto y procesar caras
  const handleUpload = async () => {
    if (!uploadedFile) {
      message.error('Por favor selecciona una imagen');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      console.log('🔍 [GroupPhotoUpload] Starting upload process...');
      
      // Primero detectar caras
      const faces = await detectFaces(uploadedFile);
      console.log('🔍 [GroupPhotoUpload] Faces detected:', faces.length);
      
      if (faces.length === 0) {
        message.warning('No se detectaron caras en la imagen');
        setUploading(false);
        return;
      }

      // Subir la foto grupal
      console.log('🔍 [GroupPhotoUpload] Preparing FormData for upload...');
      const formData = new FormData();
      formData.append('image', uploadedFile);
      if (selectedClassGroup) {
        formData.append('classGroupId', selectedClassGroup);
        console.log('🔍 [GroupPhotoUpload] Added classGroupId:', selectedClassGroup);
      }

      console.log('🔍 [GroupPhotoUpload] Making POST request to /group-photos...');
      console.log('🔍 [GroupPhotoUpload] Using main apiClient with extended timeout');
      
      console.log('🔍 [GroupPhotoUpload] About to call fetch API directly...');
      console.log('🔍 [GroupPhotoUpload] FormData contents:', {
        hasImage: formData.has('image'),
        hasClassGroupId: formData.has('classGroupId'),
        classGroupId: formData.get('classGroupId')
      });
      
      const baseURL = import.meta.env.VITE_API_URL || '/api';
      const fullURL = `${baseURL}/group-photos`;
      console.log('🔍 [GroupPhotoUpload] Full URL:', fullURL);
      
      console.log('🔍 [GroupPhotoUpload] About to upload image with enhanced timeout handling...');
      
      // Upload with 2-minute timeout for image processing
      const response = await createFacialRecognitionRequest(fullURL, formData, 120000);
      console.log('🔍 [GroupPhotoUpload] Image upload completed successfully');
      console.log('🔍 [GroupPhotoUpload] POST /group-photos successful');
      const groupPhoto = response.data;

      // Procesar las caras detectadas (con timeout extendido para procesamiento intensivo)
      console.log('🔍 [GroupPhotoUpload] Making POST request to process faces...');
      console.log('🔍 [GroupPhotoUpload] Group photo ID:', groupPhoto.id);
      console.log('🔍 [GroupPhotoUpload] Faces to process:', faces.length);
      
      // Use JSON request for face processing 
      const faceProcessingData = {
        faces: faces.map(face => ({
          x: face.x,
          y: face.y,
          width: face.width,
          height: face.height,
          confidence: 0.8
        }))
      };
      
      console.log('🔍 [GroupPhotoUpload] About to process faces with enhanced timeout...');
      const processResponse = await createJSONRequest(
        `${baseURL}/group-photos/${groupPhoto.id}/process-faces`, 
        faceProcessingData,
        90000 // 90 seconds for face processing
      );
      
      console.log('🔍 [GroupPhotoUpload] POST process-faces successful');
      
      console.log('🔍 [GroupPhotoUpload] Upload successful, calling onUploadComplete with:', {
        groupPhotoId: groupPhoto.id,
        facesCount: faces.length,
        responseData: processResponse.data?.faceDetections?.length || 0
      });
      
      message.success(`Foto subida exitosamente! Se detectaron ${faces.length} caras.`);
      onUploadComplete(groupPhoto, processResponse.data?.faceDetections || []);
      
      // Limpiar formulario
      setUploadedFile(null);
      setPreviewUrl(null);
      setSelectedClassGroup(undefined);
      setDetectedFaces([]);
      setProgress(0);

    } catch (error) {
      console.error('🔍 [GroupPhotoUpload] Error during upload process:', error);
      console.error('🔍 [GroupPhotoUpload] Error details:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        type: typeof error
      });
      
      // Enhanced error handling with specific messages
      if (error?.message?.includes('timeout')) {
        message.error('Timeout: El procesamiento de caras está tomando más tiempo del esperado. Por favor, inténtalo de nuevo.');
      } else if (error?.name === 'AbortError') {
        message.error('Operación cancelada: El procesamiento de la imagen fue interrumpido.');
      } else if (error?.message?.includes('HTTP error')) {
        const statusMatch = error.message.match(/status: (\d+)/);
        const status = statusMatch ? statusMatch[1] : 'unknown';
        if (status === '413') {
          message.error('Error: La imagen es demasiado grande. Usa una imagen más pequeña.');
        } else if (status === '400') {
          message.error('Error: La imagen no es válida o no se pueden detectar caras.');
        } else {
          message.error(`Error del servidor (${status}): No se pudo procesar la imagen.`);
        }
      } else if (error?.message?.includes('Failed to fetch') || error?.message?.includes('fetch')) {
        message.error('Error de conexión: No se puede conectar con el servidor. Verifica tu conexión a internet.');
      } else if (error?.message?.includes('NetworkError')) {
        message.error('Error de red: Problema de conectividad con el servidor.');
      } else {
        message.error(`Error procesando la imagen: ${error?.message || 'Error desconocido'}`);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setUploadedFile(null);
    setPreviewUrl(null);
    setSelectedClassGroup(undefined);
    setDetectedFaces([]);
    setProgress(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card
        title={
          <Space>
            <CameraOutlined />
            <Title level={4} style={{ margin: 0 }}>
              Subir Foto Grupal
            </Title>
          </Space>
        }
        extra={
          detectedFaces.length > 0 && (
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <Text type="success">{detectedFaces.length} caras detectadas</Text>
            </Space>
          )
        }
      >
        {/* Área de subida o preview */}
        {!previewUrl ? (
          <div
            {...getRootProps()}
            style={{
              border: '2px dashed #d9d9d9',
              borderRadius: '8px',
              padding: '40px',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: isDragActive ? '#f0f8ff' : '#fafafa',
              marginBottom: '20px'
            }}
          >
            <input {...getInputProps()} />
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <UploadOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
              <div>
                {isDragActive ? (
                  <Text>Suelta la imagen aquí...</Text>
                ) : (
                  <>
                    <Text strong>Arrastra una imagen o haz clic para seleccionar</Text>
                    <br />
                    <Text type="secondary">
                      Formatos soportados: JPG, PNG, GIF (máximo 10MB)
                    </Text>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        ) : (
          /* Vista previa inline */
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            style={{
              border: '2px solid #52c41a',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
              backgroundColor: '#f6ffed'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '16px' }}>
                <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '24px' }} />
                <Text strong style={{ marginLeft: '8px', color: '#52c41a' }}>
                  Imagen cargada: {uploadedFile?.name}
                </Text>
              </div>
              <Image
                src={previewUrl}
                alt="Vista previa"
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '300px',
                  borderRadius: '4px',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                }}
                preview={{
                  mask: (
                    <div style={{ fontSize: '14px' }}>
                      <EyeOutlined /> Ver imagen completa
                    </div>
                  )
                }}
              />
              {detectedFaces.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <Text type="success">
                    <CheckCircleOutlined /> {detectedFaces.length} caras detectadas
                  </Text>
                </div>
              )}
              <div style={{ marginTop: '12px' }}>
                <Button 
                  size="small" 
                  onClick={() => {
                    setPreviewUrl(null);
                    setUploadedFile(null);
                    setDetectedFaces([]);
                  }}
                >
                  Cambiar imagen
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Selector de grupo de clase */}
        <div style={{ marginBottom: '20px' }}>
          <Text>Grupo de clase (opcional):</Text>
          <Select
            placeholder="Selecciona un grupo de clase"
            style={{ width: '100%', marginTop: '8px' }}
            value={selectedClassGroup}
            onChange={setSelectedClassGroup}
            allowClear
          >
            {classGroups.map(group => (
              <Option key={group.id} value={group.id}>
                {group.name} {group.section && `- ${group.section}`}
              </Option>
            ))}
          </Select>
        </div>

        {/* Progreso */}
        {(uploading || processing) && (
          <div style={{ marginBottom: '20px' }}>
            <Progress
              percent={progress}
              status={uploading ? 'active' : 'normal'}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
            <Text type="secondary">
              {processing ? 'Detectando caras...' : 'Subiendo imagen...'}
            </Text>
          </div>
        )}

        {/* Botones de acción */}
        <Space>
          <Button
            type="primary"
            icon={<ScanOutlined />}
            onClick={handleUpload}
            disabled={!uploadedFile || uploading || processing}
            loading={uploading || processing}
          >
            {processing ? 'Procesando...' : 'Subir y Detectar Caras'}
          </Button>
          <Button onClick={handleCancel} disabled={uploading || processing}>
            Cancelar
          </Button>
        </Space>

        {/* Canvas oculto para procesamiento */}
        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />
      </Card>
    </motion.div>
  );
};