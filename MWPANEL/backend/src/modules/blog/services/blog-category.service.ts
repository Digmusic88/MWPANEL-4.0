import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BlogCategory } from '../entities';
import { CreateBlogCategoryDto, UpdateBlogCategoryDto } from '../dto';

@Injectable()
export class BlogCategoryService {
  constructor(
    @InjectRepository(BlogCategory)
    private categoryRepository: Repository<BlogCategory>,
  ) {}

  // Helper function to generate slug from name
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .substring(0, 250); // Limit length
  }

  // Ensure slug is unique by appending a number if needed
  private async ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const query = this.categoryRepository.createQueryBuilder('category')
        .where('category.slug = :slug', { slug });

      if (excludeId) {
        query.andWhere('category.id != :id', { id: excludeId });
      }

      const existing = await query.getOne();

      if (!existing) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  async create(createCategoryDto: CreateBlogCategoryDto): Promise<BlogCategory> {
    // Check if category with same name already exists
    const existingCategory = await this.categoryRepository.findOne({
      where: { name: createCategoryDto.name }
    });

    if (existingCategory) {
      throw new BadRequestException('Category with this name already exists');
    }

    // Generate unique slug from name
    const baseSlug = this.generateSlug(createCategoryDto.name);
    const slug = await this.ensureUniqueSlug(baseSlug);

    const category = this.categoryRepository.create({
      ...createCategoryDto,
      slug,
    });
    return this.categoryRepository.save(category);
  }

  async findAll(): Promise<BlogCategory[]> {
    return this.categoryRepository.find({
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<BlogCategory> {
    const category = await this.categoryRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateBlogCategoryDto): Promise<BlogCategory> {
    const category = await this.findOne(id);

    // Check name uniqueness if name is being updated
    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      const existingCategory = await this.categoryRepository.findOne({
        where: { name: updateCategoryDto.name }
      });

      if (existingCategory) {
        throw new BadRequestException('Category with this name already exists');
      }
    }

    await this.categoryRepository.update(id, updateCategoryDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    
    // Check if category has posts by counting them
    const postCount = await this.getPostCount(id);
    if (postCount > 0) {
      throw new BadRequestException('Cannot delete category with existing posts. Move or delete posts first.');
    }

    await this.categoryRepository.remove(category);
  }

  async reorder(categoryIds: string[]): Promise<BlogCategory[]> {
    const categories = await this.categoryRepository.find({
      where: { id: In(categoryIds) }
    });

    if (categories.length !== categoryIds.length) {
      throw new BadRequestException('Some categories not found');
    }

    // Update sort order
    for (let i = 0; i < categoryIds.length; i++) {
      await this.categoryRepository.update(categoryIds[i], { sortOrder: i });
    }

    return this.findAll();
  }

  async getPostCount(id: string): Promise<number> {
    const category = await this.categoryRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Count posts directly instead of loading them
    const count = await this.categoryRepository.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('blog_posts', 'post')
      .where('post.category_id = :categoryId', { categoryId: id })
      .getRawOne();

    return parseInt(count.count) || 0;
  }
}