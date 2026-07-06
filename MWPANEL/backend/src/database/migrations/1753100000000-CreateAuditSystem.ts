import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditSystem1753100000000 implements MigrationInterface {
  name = 'CreateAuditSystem1753100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create audit_logs table
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid,
        "action" character varying NOT NULL,
        "entityType" character varying NOT NULL,
        "entityId" uuid,
        "result" character varying NOT NULL DEFAULT 'success',
        "ipAddress" character varying(45),
        "userAgent" character varying(500),
        "endpoint" character varying(200),
        "httpMethod" character varying(10),
        "httpStatus" integer,
        "description" text,
        "oldValues" jsonb,
        "newValues" jsonb,
        "metadata" jsonb,
        "location" character varying(100),
        "latitude" numeric(10,8),
        "longitude" numeric(11,8),
        "deviceType" character varying(50),
        "browser" character varying(100),
        "operatingSystem" character varying(100),
        "riskLevel" character varying NOT NULL DEFAULT 'LOW',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);

    // Create security_incidents table
    await queryRunner.query(`
      CREATE TABLE "security_incidents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" character varying NOT NULL,
        "severity" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'open',
        "title" character varying NOT NULL,
        "description" text NOT NULL,
        "affectedUserId" uuid,
        "ipAddress" character varying(45),
        "userAgent" character varying(500),
        "evidence" jsonb,
        "indicators" jsonb,
        "resolved" boolean NOT NULL DEFAULT false,
        "resolvedAt" TIMESTAMP,
        "resolvedById" uuid,
        "resolution" text,
        "autoDetected" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_security_incidents" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      ADD CONSTRAINT "FK_audit_logs_user"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "security_incidents"
      ADD CONSTRAINT "FK_security_incidents_affected_user"
      FOREIGN KEY ("affectedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "security_incidents"
      ADD CONSTRAINT "FK_security_incidents_resolved_by"
      FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
    `);

    // Create indexes for performance
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_userId" ON "audit_logs" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_action" ON "audit_logs" ("action")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_entityType" ON "audit_logs" ("entityType")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_entityId" ON "audit_logs" ("entityId")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_result" ON "audit_logs" ("result")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_ipAddress" ON "audit_logs" ("ipAddress")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_createdAt" ON "audit_logs" ("createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_riskLevel" ON "audit_logs" ("riskLevel")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_endpoint" ON "audit_logs" ("endpoint")`);

    await queryRunner.query(`CREATE INDEX "IDX_security_incidents_type" ON "security_incidents" ("type")`);
    await queryRunner.query(`CREATE INDEX "IDX_security_incidents_severity" ON "security_incidents" ("severity")`);
    await queryRunner.query(`CREATE INDEX "IDX_security_incidents_status" ON "security_incidents" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_security_incidents_affectedUserId" ON "security_incidents" ("affectedUserId")`);
    await queryRunner.query(`CREATE INDEX "IDX_security_incidents_ipAddress" ON "security_incidents" ("ipAddress")`);
    await queryRunner.query(`CREATE INDEX "IDX_security_incidents_createdAt" ON "security_incidents" ("createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_security_incidents_resolved" ON "security_incidents" ("resolved")`);
    await queryRunner.query(`CREATE INDEX "IDX_security_incidents_autoDetected" ON "security_incidents" ("autoDetected")`);

    // Create composite indexes for common queries
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_user_action" ON "audit_logs" ("userId", "action")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_entity_composite" ON "audit_logs" ("entityType", "entityId")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_time_risk" ON "audit_logs" ("createdAt", "riskLevel")`);
    await queryRunner.query(`CREATE INDEX "IDX_security_incidents_status_severity" ON "security_incidents" ("status", "severity")`);

    // Add constraints for enum values
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      ADD CONSTRAINT "CHK_audit_logs_action"
      CHECK ("action" IN ('create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'import', 'backup', 'restore'))
    `);

    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      ADD CONSTRAINT "CHK_audit_logs_entityType"
      CHECK ("entityType" IN ('USER', 'STUDENT', 'TEACHER', 'FAMILY', 'CLASS_GROUP', 'SUBJECT', 'EVALUATION', 'COMPETENCY', 'ACTIVITY', 'TASK', 'ATTENDANCE', 'MESSAGE', 'NOTIFICATION', 'CALENDAR_EVENT', 'GRADE', 'ACADEMIC_RECORD', 'EDUCATIONAL_RESOURCE', 'SETTING', 'RUBRIC', 'AUDIT_LOG', 'SECURITY_INCIDENT', 'BLOG_POST', 'BLOG_COMMENT'))
    `);

    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      ADD CONSTRAINT "CHK_audit_logs_result"
      CHECK ("result" IN ('success', 'failure', 'partial'))
    `);

    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      ADD CONSTRAINT "CHK_audit_logs_riskLevel"
      CHECK ("riskLevel" IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
    `);

    await queryRunner.query(`
      ALTER TABLE "security_incidents"
      ADD CONSTRAINT "CHK_security_incidents_type"
      CHECK ("type" IN ('BRUTE_FORCE', 'SUSPICIOUS_LOGIN', 'UNAUTHORIZED_ACCESS', 'DATA_BREACH', 'MALWARE', 'PHISHING', 'SQL_INJECTION', 'XSS', 'PRIVILEGE_ESCALATION', 'ACCOUNT_TAKEOVER', 'DDOS', 'OTHER'))
    `);

    await queryRunner.query(`
      ALTER TABLE "security_incidents"
      ADD CONSTRAINT "CHK_security_incidents_severity"
      CHECK ("severity" IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
    `);

    await queryRunner.query(`
      ALTER TABLE "security_incidents"
      ADD CONSTRAINT "CHK_security_incidents_status"
      CHECK ("status" IN ('open', 'investigating', 'resolved', 'false_positive'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_security_incidents_status_severity"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_time_risk"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_entity_composite"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_user_action"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_security_incidents_autoDetected"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_security_incidents_resolved"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_security_incidents_createdAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_security_incidents_ipAddress"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_security_incidents_affectedUserId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_security_incidents_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_security_incidents_severity"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_security_incidents_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_endpoint"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_riskLevel"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_createdAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_ipAddress"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_result"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_entityId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_entityType"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_action"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_userId"`);

    // Drop foreign key constraints
    await queryRunner.query(`ALTER TABLE "security_incidents" DROP CONSTRAINT IF EXISTS "FK_security_incidents_resolved_by"`);
    await queryRunner.query(`ALTER TABLE "security_incidents" DROP CONSTRAINT IF EXISTS "FK_security_incidents_affected_user"`);
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "FK_audit_logs_user"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "security_incidents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
  }
}