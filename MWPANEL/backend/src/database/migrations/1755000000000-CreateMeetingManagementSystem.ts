import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMeetingManagementSystem1755000000000 implements MigrationInterface {
  name = 'CreateMeetingManagementSystem1755000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enum para estado de reservas
    await queryRunner.query(`
      CREATE TYPE "meeting_booking_status_enum" AS ENUM (
        'confirmed', 
        'cancelled'
      )
    `);

    // Tabla principal de períodos de reuniones
    await queryRunner.query(`
      CREATE TABLE "meeting_periods" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "startDate" date NOT NULL,
        "endDate" date NOT NULL,
        "bookingDeadline" date NOT NULL,
        "description" text,
        "createdById" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_meeting_periods" PRIMARY KEY ("id")
      )
    `);

    // Tabla de slots de tiempo creados por profesores
    await queryRunner.query(`
      CREATE TABLE "meeting_slots" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "periodId" uuid NOT NULL,
        "teacherId" uuid NOT NULL,
        "startDatetime" TIMESTAMP NOT NULL,
        "durationMinutes" integer NOT NULL DEFAULT 30,
        "isAvailable" boolean NOT NULL DEFAULT true,
        "notes" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_meeting_slots" PRIMARY KEY ("id")
      )
    `);

    // Tabla de reservas de familias
    await queryRunner.query(`
      CREATE TABLE "meeting_bookings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "slotId" uuid NOT NULL,
        "familyId" uuid NOT NULL,
        "studentId" uuid NOT NULL,
        "bookingDate" TIMESTAMP NOT NULL DEFAULT now(),
        "status" "meeting_booking_status_enum" NOT NULL DEFAULT 'confirmed',
        "cancelledAt" TIMESTAMP,
        "cancelReason" text,
        "notes" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_meeting_bookings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_family_period_booking" UNIQUE ("familyId", "periodId")
      )
    `);

    // Añadir columna periodId a bookings para la constraint única
    await queryRunner.query(`
      ALTER TABLE "meeting_bookings" 
      ADD COLUMN "periodId" uuid
    `);

    // Foreign Keys
    await queryRunner.query(`
      ALTER TABLE "meeting_periods" 
      ADD CONSTRAINT "FK_meeting_periods_createdBy" 
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "meeting_slots" 
      ADD CONSTRAINT "FK_meeting_slots_period" 
      FOREIGN KEY ("periodId") REFERENCES "meeting_periods"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "meeting_slots" 
      ADD CONSTRAINT "FK_meeting_slots_teacher" 
      FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "meeting_bookings" 
      ADD CONSTRAINT "FK_meeting_bookings_slot" 
      FOREIGN KEY ("slotId") REFERENCES "meeting_slots"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "meeting_bookings" 
      ADD CONSTRAINT "FK_meeting_bookings_family" 
      FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "meeting_bookings" 
      ADD CONSTRAINT "FK_meeting_bookings_student" 
      FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "meeting_bookings" 
      ADD CONSTRAINT "FK_meeting_bookings_period" 
      FOREIGN KEY ("periodId") REFERENCES "meeting_periods"("id") ON DELETE CASCADE
    `);

    // Trigger para actualizar periodId automáticamente en bookings
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_booking_period_id()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE meeting_bookings 
        SET "periodId" = (
          SELECT "periodId" 
          FROM meeting_slots 
          WHERE id = NEW."slotId"
        )
        WHERE id = NEW.id;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trigger_update_booking_period_id
      AFTER INSERT ON meeting_bookings
      FOR EACH ROW EXECUTE FUNCTION update_booking_period_id();
    `);

    // Índices para optimización y validaciones
    await queryRunner.query(`CREATE INDEX "IDX_meeting_periods_isActive" ON "meeting_periods" ("isActive")`);
    await queryRunner.query(`CREATE INDEX "IDX_meeting_periods_dates" ON "meeting_periods" ("startDate", "endDate")`);
    await queryRunner.query(`CREATE INDEX "IDX_meeting_slots_teacher_period" ON "meeting_slots" ("teacherId", "periodId")`);
    await queryRunner.query(`CREATE INDEX "IDX_meeting_slots_datetime" ON "meeting_slots" ("startDatetime")`);
    await queryRunner.query(`CREATE INDEX "IDX_meeting_slots_available" ON "meeting_slots" ("isAvailable")`);
    await queryRunner.query(`CREATE INDEX "IDX_meeting_bookings_family_period" ON "meeting_bookings" ("familyId", "periodId")`);
    await queryRunner.query(`CREATE INDEX "IDX_meeting_bookings_status" ON "meeting_bookings" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_meeting_bookings_slot" ON "meeting_bookings" ("slotId")`);

    // Constraint único para evitar doble reserva del mismo slot
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_meeting_slot_confirmed_booking" ON "meeting_bookings" ("slotId") WHERE "status" = 'confirmed'`);

    // Constraint único para evitar solapamiento de slots del mismo profesor
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_teacher_slot_no_overlap" 
      ON "meeting_slots" ("teacherId", "startDatetime") 
      WHERE "isAvailable" = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers and functions
    await queryRunner.query(`DROP TRIGGER IF EXISTS trigger_update_booking_period_id ON meeting_bookings`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_booking_period_id()`);

    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE "meeting_bookings"`);
    await queryRunner.query(`DROP TABLE "meeting_slots"`);
    await queryRunner.query(`DROP TABLE "meeting_periods"`);
    
    // Drop enum
    await queryRunner.query(`DROP TYPE "meeting_booking_status_enum"`);
  }
}