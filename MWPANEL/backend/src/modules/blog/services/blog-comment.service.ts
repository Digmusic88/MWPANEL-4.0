import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BlogComment, CommentStatus, BlogPost } from '../entities';
import { CreateBlogCommentDto, UpdateBlogCommentDto } from '../dto';
import { User, UserRole } from '../../users/entities/user.entity';
import { NotificationService } from '../../communications/services/notification.service';
import { EmailPriority } from '../../communications/entities/email-notification.entity';

@Injectable()
export class BlogCommentService {
  constructor(
    @InjectRepository(BlogComment)
    private commentRepository: Repository<BlogComment>,
    @InjectRepository(BlogPost)
    private postRepository: Repository<BlogPost>,
    private notificationService: NotificationService,
  ) {}

  async create(createCommentDto: CreateBlogCommentDto, author: User): Promise<BlogComment> {
    // Instagram-style: Solo familias pueden comentar (los alumnos solo ven)
    if (author.role !== UserRole.FAMILY && author.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Solo las familias pueden comentar en las publicaciones del blog');
    }

    // Verify post exists and comments are enabled
    const post = await this.postRepository.findOne({
      where: { id: createCommentDto.postId },
      relations: ['author']
    });

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    if (!post.commentsEnabled) {
      throw new BadRequestException('Comments are disabled for this post');
    }

    // Verify parent comment exists if provided
    if (createCommentDto.parentId) {
      const parentComment = await this.commentRepository.findOne({
        where: { id: createCommentDto.parentId, postId: createCommentDto.postId }
      });

      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    // Instagram-style: Comentarios se publican directamente (sin moderación previa)
    // Admin y profesor del post pueden eliminar después si es necesario
    const comment = this.commentRepository.create({
      content: createCommentDto.content,
      postId: createCommentDto.postId,
      parentId: createCommentDto.parentId || null,
      authorId: author.id,
      author,
      status: CommentStatus.APPROVED, // Publicación directa estilo Instagram
    });

    const savedComment = await this.commentRepository.save(comment);
    const commentWithDetails = await this.findOne(savedComment.id);

    // Send notification for new blog comment
    try {
      await this.notificationService.processEvent({
        type: 'blog_comment_added',
        triggeredById: author.id,
        recipientIds: [post.author.id], // Notify the post author
        recipientRoles: [UserRole.ADMIN], // And admins
        data: {
          commentId: savedComment.id,
          postId: post.id,
          postTitle: post.title,
          postUrl: `/blog/post/${post.slug || post.id}`,
          commenterName: author.profile?.firstName 
            ? `${author.profile.firstName} ${author.profile.lastName || ''}`.trim()
            : author.email,
          commentContent: savedComment.content.length > 100 
            ? `${savedComment.content.substring(0, 100)}...`
            : savedComment.content,
          commentDate: savedComment.createdAt?.toISOString(),
        },
        priority: EmailPriority.NORMAL,
        immediate: false,
      });
    } catch (error) {
      // Don't fail the comment creation if notification fails
      console.error('Failed to send blog comment notification:', error);
    }

    return commentWithDetails;
  }

  async findByPost(postId: string, includeModerated: boolean = false): Promise<BlogComment[]> {
    const queryBuilder = this.commentRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.author', 'author')
      .leftJoinAndSelect('comment.replies', 'replies')
      .leftJoinAndSelect('replies.author', 'replyAuthor')
      .where('comment.postId = :postId', { postId })
      .andWhere('comment.parentId IS NULL') // Only top-level comments
      .orderBy('comment.createdAt', 'ASC')
      .addOrderBy('replies.createdAt', 'ASC');

    if (!includeModerated) {
      queryBuilder.andWhere('comment.status = :status', { status: CommentStatus.APPROVED });
    }

    return queryBuilder.getMany();
  }

  async findOne(id: string): Promise<BlogComment> {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: ['author', 'post', 'parent', 'replies', 'replies.author']
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return comment;
  }

  async update(id: string, updateCommentDto: UpdateBlogCommentDto, user: User): Promise<BlogComment> {
    const comment = await this.findOne(id);

    // Check permissions - only comment author or admin can edit
    if (comment.authorId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    // Only admins can change status
    if (updateCommentDto.status && user.role !== UserRole.ADMIN) {
      delete updateCommentDto.status;
    }

    await this.commentRepository.update(id, updateCommentDto);
    return this.findOne(id);
  }

  async remove(id: string, user: User): Promise<void> {
    const comment = await this.findOne(id);

    // Permisos de eliminación de comentarios:
    // SOLO pueden eliminar comentarios:
    // 1. El autor del comentario (puede eliminar sus propios comentarios)
    // 2. Administradores (pueden eliminar cualquier comentario)
    const isCommentAuthor = comment.authorId === user.id;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isCommentAuthor && !isAdmin) {
      throw new ForbiddenException('Solo puedes eliminar tus propios comentarios');
    }

    await this.commentRepository.remove(comment);
  }

  async approve(id: string): Promise<BlogComment> {
    const comment = await this.findOne(id);

    if (comment.status === CommentStatus.APPROVED) {
      throw new BadRequestException('Comment is already approved');
    }

    await this.commentRepository.update(id, {
      status: CommentStatus.APPROVED
    });

    return this.findOne(id);
  }

  async reject(id: string): Promise<BlogComment> {
    const comment = await this.findOne(id);

    if (comment.status === CommentStatus.REJECTED) {
      throw new BadRequestException('Comment is already rejected');
    }

    await this.commentRepository.update(id, {
      status: CommentStatus.REJECTED
    });

    return this.findOne(id);
  }

  async findWithFilters(filters: {
    status?: string;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<BlogComment[]> {
    const queryBuilder = this.commentRepository.createQueryBuilder('comment')
      .leftJoinAndSelect('comment.author', 'author')
      .leftJoinAndSelect('comment.post', 'post');

    // Apply status filter
    if (filters.status) {
      queryBuilder.andWhere('comment.status = :status', { status: filters.status.toUpperCase() });
    }

    // Apply sorting
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';
    queryBuilder.orderBy(`comment.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    // Apply limit
    if (filters.limit) {
      queryBuilder.take(filters.limit);
    }

    return queryBuilder.getMany();
  }

  async getPendingComments(): Promise<BlogComment[]> {
    return this.commentRepository.find({
      where: { status: CommentStatus.PENDING },
      relations: ['author', 'post'],
      order: { createdAt: 'ASC' }
    });
  }

  async getCommentStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    const [total, pending, approved, rejected] = await Promise.all([
      this.commentRepository.count(),
      this.commentRepository.count({ where: { status: CommentStatus.PENDING } }),
      this.commentRepository.count({ where: { status: CommentStatus.APPROVED } }),
      this.commentRepository.count({ where: { status: CommentStatus.REJECTED } }),
    ]);

    return { total, pending, approved, rejected };
  }

  async bulkApprove(commentIds: string[]): Promise<void> {
    await this.commentRepository.update(commentIds, {
      status: CommentStatus.APPROVED
    });
  }

  async bulkReject(commentIds: string[]): Promise<void> {
    await this.commentRepository.update(commentIds, {
      status: CommentStatus.REJECTED
    });
  }

  async bulkDelete(commentIds: string[]): Promise<void> {
    const comments = await this.commentRepository.find({
      where: { id: In(commentIds) }
    });

    await this.commentRepository.remove(comments);
  }
}