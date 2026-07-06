import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { LogbookTag } from './entities/logbook-tag.entity';
import { LogbookEntry } from './entities/logbook-entry.entity';
import { LogbookAttachment } from './entities/logbook-attachment.entity';
import { LogbookSeries } from './entities/logbook-series.entity';

// Services
import { LogbookTagsService } from './services/logbook-tags.service';
import { LogbookEntriesService } from './services/logbook-entries.service';
import { LogbookSeriesService } from './services/logbook-series.service';

// Controllers
import { LogbookTagsController } from './controllers/logbook-tags.controller';
import { LogbookEntriesController } from './controllers/logbook-entries.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LogbookTag,
      LogbookEntry,
      LogbookAttachment,
      LogbookSeries,
    ]),
  ],
  providers: [
    LogbookTagsService,
    LogbookEntriesService,
    LogbookSeriesService,
  ],
  controllers: [
    LogbookTagsController,
    LogbookEntriesController,
  ],
  exports: [
    LogbookTagsService,
    LogbookEntriesService,
    LogbookSeriesService,
  ],
})
export class LogbookModule {}