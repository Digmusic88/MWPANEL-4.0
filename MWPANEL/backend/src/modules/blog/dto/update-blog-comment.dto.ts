import { PartialType } from '@nestjs/swagger';
import { CreateBlogCommentDto } from './create-blog-comment.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { CommentStatus } from '../entities';

export class UpdateBlogCommentDto extends PartialType(CreateBlogCommentDto) {
  @IsEnum(CommentStatus)
  @IsOptional()
  status?: CommentStatus;
}