import { PartialType } from '@nestjs/swagger';
import { CreateBlogMediaDto } from './create-blog-media.dto';

export class UpdateBlogMediaDto extends PartialType(CreateBlogMediaDto) {}