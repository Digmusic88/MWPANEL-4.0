import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BlogService } from './blog.service';

@Injectable()
export class BlogSchedulerService {
  private readonly logger = new Logger(BlogSchedulerService.name);

  constructor(private readonly blogService: BlogService) {}

  /**
   * Check for scheduled posts every minute and publish them if their time has come
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledPosts() {
    try {
      const result = await this.blogService.publishScheduledPosts();

      if (result.published > 0) {
        this.logger.log(`📰 Published ${result.published} scheduled posts: ${result.posts.join(', ')}`);
      }
    } catch (error) {
      this.logger.error('Error processing scheduled posts:', error);
    }
  }
}
