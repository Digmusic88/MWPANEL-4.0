import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { SimpleAiController } from './controllers/simple-ai.controller';
import { SemanticTestController } from './controllers/test.controller';
import { SemanticEvaluationController } from './controllers/semantic-evaluation.controller';
import { NlpService } from './services/nlp.service';
import { SemanticEvaluationService } from './services/semantic-evaluation.service';
import { HuggingFaceAIService } from '../../services/huggingface-ai.service';
import { HuggingFaceMCPService } from '../../services/ai/huggingface-mcp.service';
import { AutoActivityEvaluation } from './entities/auto-activity-evaluation.entity';
import { User } from '../users/entities/user.entity';
import { Competency } from '../competencies/entities/competency.entity';
import { OperativeDescriptor } from '../competencies/entities/operative-descriptor.entity';
import { SpecificCompetency } from '../competencies/entities/specific-competency.entity';
import { EvaluationCriterion } from '../competencies/entities/evaluation-criterion.entity';
import { BasicKnowledge } from '../competencies/entities/basic-knowledge.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      AutoActivityEvaluation,
      User,
      Competency,
      OperativeDescriptor,
      SpecificCompetency,
      EvaluationCriterion,
      BasicKnowledge,
    ]),
  ],
  controllers: [
    SimpleAiController,
    SemanticTestController,
    SemanticEvaluationController,
  ],
  providers: [
    NlpService, // ✅ Solo NLP service
    SemanticEvaluationService, // ✅ Service para history y stats
    HuggingFaceAIService, // ✅ Servicio real de IA con HuggingFace
    HuggingFaceMCPService, // ✅ Nuevo servicio MCP para HuggingFace
  ],
  exports: [NlpService], // Solo NLP service por ahora
})
export class SemanticEvaluationModule implements OnModuleInit {
  constructor() {
    console.log('🤖 SemanticEvaluationModule constructor called - Full AI system loading!');
  }

  onModuleInit() {
    console.log('🤖 SemanticEvaluationModule OnModuleInit - Module initialized successfully!');
  }
}