import React, { useState } from 'react';
import { Upload, Avatar, Button, message, Modal } from 'antd';
import { 
  UploadOutlined, 
  UserOutlined, 
  DeleteOutlined,
  EyeOutlined 
} from '@ant-design/icons';
import { UploadProps } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../services/usersService';

interface ProfilePhotoUploaderProps {
  userId?: string; // If provided, admin mode for uploading to specific user
  currentPhotoUrl?: string;
  size?: number;
  showUploadButton?: boolean;
  showPreviewButton?: boolean;
  showDeleteButton?: boolean;
  onPhotoUpdated?: (newPhotoUrl: string) => void;
}

const ProfilePhotoUploader: React.FC<ProfilePhotoUploaderProps> = ({
  userId,
  currentPhotoUrl,
  size = 120,
  showUploadButton = true,
  showPreviewButton = true,
  showDeleteButton = false,
  onPhotoUpdated,
}) => {
  const [previewVisible, setPreviewVisible] = useState(false);
  const queryClient = useQueryClient();

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);
      
      if (userId) {
        // Admin mode - upload to specific user
        return usersApi.uploadUserPhoto(userId, formData);
      } else {
        // Self mode - upload to current user
        return usersApi.uploadMyPhoto(formData);
      }
    },
    onSuccess: (response) => {
      message.success('Foto de perfil actualizada exitosamente');
      onPhotoUpdated?.(response.avatarUrl);
      // Invalidate user-related queries
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al subir la foto');
    },
  });

  const uploadProps: UploadProps = {
    name: 'photo',
    showUploadList: false,
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('Solo se permiten archivos de imagen (JPG, PNG, GIF)');
        return false;
      }
      
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('La imagen debe ser menor a 5MB');
        return false;
      }

      uploadMutation.mutate(file);
      return false; // Prevent default upload
    },
  };

  const getAvatarSrc = () => {
    if (currentPhotoUrl && currentPhotoUrl.startsWith('/uploads/')) {
      // Local uploaded photo - serve directly from nginx without /api/ prefix
      const baseUrl = process.env.REACT_APP_API_URL || 'https://plataforma.mundoworld.school';
      const cleanBaseUrl = baseUrl.replace('/api', ''); // Remove /api suffix if present
      return `${cleanBaseUrl}${currentPhotoUrl}`;
    }
    return currentPhotoUrl; // External URL
  };

  const handlePreview = () => {
    setPreviewVisible(true);
  };

  const avatarElement = currentPhotoUrl ? (
    <Avatar 
      size={size} 
      src={getAvatarSrc()}
      style={{ cursor: showPreviewButton ? 'pointer' : 'default' }}
      onClick={showPreviewButton ? handlePreview : undefined}
    />
  ) : (
    <Avatar 
      size={size} 
      icon={<UserOutlined />}
      style={{ cursor: showPreviewButton ? 'pointer' : 'default' }}
      onClick={showPreviewButton ? handlePreview : undefined}
    />
  );

  return (
    <div className="profile-photo-uploader">
      <div className="flex flex-col items-center space-y-3">
        {avatarElement}
        
        <div className="flex space-x-2">
          {showUploadButton && (
            <Upload {...uploadProps}>
              <Button 
                icon={<UploadOutlined />} 
                loading={uploadMutation.isPending}
                size="small"
              >
                {currentPhotoUrl ? 'Cambiar Foto' : 'Subir Foto'}
              </Button>
            </Upload>
          )}
          
          {showPreviewButton && currentPhotoUrl && (
            <Button 
              icon={<EyeOutlined />} 
              onClick={handlePreview}
              size="small"
            >
              Ver
            </Button>
          )}
          
          {showDeleteButton && currentPhotoUrl && (
            <Button 
              icon={<DeleteOutlined />} 
              danger
              size="small"
              onClick={() => {
                // TODO: Implement delete functionality
                message.info('Funcionalidad de eliminación en desarrollo');
              }}
            >
              Eliminar
            </Button>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      <Modal
        open={previewVisible}
        title="Foto de Perfil"
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        centered
      >
        <div className="flex justify-center">
          <Avatar 
            size={300} 
            src={currentPhotoUrl ? getAvatarSrc() : undefined}
            icon={!currentPhotoUrl ? <UserOutlined /> : undefined}
          />
        </div>
      </Modal>
    </div>
  );
};

export default ProfilePhotoUploader;