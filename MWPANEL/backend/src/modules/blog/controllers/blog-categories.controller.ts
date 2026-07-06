import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BlogCategoryService } from '../services/blog-category.service';
import { CreateBlogCategoryDto, UpdateBlogCategoryDto } from '../dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { BlogCategory } from '../entities';
import { UserRole } from '../../users/entities/user.entity';

@ApiTags('Blog Categories')
@Controller('blog-categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BlogCategoriesController {
  constructor(private readonly categoryService: BlogCategoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new blog category' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Category created successfully', type: BlogCategory })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async create(@Body() createCategoryDto: CreateBlogCategoryDto): Promise<BlogCategory> {
    return this.categoryService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all blog categories' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Categories retrieved successfully', type: [BlogCategory] })
  async findAll(): Promise<BlogCategory[]> {
    return this.categoryService.findAll();
  }

  @Get('by-id/:id')
  @ApiOperation({ summary: 'Get blog category by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Category retrieved successfully', type: BlogCategory })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<BlogCategory> {
    return this.categoryService.findOne(id);
  }

  @Patch('by-id/:id')
  @ApiOperation({ summary: 'Update a blog category' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Category updated successfully', type: BlogCategory })
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCategoryDto: UpdateBlogCategoryDto,
  ): Promise<BlogCategory> {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @Delete('by-id/:id')
  @ApiOperation({ summary: 'Delete a blog category' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Category deleted successfully' })
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.categoryService.remove(id);
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Reorder blog categories' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Categories reordered successfully', type: [BlogCategory] })
  @Roles(UserRole.ADMIN)
  async reorder(@Body('categoryIds') categoryIds: string[]): Promise<BlogCategory[]> {
    return this.categoryService.reorder(categoryIds);
  }

  @Get('by-id/:id/posts/count')
  @ApiOperation({ summary: 'Get post count for category' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Post count retrieved successfully' })
  async getPostCount(@Param('id', ParseUUIDPipe) id: string): Promise<{ count: number }> {
    const count = await this.categoryService.getPostCount(id);
    return { count };
  }
}