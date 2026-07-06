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
  ParseBoolPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BlogCommentService } from '../services/blog-comment.service';
import { CreateBlogCommentDto, UpdateBlogCommentDto } from '../dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User, UserRole } from '../../users/entities/user.entity';
import { BlogComment } from '../entities';

@ApiTags('Blog Comments')
@Controller('blog-comments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BlogCommentsController {
  constructor(private readonly commentService: BlogCommentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new comment' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Comment created successfully', type: BlogComment })
  async create(
    @Body() createCommentDto: CreateBlogCommentDto,
    @CurrentUser() user: User,
  ): Promise<BlogComment> {
    return this.commentService.create(createCommentDto, user);
  }

  @Get('post/:postId')
  @ApiOperation({ summary: 'Get comments for a blog post' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Comments retrieved successfully', type: [BlogComment] })
  @ApiQuery({ name: 'includeModerated', required: false, type: Boolean, description: 'Include pending/rejected comments (admin only)' })
  async findByPost(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Query('includeModerated', ParseBoolPipe) includeModerated: boolean = false,
    @CurrentUser() user?: User,
  ): Promise<BlogComment[]> {
    // Only admins can see moderated comments
    const showModerated = includeModerated && user?.role === UserRole.ADMIN;
    return this.commentService.findByPost(postId, showModerated);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get pending comments for moderation' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Pending comments retrieved successfully', type: [BlogComment] })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getPending(): Promise<BlogComment[]> {
    return this.commentService.getPendingComments();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get comment statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Comment stats retrieved successfully' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getStats() {
    return this.commentService.getCommentStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get comment by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Comment retrieved successfully', type: BlogComment })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<BlogComment> {
    return this.commentService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a comment' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Comment updated successfully', type: BlogComment })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCommentDto: UpdateBlogCommentDto,
    @CurrentUser() user: User,
  ): Promise<BlogComment> {
    return this.commentService.update(id, updateCommentDto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Comment deleted successfully' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.commentService.remove(id, user);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a pending comment' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Comment approved successfully', type: BlogComment })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async approve(@Param('id', ParseUUIDPipe) id: string): Promise<BlogComment> {
    return this.commentService.approve(id);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a pending comment' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Comment rejected successfully', type: BlogComment })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async reject(@Param('id', ParseUUIDPipe) id: string): Promise<BlogComment> {
    return this.commentService.reject(id);
  }

  @Post('bulk/approve')
  @ApiOperation({ summary: 'Bulk approve comments' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Comments approved successfully' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async bulkApprove(@Body('commentIds') commentIds: string[]): Promise<{ message: string }> {
    await this.commentService.bulkApprove(commentIds);
    return { message: `${commentIds.length} comments approved successfully` };
  }

  @Post('bulk/reject')
  @ApiOperation({ summary: 'Bulk reject comments' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Comments rejected successfully' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async bulkReject(@Body('commentIds') commentIds: string[]): Promise<{ message: string }> {
    await this.commentService.bulkReject(commentIds);
    return { message: `${commentIds.length} comments rejected successfully` };
  }

  @Delete('bulk/delete')
  @ApiOperation({ summary: 'Bulk delete comments' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Comments deleted successfully' })
  @Roles(UserRole.ADMIN)
  async bulkDelete(@Body('commentIds') commentIds: string[]): Promise<{ message: string }> {
    await this.commentService.bulkDelete(commentIds);
    return { message: `${commentIds.length} comments deleted successfully` };
  }

  @Get()
  @ApiOperation({ summary: 'Get comments with filters' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Comments retrieved successfully', type: [BlogComment] })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by status (pending, approved, rejected)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limit number of results' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort field' })
  @ApiQuery({ name: 'sortOrder', required: false, type: String, description: 'Sort order (asc, desc)' })
  async findAll(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @CurrentUser() user?: User
  ): Promise<BlogComment[]> {
    const query = {
      status,
      limit: limit ? parseInt(limit) : undefined,
      sortBy,
      sortOrder: sortOrder as 'asc' | 'desc'
    };
    
    // Only admins and teachers can access moderated comments
    if (status === 'pending' && (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.TEACHER))) {
      throw new ForbiddenException('Insufficient permissions to view pending comments');
    }
    
    return this.commentService.findWithFilters(query);
  }
}