import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { 
  AttachmentItem, 
  FolderItem, 
  CreateAttachmentRequest, 
  AttachmentResponse,
  AttachmentFilters,
  PaginationParams 
} from './types';
import AttachmentsApiService from '../../../services/attachmentsApiService';

export const useAttachments = (taskId: string) => {
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load attachments
  const loadAttachments = useCallback(async (filters?: AttachmentFilters, pagination?: PaginationParams) => {
    if (!taskId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await AttachmentsApiService.getAttachments(taskId, filters, pagination);
      setAttachments(response.attachments);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error loading attachments';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  // Load folders
  const loadFolders = useCallback(async () => {
    if (!taskId) return;

    try {
      const { folders: folderList } = await AttachmentsApiService.getFolderStructure(taskId);
      setFolders(folderList);
    } catch (err) {
      console.error('Error loading folders:', err);
    }
  }, [taskId]);

  // Upload file
  const uploadFile = useCallback(async (file: File, request: CreateAttachmentRequest) => {
    // Validate file before upload
    const validation = AttachmentsApiService.validateFile(file);
    if (!validation.valid) {
      message.error(validation.error);
      throw new Error(validation.error);
    }

    try {
      const attachment = await AttachmentsApiService.uploadFile(file, request);
      setAttachments(prev => [attachment, ...prev]);
      message.success(`Archivo "${file.name}" subido exitosamente`);
      return attachment;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error uploading file';
      message.error(errorMessage);
      throw err;
    }
  }, []);

  // Delete files
  const deleteFiles = useCallback(async (fileIds: string[]) => {
    try {
      await AttachmentsApiService.deleteAttachments(fileIds);
      setAttachments(prev => prev.filter(att => !fileIds.includes(att.id)));
      message.success(`${fileIds.length} archivo(s) eliminado(s)`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error deleting files';
      message.error(errorMessage);
      throw err;
    }
  }, []);

  // Download file
  const downloadFile = useCallback(async (attachment: AttachmentItem) => {
    try {
      const blob = await AttachmentsApiService.downloadAttachment(attachment.id);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.originalFileName;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      message.success(`Descargando "${attachment.originalFileName}"`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error downloading file';
      message.error(errorMessage);
      throw err;
    }
  }, []);

  // Refresh attachments
  const refreshAttachments = useCallback(() => {
    loadAttachments();
  }, [loadAttachments]);

  // Initial load
  useEffect(() => {
    if (taskId) {
      loadAttachments();
      loadFolders();
    }
  }, [taskId, loadAttachments, loadFolders]);

  return {
    attachments,
    folders,
    loading,
    error,
    uploadFile,
    deleteFiles,
    downloadFile,
    refreshAttachments,
    loadAttachments,
  };
};