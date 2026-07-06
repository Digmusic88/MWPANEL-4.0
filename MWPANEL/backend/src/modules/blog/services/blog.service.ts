import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, In } from 'typeorm';
import { BlogPost, BlogPostStatus, BlogPostVisibility, BlogCategory, BlogComment, BlogMedia, CommentStatus, BlogPostView } from '../entities';
import { CreateBlogPostDto, UpdateBlogPostDto, BlogQueryDto } from '../dto';
import { User, UserRole } from '../../users/entities/user.entity';
import { NotificationService } from '../../communications/services/notification.service';
import { EmailPriority } from '../../communications/entities/email-notification.entity';
import { BlogPermissionsService } from './blog-permissions.service';

@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(BlogPost)
    private blogPostRepository: Repository<BlogPost>,
    @InjectRepository(BlogCategory)
    private categoryRepository: Repository<BlogCategory>,
    @InjectRepository(BlogComment)
    private commentRepository: Repository<BlogComment>,
    @InjectRepository(BlogMedia)
    private mediaRepository: Repository<BlogMedia>,
    @InjectRepository(BlogPostView)
    private blogPostViewRepository: Repository<BlogPostView>,
    private notificationService: NotificationService,
    @Inject(forwardRef(() => BlogPermissionsService))
    private blogPermissionsService: BlogPermissionsService,
  ) {}

  async create(createBlogPostDto: CreateBlogPostDto, author: User): Promise<BlogPost> {
    // Instagram-style: Verificar permisos de publicación para profesores
    // Admin puede publicar en cualquier grupo, profesores solo en grupos permitidos
    if (author.role === UserRole.TEACHER && createBlogPostDto.classGroupIds && createBlogPostDto.classGroupIds.length > 0) {
      const canPublish = await this.blogPermissionsService.canTeacherPublishToGroups(
        author.id,
        createBlogPostDto.classGroupIds
      );

      if (!canPublish) {
        throw new ForbiddenException(
          'No tienes permiso para publicar en uno o más de los grupos seleccionados. Contacta con el administrador.'
        );
      }
    }

    // Generate slug if not provided
    if (!createBlogPostDto.slug) {
      createBlogPostDto.slug = this.generateSlug(createBlogPostDto.title);
    }

    // Ensure slug uniqueness by adding incremental number if needed
    createBlogPostDto.slug = await this.ensureUniqueSlug(createBlogPostDto.slug);

    // Validate category if provided
    if (createBlogPostDto.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: createBlogPostDto.categoryId }
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    // Prepare visibility settings
    const visibilitySettings = createBlogPostDto.visibilitySettings || {};
    if (createBlogPostDto.classGroupIds && createBlogPostDto.classGroupIds.length > 0) {
      visibilitySettings.classGroups = createBlogPostDto.classGroupIds;
    }

    // Exclude fields that need special handling or don't exist on entity
    const { categoryId, mediaIds, classGroupIds, ...createData } = createBlogPostDto;

    // Use the provided publishDate or current date
    const postDate = createBlogPostDto.publishDate ? new Date(createBlogPostDto.publishDate) : new Date();

    const blogPost = this.blogPostRepository.create({
      ...createData,
      author,
      publishDate: postDate,
      createdAt: postDate, // Allow setting createdAt to the selected publish date
      status: createBlogPostDto.status || BlogPostStatus.DRAFT,
      visibility: createBlogPostDto.visibility || BlogPostVisibility.PUBLIC,
      featured: createBlogPostDto.featured || false,
      commentsEnabled: createBlogPostDto.commentsEnabled !== undefined ? createBlogPostDto.commentsEnabled : true,
      visibilitySettings: Object.keys(visibilitySettings).length > 0 ? visibilitySettings : null,
    });

    const savedPost = await this.blogPostRepository.save(blogPost);

    // Handle category relationship if provided
    if (categoryId) {
      const queryRunner = this.blogPostRepository.manager.connection.createQueryRunner();
      await queryRunner.query(
        'UPDATE blog_posts SET category_id = $1 WHERE id = $2',
        [categoryId, savedPost.id]
      );
    }

    // Handle media attachments
    if (createBlogPostDto.mediaIds && createBlogPostDto.mediaIds.length > 0) {
      await this.attachMediaToPosts(createBlogPostDto.mediaIds, savedPost.id);
    }

    // Send notification for new blog post creation
    try {
      await this.notificationService.processEvent({
        type: 'blog_post_created',
        triggeredById: author.id,
        recipientRoles: [UserRole.ADMIN, UserRole.TEACHER],
        data: {
          postId: savedPost.id,
          postTitle: savedPost.title,
          authorName: author.profile?.firstName 
            ? `${author.profile.firstName} ${author.profile.lastName || ''}`.trim()
            : author.email,
          postUrl: `/blog/post/${savedPost.slug || savedPost.id}`,
          excerpt: savedPost.excerpt,
          categoryName: savedPost.category?.name,
        },
        priority: EmailPriority.NORMAL,
        immediate: false,
      });
    } catch (error) {
      // Don't fail the post creation if notification fails
      console.error('Failed to send blog post creation notification:', error);
    }

    return this.findOne(savedPost.id, author);
  }

  async findAll(query: BlogQueryDto, user?: User): Promise<{ data: BlogPost[], total: number, page: number, limit: number }> {
    const queryBuilder = this.createBaseQuery(false, query.includeAuthor); // Don't use problematic media join

    // Apply visibility filters based on user role
    await this.applyVisibilityFilters(queryBuilder, user);

    // Apply search filters
    if (query.search) {
      queryBuilder.andWhere('(post.title ILIKE :search OR post.content ILIKE :search OR post.excerpt ILIKE :search)', {
        search: `%${query.search}%`
      });
    }

    if (query.status) {
      queryBuilder.andWhere('post.status = :status', { status: query.status });
    }

    if (query.visibility && query.visibility.length > 0) {
      queryBuilder.andWhere('post.visibility IN (:...visibilities)', { visibilities: query.visibility });
    }

    if (query.categoryId) {
      queryBuilder.andWhere('category.id = :categoryId', { categoryId: query.categoryId });
    }

    if (query.authorId) {
      queryBuilder.andWhere('author.id = :authorId', { authorId: query.authorId });
    }

    if (query.tag) {
      queryBuilder.andWhere(':tag = ANY(post.tags)', { tag: query.tag });
    }

    if (query.featured !== undefined) {
      queryBuilder.andWhere('post.featured = :featured', { featured: query.featured });
    }

    // Date range filters
    if (query.dateFrom) {
      queryBuilder.andWhere('post.createdAt >= :dateFrom', { dateFrom: new Date(query.dateFrom) });
    }

    if (query.dateTo) {
      queryBuilder.andWhere('post.createdAt <= :dateTo', { dateTo: new Date(query.dateTo) });
    }

    // Class groups and educational levels filters
    if (query.classGroups && query.classGroups.length > 0) {
      queryBuilder.andWhere('post.visibilitySettings->>\'classGroups\' ?| array[:classGroups]', {
        classGroups: query.classGroups
      });
    }

    if (query.educationalLevels && query.educationalLevels.length > 0) {
      queryBuilder.andWhere('post.visibilitySettings->>\'educationalLevels\' ?| array[:educationalLevels]', {
        educationalLevels: query.educationalLevels
      });
    }

    // Sorting
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'DESC';
    queryBuilder.orderBy(`post.${sortBy}`, sortOrder as 'ASC' | 'DESC');

    // Pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    // If media is requested, load it separately for each post
    if (query.includeMedia && data.length > 0) {
      const postIds = data.map(post => post.id);
      const media = await this.mediaRepository.find({
        where: { postId: In(postIds), isActive: true },
        relations: ['uploadedBy'],
        order: { sortOrder: 'ASC', createdAt: 'ASC' }
      });

      // Group media by postId
      const mediaByPost = media.reduce((acc, mediaItem) => {
        if (!acc[mediaItem.postId]) {
          acc[mediaItem.postId] = [];
        }
        acc[mediaItem.postId].push(mediaItem);
        return acc;
      }, {} as Record<string, typeof media>);

      // Attach media to each post
      data.forEach(post => {
        post.media = mediaByPost[post.id] || [];
      });
    }

    // Always load comments for posts (needed for Instagram-style feed)
    if (data.length > 0) {
      const postIds = data.map(post => post.id);
      const comments = await this.commentRepository.find({
        where: {
          postId: In(postIds),
          status: CommentStatus.APPROVED
        },
        relations: ['author', 'author.profile'],
        order: { createdAt: 'ASC' }
      });

      // Group comments by postId
      const commentsByPost = comments.reduce((acc, comment) => {
        if (!acc[comment.postId]) {
          acc[comment.postId] = [];
        }
        acc[comment.postId].push(comment);
        return acc;
      }, {} as Record<string, typeof comments>);

      // Attach comments to each post
      data.forEach(post => {
        post.comments = commentsByPost[post.id] || [];
      });
    }

    return {
      data,
      total,
      page,
      limit
    };
  }

  async findOne(id: string, user?: User): Promise<BlogPost> {
    const queryBuilder = this.createBaseQuery(false, true) // Don't use problematic media join
      .where('post.id = :id', { id });

    // Apply visibility filters
    await this.applyVisibilityFilters(queryBuilder, user);

    const post = await queryBuilder.getOne();

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    // Load media separately using direct repository query
    const media = await this.mediaRepository.find({
      where: { postId: post.id, isActive: true },
      relations: ['uploadedBy'],
      order: { sortOrder: 'ASC', createdAt: 'ASC' }
    });

    // Manually attach media to post
    post.media = media;

    // Increment view count
    await this.blogPostRepository.increment({ id }, 'views', 1);

    return post;
  }

  async findBySlug(slug: string, user?: User): Promise<BlogPost> {
    const queryBuilder = this.createBaseQuery(false, true) // Don't use query builder for media, load separately
      .where('post.slug = :slug', { slug });

    // Apply visibility filters
    await this.applyVisibilityFilters(queryBuilder, user);

    const post = await queryBuilder.getOne();

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    // Load media separately using direct repository query
    console.log(`🔍 DEBUG: Loading media for post ${post.id}`);
    const media = await this.mediaRepository.find({
      where: { postId: post.id, isActive: true },
      relations: ['uploadedBy'],
      order: { sortOrder: 'ASC', createdAt: 'ASC' }
    });
    console.log(`🔍 DEBUG: Found ${media.length} media items:`, media.map(m => ({ id: m.id, filename: m.filename, postId: m.postId, isActive: m.isActive })));

    // Manually attach media to post
    post.media = media;
    console.log(`🔍 DEBUG: Post media after attach:`, post.media.length);

    // Increment view count
    await this.blogPostRepository.increment({ id: post.id }, 'views', 1);

    return post;
  }

  async update(id: string, updateBlogPostDto: UpdateBlogPostDto, user: User): Promise<BlogPost> {
    const post = await this.findOne(id, user);

    // Check permissions
    if (post.author?.id !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only edit your own posts');
    }

    // Validate slug uniqueness if being updated
    if (updateBlogPostDto.slug && updateBlogPostDto.slug !== post.slug) {
      const existingPost = await this.blogPostRepository.findOne({
        where: { slug: updateBlogPostDto.slug }
      });
      if (existingPost) {
        throw new BadRequestException(`Slug '${updateBlogPostDto.slug}' already exists`);
      }
    }

    // Validate category if provided
    if (updateBlogPostDto.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: updateBlogPostDto.categoryId }
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    // Update media attachments if provided
    if (updateBlogPostDto.mediaIds) {
      // Remove existing media attachments
      await this.mediaRepository.update(
        { postId: id },
        { postId: null }
      );
      
      // Add new media attachments
      if (updateBlogPostDto.mediaIds.length > 0) {
        await this.attachMediaToPosts(updateBlogPostDto.mediaIds, id);
      }
    }

    // Prepare visibility settings for update
    const visibilitySettings = updateBlogPostDto.visibilitySettings || post.visibilitySettings || {};
    if (updateBlogPostDto.classGroupIds !== undefined) {
      if (updateBlogPostDto.classGroupIds && updateBlogPostDto.classGroupIds.length > 0) {
        visibilitySettings.classGroups = updateBlogPostDto.classGroupIds;
      } else {
        // Remove classGroups if empty array or null is provided
        delete visibilitySettings.classGroups;
      }
    }

    // Prepare update data, excluding fields that need special handling
    const { categoryId, mediaIds, classGroupIds, ...updateData } = updateBlogPostDto;
    
    // Update the post
    await this.blogPostRepository.update(id, {
      ...updateData,
      publishDate: updateBlogPostDto.publishDate ? new Date(updateBlogPostDto.publishDate) : post.publishDate,
      visibilitySettings: Object.keys(visibilitySettings).length > 0 ? visibilitySettings : null,
    });

    // Handle category relationship separately if provided
    if (categoryId !== undefined) {
      const queryRunner = this.blogPostRepository.manager.connection.createQueryRunner();
      
      if (categoryId === null || categoryId === '') {
        // Remove category association
        await queryRunner.query(
          'UPDATE blog_posts SET category_id = NULL WHERE id = $1',
          [id]
        );
      } else {
        // Set category association
        await queryRunner.query(
          'UPDATE blog_posts SET category_id = $1 WHERE id = $2',
          [categoryId, id]
        );
      }
    }

    return this.findOne(id, user);
  }

  async remove(id: string, user: User): Promise<void> {
    const post = await this.findOne(id, user);

    // Check permissions
    if (post.author?.id !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.blogPostRepository.remove(post);
  }

  async publish(id: string, user: User): Promise<BlogPost> {
    const post = await this.findOne(id, user);

    // Check permissions
    if (post.author?.id !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only publish your own posts');
    }

    if (post.status === BlogPostStatus.PUBLISHED) {
      throw new BadRequestException('Post is already published');
    }

    await this.blogPostRepository.update(id, {
      status: BlogPostStatus.PUBLISHED,
      publishDate: new Date(),
    });

    const publishedPost = await this.findOne(id, user);

    // Send notification for blog post publication
    try {
      await this.notificationService.processEvent({
        type: 'blog_post_published',
        triggeredById: user.id,
        recipientRoles: [UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY],
        data: {
          postId: publishedPost.id,
          postTitle: publishedPost.title,
          authorName: publishedPost.author?.profile?.firstName 
            ? `${publishedPost.author.profile.firstName} ${publishedPost.author.profile.lastName || ''}`.trim()
            : publishedPost.author?.email,
          postUrl: `/blog/post/${publishedPost.slug || publishedPost.id}`,
          excerpt: publishedPost.excerpt,
          categoryName: publishedPost.category?.name,
          publishedAt: publishedPost.publishDate?.toISOString(),
        },
        priority: EmailPriority.HIGH,
        immediate: true,
      });
    } catch (error) {
      // Don't fail the publication if notification fails
      console.error('Failed to send blog post publication notification:', error);
    }

    return publishedPost;
  }

  async unpublish(id: string, user: User): Promise<BlogPost> {
    const post = await this.findOne(id, user);

    // Check permissions
    if (post.author?.id !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only unpublish your own posts');
    }

    if (post.status !== BlogPostStatus.PUBLISHED) {
      throw new BadRequestException('Post is not published');
    }

    await this.blogPostRepository.update(id, {
      status: BlogPostStatus.DRAFT,
    });

    return this.findOne(id, user);
  }

  /**
   * Schedule a post for future publication
   */
  async schedule(id: string, publishDate: Date, user: User): Promise<BlogPost> {
    const post = await this.findOne(id, user);

    // Check permissions
    if (post.author?.id !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only schedule your own posts');
    }

    if (publishDate <= new Date()) {
      throw new BadRequestException('Scheduled date must be in the future');
    }

    await this.blogPostRepository.update(id, {
      status: BlogPostStatus.SCHEDULED,
      publishDate: publishDate,
    });

    return this.findOne(id, user);
  }

  /**
   * Get drafts for a specific user
   */
  async getUserDrafts(user: User): Promise<BlogPost[]> {
    const queryBuilder = this.createBaseQuery(false, true)
      .where('author.id = :authorId', { authorId: user.id })
      .andWhere('post.status IN (:...statuses)', {
        statuses: [BlogPostStatus.DRAFT, BlogPostStatus.SCHEDULED]
      })
      .orderBy('post.updatedAt', 'DESC');

    const posts = await queryBuilder.getMany();

    // Load media for each post
    if (posts.length > 0) {
      const postIds = posts.map(post => post.id);
      const media = await this.mediaRepository.find({
        where: { postId: In(postIds), isActive: true },
        order: { sortOrder: 'ASC', createdAt: 'ASC' }
      });

      const mediaByPost = media.reduce((acc, mediaItem) => {
        if (!acc[mediaItem.postId]) {
          acc[mediaItem.postId] = [];
        }
        acc[mediaItem.postId].push(mediaItem);
        return acc;
      }, {} as Record<string, typeof media>);

      posts.forEach(post => {
        post.media = mediaByPost[post.id] || [];
      });
    }

    return posts;
  }

  /**
   * Get all scheduled posts (for cron job)
   */
  async getScheduledPostsToPublish(): Promise<BlogPost[]> {
    const now = new Date();

    return this.blogPostRepository.find({
      where: {
        status: BlogPostStatus.SCHEDULED,
      },
      relations: ['author', 'category'],
    }).then(posts => posts.filter(post => post.publishDate && post.publishDate <= now));
  }

  /**
   * Publish scheduled posts that are due (called by cron)
   */
  async publishScheduledPosts(): Promise<{ published: number; posts: string[] }> {
    const postsToPublish = await this.getScheduledPostsToPublish();
    const publishedPosts: string[] = [];

    for (const post of postsToPublish) {
      try {
        await this.blogPostRepository.update(post.id, {
          status: BlogPostStatus.PUBLISHED,
        });
        publishedPosts.push(post.title);
        console.log(`📰 Published scheduled post: ${post.title}`);

        // Send notification
        try {
          await this.notificationService.processEvent({
            type: 'blog_post_published',
            triggeredById: post.author?.id,
            recipientRoles: [UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY],
            data: {
              postId: post.id,
              postTitle: post.title,
              authorName: post.author?.profile?.firstName
                ? `${post.author.profile.firstName} ${post.author.profile.lastName || ''}`.trim()
                : post.author?.email,
              postUrl: `/blog/post/${post.slug || post.id}`,
              excerpt: post.excerpt,
              categoryName: post.category?.name,
              publishedAt: new Date().toISOString(),
            },
            priority: EmailPriority.HIGH,
            immediate: true,
          });
        } catch (notifError) {
          console.error('Failed to send scheduled post notification:', notifError);
        }
      } catch (error) {
        console.error(`Failed to publish scheduled post ${post.id}:`, error);
      }
    }

    return {
      published: publishedPosts.length,
      posts: publishedPosts,
    };
  }

  async getFeatured(limit: number = 5, user?: User): Promise<BlogPost[]> {
    const queryBuilder = this.createBaseQuery(true, true) // Include media and author for featured posts
      .where('post.featured = :featured', { featured: true })
      .andWhere('post.status = :status', { status: BlogPostStatus.PUBLISHED });

    await this.applyVisibilityFilters(queryBuilder, user);

    return queryBuilder
      .orderBy('post.publishDate', 'DESC')
      .limit(limit)
      .getMany();
  }

  async getByCategory(categoryId: string, query: BlogQueryDto, user?: User): Promise<{ data: BlogPost[], total: number }> {
    const category = await this.categoryRepository.findOne({ where: { id: categoryId } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const queryBuilder = this.createBaseQuery(false) // Don't include media for list views
      .where('category.id = :categoryId', { categoryId });

    await this.applyVisibilityFilters(queryBuilder, user);

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await queryBuilder
      .orderBy('post.publishDate', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async getByTag(tag: string, query: BlogQueryDto, user?: User): Promise<{ data: BlogPost[], total: number }> {
    const queryBuilder = this.createBaseQuery(false) // Don't include media for list views  
      .where(':tag = ANY(post.tags)', { tag });

    await this.applyVisibilityFilters(queryBuilder, user);

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await queryBuilder
      .orderBy('post.publishDate', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  // Private helper methods

  private createBaseQuery(includeMedia?: boolean, includeAuthor?: boolean): SelectQueryBuilder<BlogPost> {
    let queryBuilder = this.blogPostRepository
      .createQueryBuilder('post')
      .leftJoin('post.author', 'author')
      .leftJoin('post.category', 'category')
      .addSelect(['author.id', 'author.email', 'author.role'])
      .addSelect(['category.id', 'category.name']);

    if (includeAuthor) {
      queryBuilder = queryBuilder
        .leftJoinAndSelect('author.profile', 'authorProfile');
    }

    if (includeMedia) {
      queryBuilder = queryBuilder
        .leftJoinAndSelect('post.media', 'media')
        .leftJoinAndSelect('media.uploadedBy', 'mediaUploader');
    }

    return queryBuilder;
  }

  private async applyVisibilityFilters(queryBuilder: SelectQueryBuilder<BlogPost>, user?: User): Promise<void> {
    console.log(`🔍 DEBUG: applyVisibilityFilters called for user:`, user?.id, user?.role);
    
    if (!user) {
      // Public users can only see public posts
      console.log(`🔍 DEBUG: No user - applying public only filter`);
      queryBuilder.andWhere('post.visibility = :visibility', { visibility: BlogPostVisibility.PUBLIC });
    } else if (user.role === UserRole.FAMILY) {
      // Families can see public, family-only, and class-specific posts for their children's classes
      console.log(`🔍 DEBUG: Family user - getting class groups`);
      const userClassGroups = await this.getUserClassGroups(user.id, user.role);
      
      if (userClassGroups.length > 0) {
        console.log(`🔍 DEBUG: Applying family visibility filter with classes:`, userClassGroups);
        queryBuilder.andWhere(
          `(
            post.visibility = :publicVisibility OR
            post.visibility = :familyVisibility OR
            (post.visibility = :classVisibility AND (
              post."visibilitySettings" IS NULL OR
              post."visibilitySettings"->>'classGroups' IS NULL OR
              post."visibilitySettings"->'classGroups' ?| ARRAY[:...classGroups]
            ))
          )`,
          {
            publicVisibility: BlogPostVisibility.PUBLIC,
            familyVisibility: BlogPostVisibility.FAMILIES_ONLY,
            classVisibility: BlogPostVisibility.CLASS_SPECIFIC,
            classGroups: userClassGroups
          }
        );
      } else {
        // Family with no children or children not in classes - only public and family posts
        queryBuilder.andWhere('post.visibility IN (:...visibilities)', {
          visibilities: [BlogPostVisibility.PUBLIC, BlogPostVisibility.FAMILIES_ONLY]
        });
      }
    } else if (user.role === UserRole.STUDENT) {
      // Students can see public, student-only, and class-specific posts for their classes
      const userClassGroups = await this.getUserClassGroups(user.id, user.role);
      
      if (userClassGroups.length > 0) {
        console.log(`🔍 DEBUG: Applying student visibility filter with classes:`, userClassGroups);
        queryBuilder.andWhere(
          `(
            post.visibility = :publicVisibility OR
            post.visibility = :studentVisibility OR
            (post.visibility = :classVisibility AND (
              post."visibilitySettings" IS NULL OR
              post."visibilitySettings"->>'classGroups' IS NULL OR
              post."visibilitySettings"->'classGroups' ?| ARRAY[:...classGroups]
            ))
          )`,
          {
            publicVisibility: BlogPostVisibility.PUBLIC,
            studentVisibility: BlogPostVisibility.STUDENTS_ONLY,
            classVisibility: BlogPostVisibility.CLASS_SPECIFIC,
            classGroups: userClassGroups
          }
        );
      } else {
        // Student not in any classes - only public and student posts
        queryBuilder.andWhere('post.visibility IN (:...visibilities)', {
          visibilities: [BlogPostVisibility.PUBLIC, BlogPostVisibility.STUDENTS_ONLY]
        });
      }
    } else if (user.role === UserRole.TEACHER) {
      // Teachers can see public, staff, student, and all class-specific posts
      queryBuilder.andWhere('post.visibility IN (:...visibilities)', {
        visibilities: [
          BlogPostVisibility.PUBLIC,
          BlogPostVisibility.STAFF_ONLY,
          BlogPostVisibility.STUDENTS_ONLY,
          BlogPostVisibility.CLASS_SPECIFIC
        ]
      });
    }
    // Admins can see all posts (no additional filter needed)

    // Only show published posts for non-authors/admins
    if (!user) {
      queryBuilder.andWhere('post.status = :status', {
        status: BlogPostStatus.PUBLISHED
      });
    } else if (user.role !== UserRole.ADMIN) {
      queryBuilder.andWhere('(post.status = :status OR author.id = :userId)', {
        status: BlogPostStatus.PUBLISHED,
        userId: user.id
      });
    }
    // Admins can see all posts including drafts (no status filter needed)
  }

  /**
   * Get class groups for a user based on their role
   * - For students: Get their direct class assignments
   * - For families: Get class groups from all their children
   */
  private async getUserClassGroups(userId: string, role: UserRole): Promise<string[]> {
    const queryRunner = this.blogPostRepository.manager.connection.createQueryRunner();
    
    console.log(`🔍 DEBUG: Getting class groups for user ${userId} with role ${role}`);
    
    try {
      if (role === UserRole.STUDENT) {
        // Get class groups for student directly
        const result = await queryRunner.query(`
          SELECT DISTINCT cg.id
          FROM class_groups cg
          INNER JOIN class_students cs ON cs."classId" = cg.id
          INNER JOIN students s ON s.id = cs."studentId"
          WHERE s."userId" = $1
        `, [userId]);
        
        console.log(`🔍 DEBUG: Student class groups result:`, result);
        return result.map((row: any) => row.id);
      } else if (role === UserRole.FAMILY) {
        // Get class groups from all children of this family user
        const result = await queryRunner.query(`
          SELECT DISTINCT cg.id
          FROM class_groups cg
          INNER JOIN class_students cs ON cs."classId" = cg.id
          INNER JOIN students s ON s.id = cs."studentId"
          INNER JOIN family_students fs ON fs."studentId" = s.id
          INNER JOIN families f ON f.id = fs."familyId"
          WHERE f."primaryContactId" = $1 OR f."secondaryContactId" = $1
        `, [userId]);
        
        console.log(`🔍 DEBUG: Family class groups result:`, result);
        const classGroups = result.map((row: any) => row.id);
        console.log(`🔍 DEBUG: Family class groups mapped:`, classGroups);
        return classGroups;
      }
      
      return [];
    } catch (error) {
      console.error('Error getting user class groups:', error);
      return [];
    } finally {
      await queryRunner.release();
    }
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9 ]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Remove multiple hyphens
      .replace(/(^-|-$)/g, ''); // Remove leading/trailing hyphens
  }

  private async ensureUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existingPost = await this.blogPostRepository.findOne({
        where: { slug }
      });

      if (!existingPost) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  private async attachMediaToPosts(mediaIds: string[], postId: string): Promise<void> {
    await this.mediaRepository.update(
      { id: In(mediaIds) },
      { postId }
    );
  }

  async getBlogStats(): Promise<{
    totalPosts: number;
    publishedPosts: number;
    draftPosts: number;
    totalComments: number;
    pendingComments: number;
    monthlyViews: number;
    postsThisMonth: number;
    engagementRate: number;
  }> {
    // Get current month start and end dates
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Parallel queries for better performance
    const [
      totalPosts,
      publishedPosts,
      draftPosts,
      totalComments,
      pendingComments,
      postsThisMonth,
      monthlyViewsResult
    ] = await Promise.all([
      this.blogPostRepository.count(),
      this.blogPostRepository.count({ where: { status: BlogPostStatus.PUBLISHED } }),
      this.blogPostRepository.count({ where: { status: BlogPostStatus.DRAFT } }),
      this.commentRepository.count(),
      this.commentRepository.count({ where: { status: CommentStatus.PENDING } }),
      this.blogPostRepository
        .createQueryBuilder('post')
        .where('post.createdAt >= :monthStart', { monthStart })
        .andWhere('post.createdAt <= :monthEnd', { monthEnd })
        .getCount(),
      this.blogPostRepository
        .createQueryBuilder('post')
        .select('SUM(post.views)', 'totalViews')
        .where('post.createdAt >= :monthStart', { monthStart })
        .andWhere('post.createdAt <= :monthEnd', { monthEnd })
        .getRawOne()
    ]);

    const monthlyViews = parseInt(monthlyViewsResult?.totalViews) || 0;
    
    // Calculate engagement rate (comments per post ratio)
    const engagementRate = totalPosts > 0 
      ? (totalComments / totalPosts) * 100 
      : 0;

    return {
      totalPosts,
      publishedPosts,
      draftPosts,
      totalComments,
      pendingComments,
      monthlyViews,
      postsThisMonth,
      engagementRate: Math.round(engagementRate * 100) / 100, // Round to 2 decimals
    };
  }

  async incrementViewCount(id: string): Promise<{ views: number }> {
    // Find the post
    const post = await this.blogPostRepository.findOne({
      where: { id },
      select: ['id', 'views']
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Increment view count
    const newViewCount = (post.views || 0) + 1;
    
    await this.blogPostRepository.update(id, {
      views: newViewCount
    });

    return { views: newViewCount };
  }

  async debugMediaDirectly(): Promise<any> {
    const postId = 'adbdafe6-85a2-4fb4-bfaa-724cb9a27fbe';
    
    try {
      // Direct raw query to see what's in the database
      const rawMedia = await this.mediaRepository.query(
        'SELECT id, filename, "postId", "isActive" FROM blog_media WHERE post_id = $1',
        [postId]
      );

      // Try repository find
      const repoMedia = await this.mediaRepository.find({
        where: { postId, isActive: true }
      });

      // Try repository find without isActive filter
      const allPostMedia = await this.mediaRepository.find({
        where: { postId }
      });

      return {
        postId,
        rawQueryResult: rawMedia,
        repositoryWithActive: repoMedia,
        allPostMedia: allPostMedia,
        debug: {
          rawCount: rawMedia.length,
          repoActiveCount: repoMedia.length, 
          allCount: allPostMedia.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testMediaLoading(): Promise<any> {
    try {
      // Test 1: Count all media
      const allMediaCount = await this.mediaRepository.count();
      
      // Test 2: Get all media with basic info
      const allMedia = await this.mediaRepository.find();

      return {
        success: true,
        allMediaCount,
        totalMedia: allMedia.length,
        mediaSample: allMedia.slice(0, 2).map(m => ({
          id: m.id,
          filename: m.filename,
          postId: m.postId,
          isActive: m.isActive
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async debugMediaLoading(postId: string): Promise<any> {
    // Method 1: Direct repository query
    const postDirect = await this.blogPostRepository.findOne({
      where: { id: postId },
      relations: ['media']
    });

    // Method 2: Query builder approach
    const postQueryBuilder = await this.blogPostRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.media', 'media')
      .where('post.id = :postId', { postId })
      .getOne();

    // Method 3: Using media repository directly
    const mediaFromRepository = await this.mediaRepository.find({
      where: { postId, isActive: true },
      relations: ['uploadedBy'],
      order: { sortOrder: 'ASC', createdAt: 'ASC' }
    });

    return {
      postId,
      methods: {
        directRepository: {
          found: !!postDirect,
          mediaCount: postDirect?.media?.length || 0,
          media: postDirect?.media || null
        },
        queryBuilder: {
          found: !!postQueryBuilder,
          mediaCount: postQueryBuilder?.media?.length || 0,
          media: postQueryBuilder?.media || null
        },
        mediaRepository: {
          mediaCount: mediaFromRepository?.length || 0,
          media: mediaFromRepository || null
        }
      }
    };
  }

  /**
   * Mark a blog post as viewed by a user.
   * Creates or updates a view record for the user-post combination.
   */
  async markPostAsViewed(postId: string, userId: string): Promise<void> {
    try {
      // Check if view already exists
      const existingView = await this.blogPostViewRepository.findOne({
        where: { postId, userId }
      });

      if (existingView) {
        // Update the viewedAt timestamp
        await this.blogPostViewRepository.update(existingView.id, {
          viewedAt: new Date()
        });
      } else {
        // Create new view record
        const view = this.blogPostViewRepository.create({
          postId,
          userId,
        });
        await this.blogPostViewRepository.save(view);
      }
    } catch (error) {
      // Log error but don't fail - this is a non-critical operation
      console.error('Error marking post as viewed:', error);
    }
  }

  /**
   * Mark all published posts as viewed by a user.
   * Called when user visits the blog feed.
   */
  async markAllPostsAsViewed(user: User): Promise<{ markedAsViewed: number }> {
    // Get all published posts visible to this user that haven't been viewed
    const queryBuilder = this.createBaseQuery(false, false)
      .select(['post.id']);

    // Apply visibility filters based on user role
    await this.applyVisibilityFilters(queryBuilder, user);

    // Get posts not already viewed by this user
    queryBuilder.andWhere(
      `post.id NOT IN (
        SELECT pv."postId" FROM blog_post_views pv WHERE pv."userId" = :userId
      )`,
      { userId: user.id }
    );

    const unviewedPosts = await queryBuilder.getMany();

    // Create view records for all unviewed posts
    let markedCount = 0;
    for (const post of unviewedPosts) {
      try {
        const view = this.blogPostViewRepository.create({
          postId: post.id,
          userId: user.id,
        });
        await this.blogPostViewRepository.save(view);
        markedCount++;
      } catch (error) {
        // Skip duplicates silently (race condition protection)
        if (!error.message?.includes('duplicate')) {
          console.error('Error marking post as viewed:', error);
        }
      }
    }

    return { markedAsViewed: markedCount };
  }

  /**
   * Get count of unread (not viewed) blog posts for a user.
   * Used for displaying badge notifications in the menu.
   */
  async getUnreadPostsCount(user: User): Promise<{ unreadCount: number }> {
    // Build query for published posts visible to this user
    const queryBuilder = this.createBaseQuery(false, false)
      .select(['post.id']);

    // Apply visibility filters based on user role
    await this.applyVisibilityFilters(queryBuilder, user);

    // Exclude posts already viewed by this user
    queryBuilder.andWhere(
      `post.id NOT IN (
        SELECT pv."postId" FROM blog_post_views pv WHERE pv."userId" = :userId
      )`,
      { userId: user.id }
    );

    const count = await queryBuilder.getCount();

    return { unreadCount: count };
  }

  /**
   * Get list of unread posts for a user (with basic info).
   */
  async getUnreadPosts(user: User, limit: number = 10): Promise<BlogPost[]> {
    const queryBuilder = this.createBaseQuery(false, true);

    // Apply visibility filters based on user role
    await this.applyVisibilityFilters(queryBuilder, user);

    // Exclude posts already viewed by this user
    queryBuilder.andWhere(
      `post.id NOT IN (
        SELECT pv."postId" FROM blog_post_views pv WHERE pv."userId" = :userId
      )`,
      { userId: user.id }
    );

    queryBuilder
      .orderBy('post.publishDate', 'DESC')
      .take(limit);

    return queryBuilder.getMany();
  }
}