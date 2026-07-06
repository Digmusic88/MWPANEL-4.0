import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFamilyAccessControls1752680000000 implements MigrationInterface {
  name = 'CreateFamilyAccessControls1752680000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create family_access_controls table
    await queryRunner.query(`
      CREATE TABLE family_access_controls (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "studentId" UUID NOT NULL,
        "familyId" UUID NOT NULL,
        
        -- Basic access controls
        "canViewNotes" BOOLEAN DEFAULT true,
        "canDownloadFiles" BOOLEAN DEFAULT false,
        "canViewMetadata" BOOLEAN DEFAULT true,
        
        -- Content filtering
        "allowedSubjects" JSONB,
        "blockedSubjects" JSONB,
        "allowedNoteTypes" JSONB,
        "blockedNoteTypes" JSONB,
        
        -- Time-based restrictions
        "accessStartTime" TIME,
        "accessEndTime" TIME,
        "weekendRestriction" BOOLEAN DEFAULT false,
        "allowedDaysOfWeek" JSONB,
        
        -- Usage limits
        "maxDailyViews" INTEGER DEFAULT 0,
        "maxDailyDownloads" INTEGER DEFAULT 0,
        "retentionDays" INTEGER DEFAULT 30,
        
        -- Approval and monitoring
        "requireStudentApproval" BOOLEAN DEFAULT false,
        "logFamilyAccess" BOOLEAN DEFAULT true,
        "notifyStudentOnAccess" BOOLEAN DEFAULT false,
        "notifyFamilyOnNewNote" BOOLEAN DEFAULT false,
        
        -- Advanced filtering
        "minNoteSizeBytes" INTEGER DEFAULT 0,
        "maxNoteSizeBytes" INTEGER DEFAULT 0,
        "bannedKeywords" JSONB,
        "requiredKeywords" JSONB,
        
        -- Custom settings
        "customSettings" JSONB,
        
        -- Timestamps
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        -- Constraints
        CONSTRAINT fk_family_access_controls_student 
          FOREIGN KEY ("studentId") REFERENCES students(id) ON DELETE CASCADE,
        CONSTRAINT fk_family_access_controls_family 
          FOREIGN KEY ("familyId") REFERENCES families(id) ON DELETE CASCADE
      )
    `);

    // Create family_access_logs table
    await queryRunner.query(`
      CREATE TABLE family_access_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "familyId" UUID NOT NULL,
        "studentId" UUID NOT NULL,
        "familyUserId" UUID NOT NULL,
        "noteId" UUID,
        action VARCHAR(50) NOT NULL CHECK (action IN ('view', 'download', 'denied', 'search', 'filter')),
        "noteType" VARCHAR(255),
        subject VARCHAR(255),
        "accessGranted" BOOLEAN DEFAULT true,
        "denialReason" VARCHAR(500),
        "ipAddress" INET,
        "userAgent" VARCHAR(500),
        "searchFilters" JSONB,
        metadata JSONB,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        -- Constraints
        CONSTRAINT fk_family_access_logs_family 
          FOREIGN KEY ("familyId") REFERENCES families(id) ON DELETE CASCADE,
        CONSTRAINT fk_family_access_logs_student 
          FOREIGN KEY ("studentId") REFERENCES students(id) ON DELETE CASCADE,
        CONSTRAINT fk_family_access_logs_user 
          FOREIGN KEY ("familyUserId") REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_family_access_logs_note 
          FOREIGN KEY ("noteId") REFERENCES student_notes(id) ON DELETE SET NULL
      )
    `);

    // Create indexes for family_access_controls
    await queryRunner.query(`
      CREATE UNIQUE INDEX IDX_family_access_controls_student_family 
      ON family_access_controls("studentId", "familyId");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IDX_family_access_controls_student 
      ON family_access_controls("studentId");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IDX_family_access_controls_family 
      ON family_access_controls("familyId");
    `);

    // Create indexes for family_access_logs
    await queryRunner.query(`
      CREATE INDEX IDX_family_access_logs_family_date 
      ON family_access_logs("familyId", "createdAt");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IDX_family_access_logs_student_date 
      ON family_access_logs("studentId", "createdAt");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IDX_family_access_logs_action_date 
      ON family_access_logs(action, "createdAt");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IDX_family_access_logs_note 
      ON family_access_logs("noteId");
    `);

    // Create trigger to update updatedAt in family_access_controls
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_family_access_controls_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW."updatedAt" = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_family_access_controls_updated_at
        BEFORE UPDATE ON family_access_controls
        FOR EACH ROW
        EXECUTE FUNCTION update_family_access_controls_updated_at();
    `);

    // Insert default configurations for demo purposes
    await queryRunner.query(`
      INSERT INTO family_access_controls (
        "studentId", 
        "familyId",
        "canViewNotes",
        "canDownloadFiles",
        "canViewMetadata",
        "maxDailyViews",
        "maxDailyDownloads",
        "retentionDays",
        "logFamilyAccess"
      )
      SELECT 
        s.id as "studentId",
        fs."familyId",
        true as "canViewNotes",
        false as "canDownloadFiles",
        true as "canViewMetadata",
        20 as "maxDailyViews",
        5 as "maxDailyDownloads",
        90 as "retentionDays",
        true as "logFamilyAccess"
      FROM students s
      INNER JOIN family_students fs ON fs."studentId" = s.id
      WHERE NOT EXISTS (
        SELECT 1 FROM family_access_controls fac 
        WHERE fac."studentId" = s.id AND fac."familyId" = fs."familyId"
      );
    `);
    
    console.log('✅ Migración del sistema de controles parentales completada');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers and functions
    await queryRunner.query('DROP TRIGGER IF EXISTS update_family_access_controls_updated_at ON family_access_controls;');
    await queryRunner.query('DROP FUNCTION IF EXISTS update_family_access_controls_updated_at();');

    // Drop indexes
    await queryRunner.query('DROP INDEX IF EXISTS IDX_family_access_logs_note;');
    await queryRunner.query('DROP INDEX IF EXISTS IDX_family_access_logs_action_date;');
    await queryRunner.query('DROP INDEX IF EXISTS IDX_family_access_logs_student_date;');
    await queryRunner.query('DROP INDEX IF EXISTS IDX_family_access_logs_family_date;');
    await queryRunner.query('DROP INDEX IF EXISTS IDX_family_access_controls_family;');
    await queryRunner.query('DROP INDEX IF EXISTS IDX_family_access_controls_student;');
    await queryRunner.query('DROP INDEX IF EXISTS IDX_family_access_controls_student_family;');

    // Drop tables
    await queryRunner.query('DROP TABLE IF EXISTS family_access_logs;');
    await queryRunner.query('DROP TABLE IF EXISTS family_access_controls;');
    
    console.log('✅ Rollback del sistema de controles parentales completado');
  }
}