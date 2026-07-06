import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateCompetencySystemTables1753000000000 implements MigrationInterface {
  name = 'CreateCompetencySystemTables1753000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Exit Profiles (Perfil de Salida)
    await queryRunner.createTable(
      new Table({
        name: 'exit_profiles',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['PRIMARY', 'BASIC_EDUCATION'],
            isUnique: true,
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'legalReference',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // 2. Operative Descriptors (Descriptores Operativos)
    await queryRunner.createTable(
      new Table({
        name: 'operative_descriptors',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'code',
            type: 'varchar',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'order',
            type: 'int',
          },
          {
            name: 'exitProfileId',
            type: 'uuid',
          },
          {
            name: 'competencyId',
            type: 'uuid',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // 3. Specific Competencies (Competencias Específicas)
    await queryRunner.createTable(
      new Table({
        name: 'specific_competencies',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'code',
            type: 'varchar',
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'order',
            type: 'int',
          },
          {
            name: 'subjectId',
            type: 'uuid',
          },
          {
            name: 'educationalLevelId',
            type: 'uuid',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // 4. Evaluation Criteria (Criterios de Evaluación)
    await queryRunner.createTable(
      new Table({
        name: 'evaluation_criteria',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'code',
            type: 'varchar',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'order',
            type: 'int',
          },
          {
            name: 'specificCompetencyId',
            type: 'uuid',
          },
          {
            name: 'cycleId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'courseId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'observableIndicators',
            type: 'text[]',
            isNullable: true,
          },
          {
            name: 'assessmentMethods',
            type: 'text[]',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // 5. Basic Knowledge (Saberes Básicos)
    await queryRunner.createTable(
      new Table({
        name: 'basic_knowledge',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'code',
            type: 'varchar',
          },
          {
            name: 'block',
            type: 'varchar',
          },
          {
            name: 'title',
            type: 'varchar',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'order',
            type: 'int',
          },
          {
            name: 'specificCompetencyId',
            type: 'uuid',
          },
          {
            name: 'cycleId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'courseId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'knowledgeType',
            type: 'enum',
            enum: ['KNOWLEDGE', 'SKILL', 'ATTITUDE'],
            default: "'KNOWLEDGE'",
          },
          {
            name: 'alternativeRepresentations',
            type: 'text[]',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // 6. Learning Situations (Situaciones de Aprendizaje)
    await queryRunner.createTable(
      new Table({
        name: 'learning_situations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'title',
            type: 'varchar',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'context',
            type: 'text',
          },
          {
            name: 'challenge',
            type: 'text',
          },
          {
            name: 'startDate',
            type: 'date',
          },
          {
            name: 'endDate',
            type: 'date',
          },
          {
            name: 'estimatedSessions',
            type: 'int',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'],
            default: "'DRAFT'",
          },
          {
            name: 'methodologies',
            type: 'text[]',
          },
          {
            name: 'resources',
            type: 'text[]',
          },
          {
            name: 'spaces',
            type: 'text[]',
          },
          {
            name: 'expectedProducts',
            type: 'text[]',
          },
          {
            name: 'duaAdaptations',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'assessmentTools',
            type: 'text[]',
          },
          {
            name: 'successCriteria',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'teacherId',
            type: 'uuid',
          },
          {
            name: 'classGroupId',
            type: 'uuid',
          },
          {
            name: 'subjectId',
            type: 'uuid',
          },
          {
            name: 'sharedWith',
            type: 'text[]',
            isNullable: true,
          },
          {
            name: 'isTemplate',
            type: 'boolean',
            default: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // 7. Learning Situation Assessments
    await queryRunner.createTable(
      new Table({
        name: 'learning_situation_assessments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'learningSituationId',
            type: 'uuid',
          },
          {
            name: 'studentId',
            type: 'uuid',
          },
          {
            name: 'specificCompetencyId',
            type: 'uuid',
          },
          {
            name: 'performanceLevel',
            type: 'enum',
            enum: ['NOT_INITIATED', 'IN_PROCESS', 'ACHIEVED', 'EXCEEDED'],
          },
          {
            name: 'evidences',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'observations',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'selfAssessment',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'selfScore',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'peerAssessments',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'assessmentDate',
            type: 'date',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // 8. Formative Observations
    await queryRunner.createTable(
      new Table({
        name: 'formative_observations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'studentId',
            type: 'uuid',
          },
          {
            name: 'teacherId',
            type: 'uuid',
          },
          {
            name: 'specificCompetencyId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'evaluationCriterionId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'context',
            type: 'enum',
            enum: ['CLASSROOM', 'PLAYGROUND', 'LAB', 'WORKSHOP', 'FIELD_TRIP', 'OTHER'],
          },
          {
            name: 'contextDescription',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'observation',
            type: 'text',
          },
          {
            name: 'observationType',
            type: 'enum',
            enum: ['ACHIEVEMENT', 'PROCESS', 'DIFFICULTY', 'BEHAVIOR', 'INTERACTION'],
          },
          {
            name: 'developmentAspects',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'progressIndicator',
            type: 'enum',
            enum: ['EMERGING', 'DEVELOPING', 'ACHIEVING', 'EXCEEDING'],
            isNullable: true,
          },
          {
            name: 'attachments',
            type: 'text[]',
            isNullable: true,
          },
          {
            name: 'observationDateTime',
            type: 'timestamp',
          },
          {
            name: 'requiresFollowUp',
            type: 'boolean',
            default: false,
          },
          {
            name: 'followUpNotes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // 9. Orientation Advices (Consejos Orientadores)
    await queryRunner.createTable(
      new Table({
        name: 'orientation_advices',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'studentId',
            type: 'uuid',
          },
          {
            name: 'courseId',
            type: 'uuid',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['SECOND_YEAR', 'THIRD_YEAR', 'FINAL'],
          },
          {
            name: 'academicYear',
            type: 'varchar',
          },
          {
            name: 'objectivesAchievement',
            type: 'text',
          },
          {
            name: 'competenciesAchievement',
            type: 'text',
          },
          {
            name: 'recommendedPath',
            type: 'text',
          },
          {
            name: 'recommendedOptions',
            type: 'text[]',
          },
          {
            name: 'cfgbProposed',
            type: 'boolean',
            default: false,
          },
          {
            name: 'cfgbJustification',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'supportMeasures',
            type: 'text[]',
            isNullable: true,
          },
          {
            name: 'observations',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'approvedByTeam',
            type: 'boolean',
            default: false,
          },
          {
            name: 'approvalDate',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'approvingTeachers',
            type: 'text[]',
            isNullable: true,
          },
          {
            name: 'deliveredToFamily',
            type: 'boolean',
            default: false,
          },
          {
            name: 'deliveryDate',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'tutorId',
            type: 'uuid',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // 10. Curricular Adaptations
    await queryRunner.createTable(
      new Table({
        name: 'curricular_adaptations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'studentId',
            type: 'uuid',
          },
          {
            name: 'subjectId',
            type: 'uuid',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['ACCESS', 'NON_SIGNIFICANT', 'SIGNIFICANT'],
          },
          {
            name: 'academicYear',
            type: 'varchar',
          },
          {
            name: 'detectedNeeds',
            type: 'text',
          },
          {
            name: 'duaPrinciples',
            type: 'jsonb',
          },
          {
            name: 'adaptedObjectives',
            type: 'text',
          },
          {
            name: 'methodology',
            type: 'text',
          },
          {
            name: 'specificResources',
            type: 'text[]',
          },
          {
            name: 'supports',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'assessmentAdaptations',
            type: 'text',
          },
          {
            name: 'nextReviewDate',
            type: 'date',
          },
          {
            name: 'progressNotes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'coordinatorId',
            type: 'uuid',
          },
          {
            name: 'involvedProfessionals',
            type: 'text[]',
          },
          {
            name: 'familyApproval',
            type: 'boolean',
            default: false,
          },
          {
            name: 'familyApprovalDate',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Update courses table to add missing columns
    await queryRunner.query(`ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "code" varchar UNIQUE`);
    await queryRunner.query(`ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "ageReference" int`);

    // Junction tables
    await queryRunner.createTable(
      new Table({
        name: 'specific_competency_key_mapping',
        columns: [
          {
            name: 'specificCompetencyId',
            type: 'uuid',
          },
          {
            name: 'competencyId',
            type: 'uuid',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'learning_situation_competencies',
        columns: [
          {
            name: 'learningSituationId',
            type: 'uuid',
          },
          {
            name: 'specificCompetencyId',
            type: 'uuid',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'adaptation_specific_competencies',
        columns: [
          {
            name: 'adaptationId',
            type: 'uuid',
          },
          {
            name: 'specificCompetencyId',
            type: 'uuid',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'adaptation_evaluation_criteria',
        columns: [
          {
            name: 'adaptationId',
            type: 'uuid',
          },
          {
            name: 'criterionId',
            type: 'uuid',
          },
        ],
      }),
      true,
    );

    // Create all foreign keys
    // Operative Descriptors
    await queryRunner.createForeignKey(
      'operative_descriptors',
      new TableForeignKey({
        columnNames: ['exitProfileId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'exit_profiles',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'operative_descriptors',
      new TableForeignKey({
        columnNames: ['competencyId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'competencies',
        onDelete: 'CASCADE',
      }),
    );

    // Specific Competencies
    await queryRunner.createForeignKey(
      'specific_competencies',
      new TableForeignKey({
        columnNames: ['subjectId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'subjects',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'specific_competencies',
      new TableForeignKey({
        columnNames: ['educationalLevelId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'educational_levels',
        onDelete: 'CASCADE',
      }),
    );

    // Evaluation Criteria
    await queryRunner.createForeignKey(
      'evaluation_criteria',
      new TableForeignKey({
        columnNames: ['specificCompetencyId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'specific_competencies',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'evaluation_criteria',
      new TableForeignKey({
        columnNames: ['cycleId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'cycles',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'evaluation_criteria',
      new TableForeignKey({
        columnNames: ['courseId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'courses',
        onDelete: 'CASCADE',
      }),
    );

    // Basic Knowledge
    await queryRunner.createForeignKey(
      'basic_knowledge',
      new TableForeignKey({
        columnNames: ['specificCompetencyId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'specific_competencies',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'basic_knowledge',
      new TableForeignKey({
        columnNames: ['cycleId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'cycles',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'basic_knowledge',
      new TableForeignKey({
        columnNames: ['courseId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'courses',
        onDelete: 'CASCADE',
      }),
    );

    // Learning Situations
    await queryRunner.createForeignKey(
      'learning_situations',
      new TableForeignKey({
        columnNames: ['teacherId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'teachers',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'learning_situations',
      new TableForeignKey({
        columnNames: ['classGroupId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'class_groups',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'learning_situations',
      new TableForeignKey({
        columnNames: ['subjectId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'subjects',
        onDelete: 'CASCADE',
      }),
    );

    // Learning Situation Assessments
    await queryRunner.createForeignKey(
      'learning_situation_assessments',
      new TableForeignKey({
        columnNames: ['learningSituationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'learning_situations',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'learning_situation_assessments',
      new TableForeignKey({
        columnNames: ['studentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'students',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'learning_situation_assessments',
      new TableForeignKey({
        columnNames: ['specificCompetencyId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'specific_competencies',
        onDelete: 'CASCADE',
      }),
    );

    // Formative Observations
    await queryRunner.createForeignKey(
      'formative_observations',
      new TableForeignKey({
        columnNames: ['studentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'students',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'formative_observations',
      new TableForeignKey({
        columnNames: ['teacherId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'teachers',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'formative_observations',
      new TableForeignKey({
        columnNames: ['specificCompetencyId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'specific_competencies',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'formative_observations',
      new TableForeignKey({
        columnNames: ['evaluationCriterionId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'evaluation_criteria',
        onDelete: 'CASCADE',
      }),
    );

    // Orientation Advices
    await queryRunner.createForeignKey(
      'orientation_advices',
      new TableForeignKey({
        columnNames: ['studentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'students',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'orientation_advices',
      new TableForeignKey({
        columnNames: ['courseId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'courses',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'orientation_advices',
      new TableForeignKey({
        columnNames: ['tutorId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'teachers',
        onDelete: 'CASCADE',
      }),
    );

    // Curricular Adaptations
    await queryRunner.createForeignKey(
      'curricular_adaptations',
      new TableForeignKey({
        columnNames: ['studentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'students',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'curricular_adaptations',
      new TableForeignKey({
        columnNames: ['subjectId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'subjects',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'curricular_adaptations',
      new TableForeignKey({
        columnNames: ['coordinatorId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'teachers',
        onDelete: 'CASCADE',
      }),
    );

    // Junction table foreign keys
    await queryRunner.createForeignKey(
      'specific_competency_key_mapping',
      new TableForeignKey({
        columnNames: ['specificCompetencyId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'specific_competencies',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'specific_competency_key_mapping',
      new TableForeignKey({
        columnNames: ['competencyId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'competencies',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'learning_situation_competencies',
      new TableForeignKey({
        columnNames: ['learningSituationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'learning_situations',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'learning_situation_competencies',
      new TableForeignKey({
        columnNames: ['specificCompetencyId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'specific_competencies',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'adaptation_specific_competencies',
      new TableForeignKey({
        columnNames: ['adaptationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'curricular_adaptations',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'adaptation_specific_competencies',
      new TableForeignKey({
        columnNames: ['specificCompetencyId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'specific_competencies',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'adaptation_evaluation_criteria',
      new TableForeignKey({
        columnNames: ['adaptationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'curricular_adaptations',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'adaptation_evaluation_criteria',
      new TableForeignKey({
        columnNames: ['criterionId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'evaluation_criteria',
        onDelete: 'CASCADE',
      }),
    );

    // Create indices for performance
    await queryRunner.query(`CREATE INDEX "IDX_operative_descriptors_exit_profile" ON "operative_descriptors" ("exitProfileId")`);
    await queryRunner.query(`CREATE INDEX "IDX_operative_descriptors_competency" ON "operative_descriptors" ("competencyId")`);
    await queryRunner.query(`CREATE INDEX "IDX_specific_competencies_subject" ON "specific_competencies" ("subjectId")`);
    await queryRunner.query(`CREATE INDEX "IDX_specific_competencies_level" ON "specific_competencies" ("educationalLevelId")`);
    await queryRunner.query(`CREATE INDEX "IDX_evaluation_criteria_competency" ON "evaluation_criteria" ("specificCompetencyId")`);
    await queryRunner.query(`CREATE INDEX "IDX_basic_knowledge_competency" ON "basic_knowledge" ("specificCompetencyId")`);
    await queryRunner.query(`CREATE INDEX "IDX_learning_situations_class" ON "learning_situations" ("classGroupId")`);
    await queryRunner.query(`CREATE INDEX "IDX_learning_situations_teacher" ON "learning_situations" ("teacherId")`);
    await queryRunner.query(`CREATE INDEX "IDX_formative_observations_student" ON "formative_observations" ("studentId", "observationDateTime")`);
    await queryRunner.query(`CREATE INDEX "IDX_orientation_advices_student" ON "orientation_advices" ("studentId", "academicYear")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indices
    await queryRunner.query(`DROP INDEX "IDX_orientation_advices_student"`);
    await queryRunner.query(`DROP INDEX "IDX_formative_observations_student"`);
    await queryRunner.query(`DROP INDEX "IDX_learning_situations_teacher"`);
    await queryRunner.query(`DROP INDEX "IDX_learning_situations_class"`);
    await queryRunner.query(`DROP INDEX "IDX_basic_knowledge_competency"`);
    await queryRunner.query(`DROP INDEX "IDX_evaluation_criteria_competency"`);
    await queryRunner.query(`DROP INDEX "IDX_specific_competencies_level"`);
    await queryRunner.query(`DROP INDEX "IDX_specific_competencies_subject"`);
    await queryRunner.query(`DROP INDEX "IDX_operative_descriptors_competency"`);
    await queryRunner.query(`DROP INDEX "IDX_operative_descriptors_exit_profile"`);

    // Drop all tables in reverse order
    await queryRunner.dropTable('adaptation_evaluation_criteria', true);
    await queryRunner.dropTable('adaptation_specific_competencies', true);
    await queryRunner.dropTable('learning_situation_competencies', true);
    await queryRunner.dropTable('specific_competency_key_mapping', true);
    await queryRunner.dropTable('curricular_adaptations', true);
    await queryRunner.dropTable('orientation_advices', true);
    await queryRunner.dropTable('formative_observations', true);
    await queryRunner.dropTable('learning_situation_assessments', true);
    await queryRunner.dropTable('learning_situations', true);
    await queryRunner.dropTable('basic_knowledge', true);
    await queryRunner.dropTable('evaluation_criteria', true);
    await queryRunner.dropTable('specific_competencies', true);
    await queryRunner.dropTable('operative_descriptors', true);
    await queryRunner.dropTable('exit_profiles', true);

    // Remove added columns from courses table
    await queryRunner.query(`ALTER TABLE "courses" DROP COLUMN IF EXISTS "code"`);
    await queryRunner.query(`ALTER TABLE "courses" DROP COLUMN IF EXISTS "ageReference"`);
  }
}