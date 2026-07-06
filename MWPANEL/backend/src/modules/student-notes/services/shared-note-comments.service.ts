import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SharedNoteComment } from '../entities/shared-note-comment.entity';
import { SharedNote } from '../entities/shared-note.entity';
import { User } from '../../users/entities/user.entity';
import { UserProfile } from '../../users/entities/user-profile.entity';

export interface CreateCommentDto {
  content: string;
}

export interface CommentResponseDto {
  id: string;
  content: string;
  authorName: string;
  authorId: string;
  createdAt: string;
}

@Injectable()
export class SharedNoteCommentsService {
  constructor(
    @InjectRepository(SharedNoteComment)
    private readonly commentsRepository: Repository<SharedNoteComment>,
    
    @InjectRepository(SharedNote)
    private readonly sharedNotesRepository: Repository<SharedNote>,
    
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /**
   * Agregar comentario a una nota compartida
   */
  async addComment(
    sharedNoteId: string, 
    userId: string, 
    createCommentDto: CreateCommentDto
  ): Promise<CommentResponseDto> {
    // Validar que el contenido no esté vacío
    if (!createCommentDto.content || createCommentDto.content.trim().length === 0) {
      throw new BadRequestException('El contenido del comentario no puede estar vacío');
    }

    if (createCommentDto.content.length > 1000) {
      throw new BadRequestException('El comentario no puede exceder 1000 caracteres');
    }

    // Verificar que la nota compartida existe y está activa
    const sharedNote = await this.sharedNotesRepository.findOne({
      where: { id: sharedNoteId, isActive: true },
      relations: ['sharedBy', 'sharedWith']
    });

    if (!sharedNote) {
      throw new NotFoundException('Nota compartida no encontrada');
    }

    // Verificar que el usuario tiene permisos para comentar
    const canComment = this.canUserComment(sharedNote, userId);
    if (!canComment.allowed) {
      throw new ForbiddenException(canComment.reason);
    }

    // Obtener información del usuario
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['profile']
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Crear el comentario
    const comment = this.commentsRepository.create({
      sharedNoteId,
      userId,
      content: createCommentDto.content.trim(),
      isActive: true
    });

    const savedComment = await this.commentsRepository.save(comment);

    // Retornar el comentario formateado
    return {
      id: savedComment.id,
      content: savedComment.content,
      authorName: this.formatUserName(user),
      authorId: user.id,
      createdAt: savedComment.createdAt.toISOString()
    };
  }

  /**
   * Obtener comentarios de una nota compartida
   */
  async getComments(sharedNoteId: string, userId: string): Promise<CommentResponseDto[]> {
    // Verificar que la nota compartida existe y que el usuario tiene acceso
    const sharedNote = await this.sharedNotesRepository.findOne({
      where: { id: sharedNoteId, isActive: true },
      relations: ['sharedBy', 'sharedWith']
    });

    if (!sharedNote) {
      throw new NotFoundException('Nota compartida no encontrada');
    }

    // Verificar que el usuario puede ver la nota
    const canView = this.canUserView(sharedNote, userId);
    if (!canView.allowed) {
      throw new ForbiddenException(canView.reason);
    }

    // Obtener comentarios activos
    const comments = await this.commentsRepository.find({
      where: { 
        sharedNoteId, 
        isActive: true 
      },
      relations: ['user', 'user.profile'],
      order: { createdAt: 'ASC' }
    });

    // Formatear respuesta
    return comments.map(comment => ({
      id: comment.id,
      content: comment.content,
      authorName: this.formatUserName(comment.user),
      authorId: comment.user.id,
      createdAt: comment.createdAt.toISOString()
    }));
  }

  /**
   * Eliminar comentario (solo el autor puede eliminar)
   */
  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.commentsRepository.findOne({
      where: { id: commentId, isActive: true },
      relations: ['user', 'user.profile']
    });

    if (!comment) {
      throw new NotFoundException('Comentario no encontrado');
    }

    // Solo el autor puede eliminar su comentario
    if (comment.userId !== userId) {
      throw new ForbiddenException('Solo puedes eliminar tus propios comentarios');
    }

    // Soft delete
    comment.isActive = false;
    await this.commentsRepository.save(comment);
  }

  /**
   * Verificar si un usuario puede comentar en una nota compartida
   */
  private canUserComment(sharedNote: SharedNote, userId: string): { allowed: boolean; reason?: string } {
    // El usuario debe ser el destinatario de la nota para comentar
    if (sharedNote.sharedWithId !== userId) {
      return { 
        allowed: false, 
        reason: 'Solo el destinatario puede comentar en esta nota' 
      };
    }

    // Verificar permisos de comentarios
    const permissions = sharedNote.permissionsObject;
    if (!permissions.comment) {
      return { 
        allowed: false, 
        reason: 'No tienes permisos para comentar en esta nota' 
      };
    }

    // Verificar que la nota no esté expirada
    if (sharedNote.isExpired) {
      return { 
        allowed: false, 
        reason: 'Esta nota ha expirado y ya no se pueden agregar comentarios' 
      };
    }

    return { allowed: true };
  }

  /**
   * Verificar si un usuario puede ver una nota compartida
   */
  private canUserView(sharedNote: SharedNote, userId: string): { allowed: boolean; reason?: string } {
    // El usuario debe ser el destinatario o el remitente
    if (sharedNote.sharedWithId !== userId && sharedNote.sharedById !== userId) {
      return { 
        allowed: false, 
        reason: 'No tienes acceso a esta nota' 
      };
    }

    return { allowed: true };
  }

  /**
   * Formatear nombre de usuario
   */
  private formatUserName(user: User): string {
    if (!user) return 'Usuario desconocido';
    
    if (user.profile && user.profile.firstName && user.profile.lastName) {
      return `${user.profile.firstName} ${user.profile.lastName}`.trim();
    }
    
    return user.email || 'Usuario desconocido';
  }
}