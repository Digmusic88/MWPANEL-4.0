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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BlogService } from '../services/blog.service';
import { BlogCategoryService } from '../services/blog-category.service';
import { CreateBlogPostDto, UpdateBlogPostDto, BlogQueryDto, CreateBlogCategoryDto } from '../dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { User, UserRole } from '../../users/entities/user.entity';

@ApiTags('Blog Simple')
@Controller('blog')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BlogSimpleController {
  constructor(
    private readonly blogService: BlogService,
    private readonly categoryService: BlogCategoryService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Blog health check' })
  @Public()
  async health(): Promise<any> {
    return {
      message: "Blog simple controller is working",
      timestamp: new Date().toISOString(),
      status: 'OK'
    };
  }

  @Get('posts')
  @ApiOperation({ summary: 'Get all blog posts' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Blog posts retrieved successfully' })
  async getPosts(
    @Query() query: BlogQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.blogService.findAll(query, user);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all blog categories' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Categories retrieved successfully' })
  async getCategories() {
    return this.categoryService.findAll();
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create a new blog category' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Category created successfully' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async createCategory(
    @Body() createCategoryDto: CreateBlogCategoryDto,
  ) {
    return this.categoryService.create(createCategoryDto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get blog statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Blog statistics retrieved successfully' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getStats(): Promise<any> {
    return this.blogService.getBlogStats();
  }

  @Post('posts')
  @ApiOperation({ summary: 'Create a new blog post' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async createPost(
    @Body() createBlogPostDto: CreateBlogPostDto,
    @CurrentUser() user: User,
  ) {
    return this.blogService.create(createBlogPostDto, user);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete a blog category' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Category deleted successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot delete category with existing posts' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async deleteCategory(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.categoryService.remove(id);
    return { success: true, message: 'Category deleted successfully' };
  }
}