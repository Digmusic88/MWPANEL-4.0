import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompetenciesController } from './competencies.controller';
import { CompetenciesService } from './competencies.service';
import { LearningSituationsController } from './controllers/learning-situations.controller';
import { LearningSituationsService } from './services/learning-situations.service';
import { FormativeEvaluationController } from './controllers/formative-evaluation.controller';
import { FormativeEvaluationService } from './services/formative-evaluation.service';
// DUA legacy (disabled) - DUA real vive en /modules/dua/
// import { DuaController } from './controllers/dua.controller';
// import { DuaService } from './services/dua.service'; // Requires SubjectRepository from StudentsModule
// import { DuaIntegrationService } from './services/dua-integration.service';
import { Competency } from './entities/competency.entity';
import { Area } from './entities/area.entity';
import { ExitProfile } from './entities/exit-profile.entity';
import { OperativeDescriptor } from './entities/operative-descriptor.entity';
import { SpecificCompetency } from './entities/specific-competency.entity';
import { EvaluationCriterion } from './entities/evaluation-criterion.entity';
import { BasicKnowledge } from './entities/basic-knowledge.entity';
import { LearningSituation } from './entities/learning-situation.entity';
import { LearningSituationAssessment } from './entities/learning-situation-assessment.entity';
import { FormativeObservation } from './entities/formative-observation.entity';
import { Student } from '../students/entities/student.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { ClassGroup } from '../students/entities/class-group.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Competency,
      Area,
      ExitProfile,
      OperativeDescriptor,
      SpecificCompetency,
      EvaluationCriterion,
      BasicKnowledge,
      LearningSituation,
      LearningSituationAssessment,
      FormativeObservation,
      Student,
      Teacher,
      ClassGroup,
    ]),
  ],
  controllers: [CompetenciesController, LearningSituationsController, FormativeEvaluationController],
  providers: [CompetenciesService, LearningSituationsService, FormativeEvaluationService],
  exports: [CompetenciesService, LearningSituationsService, FormativeEvaluationService],
})
export class CompetenciesModule {}