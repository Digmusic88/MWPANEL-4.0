import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BlogService } from '../services/blog.service';
import { CreateBlogPostDto, UpdateBlogPostDto, BlogQueryDto } from '../dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { User, UserRole } from '../../users/entities/user.entity';
import { BlogPost } from '../entities';

@ApiTags('Blog')
@Controller('blog-posts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new blog post' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Blog post created successfully', type: BlogPost })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async create(
    @Body() createBlogPostDto: CreateBlogPostDto,
    @CurrentUser() user: User,
  ): Promise<BlogPost> {
    return this.blogService.create(createBlogPostDto, user);
  }

  @Get('test-stats')
  @ApiOperation({ summary: 'Test endpoint for blog stats and media diagnostics' })
  @Public()
  async testStats(): Promise<any> {
    try {
      const result = await this.blogService.debugMediaDirectly();
      return result;
    } catch (error) {
      return {
        error: error.message,
        message: "Debug failed",
        timestamp: new Date().toISOString()
      };
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get blog statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Blog statistics retrieved successfully' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getStats(): Promise<any> {
    return this.blogService.getBlogStats();
  }

  @Get('blog-statistics')
  @ApiOperation({ summary: 'Get blog statistics for admin dashboard' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Blog statistics retrieved successfully' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getBlogStats(): Promise<any> {
    return this.blogService.getBlogStats();
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured blog posts' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Featured posts retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of posts to return' })
  async getFeatured(
    @Query('limit') limit?: number,
    @CurrentUser() user?: User,
  ): Promise<BlogPost[]> {
    return this.blogService.getFeatured(limit, user);
  }

  @Get('my/drafts')
  @ApiOperation({ summary: 'Get current user drafts and scheduled posts' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User drafts retrieved successfully', type: [BlogPost] })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getMyDrafts(
    @CurrentUser() user: User,
  ): Promise<BlogPost[]> {
    return this.blogService.getUserDrafts(user);
  }

  @Get('unread/count')
  @ApiOperation({ summary: 'Get count of unread blog posts for the current user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Unread posts count retrieved successfully' })
  async getUnreadCount(
    @CurrentUser() user: User,
  ): Promise<{ unreadCount: number }> {
    return this.blogService.getUnreadPostsCount(user);
  }

  @Get('unread/list')
  @ApiOperation({ summary: 'Get list of unread blog posts for the current user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Unread posts list retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max number of posts to return' })
  async getUnreadPosts(
    @CurrentUser() user: User,
    @Query('limit') limit?: number,
  ): Promise<BlogPost[]> {
    return this.blogService.getUnreadPosts(user, limit || 10);
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all visible blog posts as read for the current user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'All posts marked as read' })
  async markAllAsRead(
    @CurrentUser() user: User,
  ): Promise<{ markedAsViewed: number }> {
    return this.blogService.markAllPostsAsViewed(user);
  }

  @Post(':id/mark-read')
  @ApiOperation({ summary: 'Mark a specific blog post as read' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Post marked as read' })
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean }> {
    await this.blogService.markPostAsViewed(id, user.id);
    return { success: true };
  }

  @Get()
  @ApiOperation({ summary: 'Get all blog posts with filtering and pagination' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Blog posts retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term' })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'published', 'archived'] })
  @ApiQuery({ name: 'visibility', required: false, enum: ['public', 'staff_only', 'students_only', 'families_only', 'class_specific', 'private'] })
  @ApiQuery({ name: 'categoryId', required: false, type: String, description: 'Filter by category' })
  @ApiQuery({ name: 'authorId', required: false, type: String, description: 'Filter by author' })
  @ApiQuery({ name: 'tag', required: false, type: String, description: 'Filter by tag' })
  @ApiQuery({ name: 'featured', required: false, type: Boolean, description: 'Filter featured posts' })
  async findAll(
    @Query() query: BlogQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.blogService.findAll(query, user);
  }

  @Get('category/:categoryId')
  @ApiOperation({ summary: 'Get blog posts by category' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Posts by category retrieved successfully' })
  async getByCategory(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Query() query: BlogQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.blogService.getByCategory(categoryId, query, user);
  }

  @Get('tag/:tag')
  @ApiOperation({ summary: 'Get blog posts by tag' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Posts by tag retrieved successfully' })
  async getByTag(
    @Param('tag') tag: string,
    @Query() query: BlogQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.blogService.getByTag(tag, query, user);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get blog post by slug' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Blog post retrieved successfully', type: BlogPost })
  @Public()
  async findBySlug(
    @Param('slug') slug: string,
    @CurrentUser() user?: User,
  ): Promise<BlogPost> {
    return this.blogService.findBySlug(slug, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a blog post' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Blog post updated successfully', type: BlogPost })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBlogPostDto: UpdateBlogPostDto,
    @CurrentUser() user: User,
  ): Promise<BlogPost> {
    return this.blogService.update(id, updateBlogPostDto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a blog post' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Blog post deleted successfully' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.blogService.remove(id, user);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish a draft blog post' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Blog post published successfully', type: BlogPost })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<BlogPost> {
    return this.blogService.publish(id, user);
  }

  @Post(':id/unpublish')
  @ApiOperation({ summary: 'Unpublish a published blog post' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Blog post unpublished successfully', type: BlogPost })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async unpublish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<BlogPost> {
    return this.blogService.unpublish(id, user);
  }

  @Post(':id/schedule')
  @ApiOperation({ summary: 'Schedule a blog post for future publication' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Blog post scheduled successfully', type: BlogPost })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async schedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('publishDate') publishDate: string,
    @CurrentUser() user: User,
  ): Promise<BlogPost> {
    return this.blogService.schedule(id, new Date(publishDate), user);
  }

  @Post('publish-scheduled')
  @ApiOperation({ summary: 'Manually trigger publishing of scheduled posts (admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Scheduled posts published' })
  @Roles(UserRole.ADMIN)
  async publishScheduled(): Promise<{ published: number; posts: string[] }> {
    return this.blogService.publishScheduledPosts();
  }

  @Patch(':id/view')
  @ApiOperation({ summary: 'Increment view count for a blog post' })
  @ApiResponse({ status: HttpStatus.OK, description: 'View count updated successfully' })
  async incrementViewCount(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ views: number }> {
    return this.blogService.incrementViewCount(id);
  }

  @Get('debug-media/:postId')
  @ApiOperation({ summary: 'Debug media loading for a specific post' })
  @Public()
  async debugMedia(@Param('postId') postId: string): Promise<any> {
    return this.blogService.debugMediaLoading(postId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get blog post by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Blog post retrieved successfully', type: BlogPost })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: User,
  ): Promise<BlogPost> {
    return this.blogService.findOne(id, user);
  }
}