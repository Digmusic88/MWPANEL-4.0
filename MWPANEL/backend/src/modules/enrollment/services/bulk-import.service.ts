import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EnrollmentService } from '../enrollment.service';
import { BulkEnrollmentRowDto, BulkImportResult, BulkImportError, BulkImportWarning, SimplifiedBulkEnrollmentRowDto, SimplifiedBulkImportResult } from '../dto/bulk-import.dto';
import { CreateEnrollmentDto } from '../dto/create-enrollment.dto';
import { User } from '../../users/entities/user.entity';
import { Student } from '../../students/entities/student.entity';
import { EducationalLevel } from '../../students/entities/educational-level.entity';
import { Course } from '../../students/entities/course.entity';
import { FamilyRelationship } from '../../users/entities/family.entity';
import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class BulkImportService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Student)
    private studentsRepository: Repository<Student>,
    @InjectRepository(EducationalLevel)
    private educationalLevelsRepository: Repository<EducationalLevel>,
    @InjectRepository(Course)
    private coursesRepository: Repository<Course>,
    private dataSource: DataSource,
    private enrollmentService: EnrollmentService,
  ) {}

  async processBulkImport(file: any): Promise<BulkImportResult> {
    const result: BulkImportResult = {
      totalRows: 0,
      successfulImports: 0,
      failedImports: 0,
      errors: [],
      warnings: [],
      importedStudents: [],
    };

    try {
      // Parse file based on extension
      const data = await this.parseFile(file);
      result.totalRows = data.length;

      // Pre-validate educational levels and courses
      const educationalLevels = await this.educationalLevelsRepository.find();
      const courses = await this.coursesRepository.find({ relations: ['cycle', 'cycle.educationalLevel'] });

      console.log('🎓 Available educational levels:', educationalLevels.map(l => `${l.name} (${l.id})`));
      console.log('📚 Available courses:', courses.map(c => `${c.name} (${c.id})`));

      // Process each row
      for (let i = 0; i < data.length; i++) {
        const rowNumber = i + 2; // +2 because Excel rows start at 1 and we have header
        const rowData = data[i];

        try {
          // Transform and validate row data
          const enrollmentRow = await this.validateAndTransformRow(rowData, rowNumber, educationalLevels, courses);
          
          if (!enrollmentRow) {
            result.failedImports++;
            continue;
          }

          // Convert to enrollment DTO format
          const enrollmentDto = this.convertToEnrollmentDto(enrollmentRow);

          // Process enrollment through existing service
          const enrollmentResult = await this.enrollmentService.processEnrollment(enrollmentDto);

          // Record successful import
          result.successfulImports++;
          result.importedStudents.push({
            rowNumber,
            studentName: `${enrollmentRow.studentFirstName} ${enrollmentRow.studentLastName}`,
            enrollmentNumber: enrollmentResult.student.enrollmentNumber,
            familyId: enrollmentResult.family.id,
          });

        } catch (error) {
          console.error(`❌ Error processing row ${rowNumber}:`, error);
          console.error(`📝 Row data:`, JSON.stringify(rowData, null, 2));
          result.failedImports++;
          result.errors.push({
            rowNumber,
            message: error.message || 'Error desconocido durante el procesamiento',
            originalData: rowData,
          });
        }
      }

      return result;

    } catch (error) {
      throw new BadRequestException(`Error procesando archivo: ${error.message}`);
    }
  }

  private async parseFile(file: any): Promise<any[]> {
    // Handle CSV files with proper UTF-8 encoding
    let workbook;
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      // For CSV files, try multiple encoding approaches
      console.log('🔍 File details:', { 
        mimetype: file.mimetype, 
        originalname: file.originalname, 
        size: file.size 
      });
      
      // Try UTF-8 first
      let csvContent = file.buffer.toString('utf8');
      console.log('📄 CSV content (UTF-8, first 200 chars):', csvContent.substring(0, 200));
      
      // If we detect encoding issues, try other approaches
      if (csvContent.includes('Ã³') || csvContent.includes('Ã¡') || csvContent.includes('Ãº')) {
        console.log('⚠️ Detected potential encoding issue, trying latin1...');
        csvContent = file.buffer.toString('latin1');
        console.log('📄 CSV content (latin1, first 200 chars):', csvContent.substring(0, 200));
        
        // If still problematic, try iso-8859-1
        if (csvContent.includes('Ã³') || csvContent.includes('Ã¡') || csvContent.includes('Ãº')) {
          console.log('⚠️ Still problematic, trying binary approach...');
          // Try reading as binary and converting
          const uint8Array = new Uint8Array(file.buffer);
          const decoder = new TextDecoder('utf-8', { fatal: false });
          csvContent = decoder.decode(uint8Array);
          console.log('📄 CSV content (TextDecoder, first 200 chars):', csvContent.substring(0, 200));
        }
      }
      
      workbook = XLSX.read(csvContent, { 
        type: 'string',
        codepage: 65001, // UTF-8 codepage
        raw: false
      });
    } else {
      // For Excel files
      workbook = XLSX.read(file.buffer, { 
        type: 'buffer',
        codepage: 65001, // UTF-8 codepage
        raw: false
      });
    }
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with headers
    const data = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: '',
      blankrows: false
    });

    if (data.length < 2) {
      throw new BadRequestException('El archivo debe contener al menos una fila de datos además de la cabecera');
    }

    // Get headers and data rows
    const headers = data[0] as string[];
    const rows = data.slice(1);

    // Convert to object format
    return rows.map(row => {
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[this.normalizeColumnName(header)] = row[index] || '';
      });
      return obj;
    });
  }

  private normalizeColumnName(columnName: string): string {
    // Normalize column names to match our DTO properties
    const columnMap: { [key: string]: string } = {
      // Student fields
      'nombre del estudiante': 'studentFirstName',
      'apellidos del estudiante': 'studentLastName',
      'email del estudiante': 'studentEmail',
      'contraseña del estudiante': 'studentPassword',
      'fecha de nacimiento del estudiante': 'studentBirthDate',
      'dni/nie del estudiante': 'studentDocumentNumber',
      'teléfono del estudiante': 'studentPhone',
      'número de matrícula': 'enrollmentNumber',
      'nivel educativo': 'educationalLevelId',
      'curso': 'courseId',
      
      // Primary contact fields
      'nombre del contacto principal': 'primaryFirstName',
      'apellidos del contacto principal': 'primaryLastName',
      'email del contacto principal': 'primaryEmail',
      'contraseña del contacto principal': 'primaryPassword',
      'teléfono del contacto principal': 'primaryPhone',
      'dni/nie del contacto principal': 'primaryDocumentNumber',
      'fecha de nacimiento del contacto principal': 'primaryDateOfBirth',
      'dirección del contacto principal': 'primaryAddress',
      'ocupación del contacto principal': 'primaryOccupation',
      'relación con el estudiante (principal)': 'relationshipToPrimary',
      
      // Secondary contact fields
      '¿tiene contacto secundario?': 'hasSecondaryContact',
      'nombre del contacto secundario': 'secondaryFirstName',
      'apellidos del contacto secundario': 'secondaryLastName',
      'email del contacto secundario': 'secondaryEmail',
      'contraseña del contacto secundario': 'secondaryPassword',
      'teléfono del contacto secundario': 'secondaryPhone',
      'dni/nie del contacto secundario': 'secondaryDocumentNumber',
      'fecha de nacimiento del contacto secundario': 'secondaryDateOfBirth',
      'dirección del contacto secundario': 'secondaryAddress',
      'ocupación del contacto secundario': 'secondaryOccupation',
      'relación con el estudiante (secundario)': 'relationshipToSecondary',
    };

    const normalizedKey = columnName.toLowerCase().trim();
    return columnMap[normalizedKey] || columnName.replace(/\s+/g, '');
  }

  private async validateAndTransformRow(
    rowData: any, 
    rowNumber: number, 
    educationalLevels: EducationalLevel[], 
    courses: Course[]
  ): Promise<BulkEnrollmentRowDto | null> {
    console.log(`🔍 Validating row ${rowNumber}:`, JSON.stringify(rowData, null, 2));
    
    if (!rowData || Object.keys(rowData).length === 0) {
      console.log(`⚠️ Row ${rowNumber} is empty, skipping`);
      return null;
    }
    
    // Transform educational level name to ID
    if (rowData.educationalLevelId && typeof rowData.educationalLevelId === 'string') {
      // Normalize both strings to handle Unicode issues
      const normalizeText = (text: string) => text
        .toLowerCase()
        .trim()
        .normalize('NFD') // Decompose accented characters
        .replace(/[\u0300-\u036f]/g, '') // Remove accent marks
        .replace(/\s+/g, ' '); // Normalize spaces

      const inputLevel = normalizeText(rowData.educationalLevelId);
      console.log(`🔍 Looking for educational level: "${rowData.educationalLevelId}" (normalized: "${inputLevel}")`);
      
      const level = educationalLevels.find(l => {
        const dbLevel = normalizeText(l.name);
        console.log(`  📝 Comparing with: "${l.name}" (normalized: "${dbLevel}")`);
        return dbLevel === inputLevel;
      });
      
      if (level) {
        console.log(`✅ Found matching level: ${level.name} (${level.id})`);
        rowData.educationalLevelId = level.id;
      } else {
        console.log(`❌ No match found for: ${rowData.educationalLevelId}`);
        console.log(`Available levels: ${educationalLevels.map(l => l.name).join(', ')}`);
        throw new Error(`Nivel educativo no encontrado: ${rowData.educationalLevelId}`);
      }
    }

    // Transform course name to ID
    if (rowData.courseId && typeof rowData.courseId === 'string') {
      // Use the same normalization function
      const normalizeText = (text: string) => text
        .toLowerCase()
        .trim()
        .normalize('NFD') // Decompose accented characters
        .replace(/[\u0300-\u036f]/g, '') // Remove accent marks
        .replace(/\s+/g, ' '); // Normalize spaces

      const inputCourse = normalizeText(rowData.courseId);
      console.log(`🔍 Looking for course: "${rowData.courseId}" (normalized: "${inputCourse}")`);
      
      const course = courses.find(c => {
        const dbCourse = normalizeText(c.name);
        console.log(`  📝 Comparing with: "${c.name}" (normalized: "${dbCourse}")`);
        return dbCourse === inputCourse;
      });
      
      if (course) {
        console.log(`✅ Found matching course: ${course.name} (${course.id})`);
        rowData.courseId = course.id;
      } else {
        console.log(`❌ No match found for course: ${rowData.courseId}`);
        console.log(`Available courses: ${courses.map(c => c.name).join(', ')}`);
        throw new Error(`Curso no encontrado: ${rowData.courseId}`);
      }
    }

    // Handle boolean conversion for hasSecondaryContact
    if (rowData.hasSecondaryContact) {
      const value = String(rowData.hasSecondaryContact).toLowerCase();
      rowData.hasSecondaryContact = ['sí', 'si', 'yes', 'true', '1'].includes(value);
    }

    // Transform relationship values to valid enum values
    if (rowData.relationshipToPrimary && typeof rowData.relationshipToPrimary === 'string') {
      const relationshipMap: { [key: string]: string } = {
        // English values
        'mother': 'parent',
        'father': 'parent', 
        'mom': 'parent',
        'dad': 'parent',
        'parent': 'parent',
        'guardian': 'guardian',
        'tutor': 'guardian',
        'legal guardian': 'guardian',
        'other': 'other',
        // Spanish values
        'madre': 'parent',
        'padre': 'parent',
        'mamá': 'parent',
        'papá': 'parent',
        'progenitor': 'parent',
        'tutor legal': 'guardian',
        'guardián': 'guardian',
        'otro': 'other',
      };

      const normalizedRelationship = rowData.relationshipToPrimary.toLowerCase().trim();
      console.log(`🔍 Looking for relationship: "${rowData.relationshipToPrimary}" (normalized: "${normalizedRelationship}")`);
      
      if (relationshipMap[normalizedRelationship]) {
        const mappedValue = relationshipMap[normalizedRelationship];
        console.log(`✅ Mapped relationship "${rowData.relationshipToPrimary}" to "${mappedValue}"`);
        rowData.relationshipToPrimary = mappedValue;
      } else {
        console.log(`❌ Unknown relationship value: ${rowData.relationshipToPrimary}`);
        console.log(`✅ Accepted values: ${Object.keys(relationshipMap).join(', ')}`);
        throw new Error(`Relación familiar no válida: "${rowData.relationshipToPrimary}". Valores aceptados: mother, father, parent, guardian, tutor, other, madre, padre, mamá, papá, etc.`);
      }
    }

    // Transform secondary relationship values to valid enum values (if present)
    if (rowData.relationshipToSecondary && typeof rowData.relationshipToSecondary === 'string') {
      const relationshipMap: { [key: string]: string } = {
        // English values
        'mother': 'parent', 'father': 'parent', 'mom': 'parent', 'dad': 'parent', 'parent': 'parent',
        'guardian': 'guardian', 'tutor': 'guardian', 'legal guardian': 'guardian', 'other': 'other',
        // Spanish values
        'madre': 'parent', 'padre': 'parent', 'mamá': 'parent', 'papá': 'parent', 'progenitor': 'parent',
        'tutor legal': 'guardian', 'guardián': 'guardian', 'otro': 'other',
      };

      const normalizedRelationship = rowData.relationshipToSecondary.toLowerCase().trim();
      console.log(`🔍 Looking for secondary relationship: "${rowData.relationshipToSecondary}" (normalized: "${normalizedRelationship}")`);
      
      if (relationshipMap[normalizedRelationship]) {
        const mappedValue = relationshipMap[normalizedRelationship];
        console.log(`✅ Mapped secondary relationship "${rowData.relationshipToSecondary}" to "${mappedValue}"`);
        rowData.relationshipToSecondary = mappedValue;
      } else {
        console.log(`❌ Unknown secondary relationship value: ${rowData.relationshipToSecondary}`);
        throw new Error(`Relación familiar secundaria no válida: "${rowData.relationshipToSecondary}". Valores aceptados: mother, father, parent, guardian, tutor, other, madre, padre, etc.`);
      }
    }

    // Create DTO instance with minimal validation (for debugging)
    const enrollmentRow = plainToClass(BulkEnrollmentRowDto, rowData);
    
    // Minimal validation - only check required fields manually
    if (!rowData.studentFirstName || !rowData.studentLastName || !rowData.studentEmail || !rowData.studentPassword) {
      throw new Error(`Errores de validación en fila ${rowNumber}: Faltan datos obligatorios del estudiante (nombre, apellidos, email, contraseña)`);
    }
    
    if (!rowData.primaryFirstName || !rowData.primaryEmail || !rowData.primaryPassword) {
      throw new Error(`Errores de validación en fila ${rowNumber}: Faltan datos obligatorios del progenitor principal (nombre, email, contraseña)`);
    }

    console.log(`✅ DTO created for row ${rowNumber} with validation passed:`, {
      relationshipToPrimary: enrollmentRow.relationshipToPrimary,
      relationshipToSecondary: enrollmentRow.relationshipToSecondary,
      hasSecondaryContact: enrollmentRow.hasSecondaryContact
    });

    return enrollmentRow;
  }

  private mapRelationshipValue(relationship: string): FamilyRelationship {
    // Map relationship values to valid enum values
    const relationshipMap: { [key: string]: string } = {
      // English values
      'mother': 'parent', 'father': 'parent', 'mom': 'parent', 'dad': 'parent', 'parent': 'parent',
      'guardian': 'guardian', 'tutor legal': 'guardian', 'legal guardian': 'guardian', 'other': 'other',
      // Spanish values  
      'madre': 'parent', 'padre': 'parent', 'mamá': 'parent', 'papá': 'parent', 'progenitor': 'parent',
      'guardián': 'guardian', 'otro': 'other',
    };

    const normalizedRelationship = relationship.toLowerCase().trim();
    const mappedRelationship = relationshipMap[normalizedRelationship] || relationship;
    
    console.log(`🔗 Bulk import - mapping relationship: "${relationship}" → "${mappedRelationship}"`);
    return mappedRelationship as FamilyRelationship;
  }

  private convertToEnrollmentDto(rowData: BulkEnrollmentRowDto): CreateEnrollmentDto {
    return {
      student: {
        firstName: rowData.studentFirstName,
        lastName: rowData.studentLastName,
        email: rowData.studentEmail,
        password: rowData.studentPassword,
        birthDate: rowData.studentBirthDate, // Can be undefined for optional birth date
        documentNumber: rowData.studentDocumentNumber,
        phone: rowData.studentPhone,
        enrollmentNumber: rowData.enrollmentNumber,
        educationalLevelId: rowData.educationalLevelId,
        courseId: rowData.courseId,
        classGroupIds: [],
      },
      family: {
        primaryContact: {
          firstName: rowData.primaryFirstName,
          lastName: rowData.primaryLastName || '', // Provide default empty string if undefined
          email: rowData.primaryEmail,
          password: rowData.primaryPassword,
          phone: rowData.primaryPhone,
          documentNumber: rowData.primaryDocumentNumber,
          dateOfBirth: rowData.primaryDateOfBirth,
          address: rowData.primaryAddress,
          occupation: rowData.primaryOccupation,
        },
        ...(rowData.hasSecondaryContact && rowData.secondaryEmail && {
          secondaryContact: {
            firstName: rowData.secondaryFirstName || '',
            lastName: rowData.secondaryLastName || '',
            email: rowData.secondaryEmail,
            password: rowData.secondaryPassword || 'defaultpass123',
            phone: rowData.secondaryPhone || '',
            documentNumber: rowData.secondaryDocumentNumber,
            dateOfBirth: rowData.secondaryDateOfBirth,
            address: rowData.secondaryAddress,
            occupation: rowData.secondaryOccupation,
          },
        }),
        relationship: this.mapRelationshipValue(rowData.relationshipToPrimary),
      },
    } as CreateEnrollmentDto;
  }

  async generateTemplate(): Promise<Buffer> {
    // Load dynamic data from database
    const educationalLevels = await this.educationalLevelsRepository.find();
    const courses = await this.coursesRepository.find({ relations: ['cycle', 'cycle.educationalLevel'] });
    
    // Organize courses by educational level
    const coursesByLevel = {
      'Educación Infantil': courses.filter(c => c.cycle.educationalLevel.name === 'Educación Infantil').map(c => c.name),
      'Educación Primaria': courses.filter(c => c.cycle.educationalLevel.name === 'Educación Primaria').map(c => c.name),
      'Educación Secundaria Obligatoria': courses.filter(c => c.cycle.educationalLevel.name === 'Educación Secundaria Obligatoria').map(c => c.name)
    };

    // Use XLSX since ExcelJS is not available in container
    return this.generateTemplateWithXLSX(educationalLevels, courses);
  }

  private async generateTemplateWithDropdowns(educationalLevels: EducationalLevel[], courses: Course[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Plantilla Inscripción');
    
    // Headers with optional fields marked
    const headers = [
      'Nombre del Estudiante',
      'Apellidos del Estudiante', 
      'Email del Estudiante',
      'Contraseña del Estudiante',
      'Fecha de Nacimiento del Estudiante (opcional)',
      'DNI/NIE del Estudiante (opcional)',
      'Teléfono del Estudiante (opcional)',
      'Número de Matrícula (opcional)',
      'Nivel Educativo',
      'Curso (opcional)',
      'Nombre del Contacto Principal',
      'Apellidos del Contacto Principal (opcional)',
      'Email del Contacto Principal',
      'Contraseña del Contacto Principal',
      'Teléfono del Contacto Principal',
      'DNI/NIE del Contacto Principal (opcional)',
      'Fecha de Nacimiento del Contacto Principal (opcional)',
      'Dirección del Contacto Principal (opcional)',
      'Ocupación del Contacto Principal (opcional)',
      'Relación con el Estudiante (Principal)',
      '¿Tiene Contacto Secundario?',
      'Nombre del Contacto Secundario (opcional)',
      'Apellidos del Contacto Secundario (opcional)',
      'Email del Contacto Secundario (opcional)',
      'Contraseña del Contacto Secundario (opcional)',
      'Teléfono del Contacto Secundario (opcional)',
      'DNI/NIE del Contacto Secundario (opcional)',
      'Fecha de Nacimiento del Contacto Secundario (opcional)',
      'Dirección del Contacto Secundario (opcional)',
      'Ocupación del Contacto Secundario (opcional)',
      'Relación con el Estudiante (Secundario) (opcional)',
    ];

    // Add headers
    worksheet.addRow(headers);
    
    // Style headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '366092' } };
    headerRow.height = 20;
    
    // Set column widths
    headers.forEach((_, index) => {
      worksheet.getColumn(index + 1).width = 25;
    });

    // Add example rows showing different scenarios
    const exampleRow1 = [
      'Sofia Isabel',
      'Martínez Rodriguez',
      'sofia.martinez@ejemplo.com',
      'password123',
      '2011-03-22',
      '98765432B',
      '677654321',
      '', // Auto-generated enrollment number
      'Educación Primaria',
      '2º Primaria',
      'Carmen',
      'Rodriguez López',
      'carmen.rodriguez@ejemplo.com',
      'password123',
      '655443322',
      '11223344D',
      '1983-11-15',
      'Avenida de la Paz 45, Barcelona',
      'Médica',
      'parent',
      'Sí',
      'Miguel',
      '', // Apellido opcional para progenitor 2
      'miguel.martinez@ejemplo.com',
      'password123',
      '688776655',
      '55667788E',
      '1980-07-08',
      'Avenida de la Paz 45, Barcelona',
      'Arquitecto',
      'father',
    ];

    // Example showing family with only one parent and no birth date
    const exampleRow2 = [
      'Luis Carlos',
      'González Pérez',
      'luis.gonzalez@ejemplo.com',
      'password123',
      '', // Fecha nacimiento vacía - opcional
      '87654321C',
      '622998877',
      '', // Auto-generated enrollment number
      'Educación Secundaria Obligatoria',
      '1º ESO',
      'Ana María',
      '', // Apellido opcional para progenitor principal
      'ana.maria@ejemplo.com',
      'password123',
      '611223344',
      '22334455F',
      '', // Fecha nacimiento vacía - opcional
      'Calle Mayor 123, Madrid',
      'Profesora',
      'parent',
      'No', // Sin contacto secundario
      '', // Nombre vacío
      '', // Apellido vacío
      '', // Email vacío - no se creará cuenta
      '', // Password vacío
      '', // Teléfono vacío
      '', // Documento vacío
      '', // Fecha nacimiento vacía
      '', // Dirección vacía
      '', // Ocupación vacía
      '', // Relación vacía
    ];
    worksheet.addRow(exampleRow1);
    worksheet.addRow(exampleRow2);

    // Add 9 more empty rows for data entry
    for (let i = 0; i < 9; i++) {
      worksheet.addRow(new Array(headers.length).fill(''));
    }

    // Add data validations (dropdowns)
    const educationalLevelNames = educationalLevels.map(el => el.name);
    const allCourses = courses.map(c => c.name);
    const relationships = ['parent', 'guardian', 'other'];
    const yesNoOptions = ['Sí', 'No'];

    // Educational Level dropdown (column I, rows 2-11)
    worksheet.getColumn(9).eachCell({ includeEmpty: false }, (cell, rowNumber) => {
      if (rowNumber > 1 && rowNumber <= 11) {
        cell.dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: [`"${educationalLevelNames.join(',')}"`],
          showErrorMessage: true,
          errorStyle: 'error',
          errorTitle: 'Valor Inválido',
          error: 'Debe seleccionar un nivel educativo válido de la lista',
          showInputMessage: true,
          promptTitle: 'Nivel Educativo',
          prompt: 'Seleccione un nivel educativo'
        };
      }
    });

    // Course dropdown (column J, rows 2-11)
    worksheet.getColumn(10).eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      if (rowNumber > 1 && rowNumber <= 11) {
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"${allCourses.join(',')}"`],
          showErrorMessage: true,
          errorStyle: 'error',
          errorTitle: 'Valor Inválido',
          error: 'Debe seleccionar un curso válido de la lista',
          showInputMessage: true,
          promptTitle: 'Curso',
          prompt: 'Seleccione un curso (opcional)'
        };
      }
    });

    // Primary relationship dropdown (column T, rows 2-11)
    worksheet.getColumn(20).eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      if (rowNumber > 1 && rowNumber <= 11) {
        cell.dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: [`"${relationships.join(',')}"`],
          showErrorMessage: true,
          errorStyle: 'error',
          errorTitle: 'Valor Inválido',
          error: 'Debe seleccionar una relación válida',
          showInputMessage: true,
          promptTitle: 'Relación Familiar',
          prompt: 'Seleccione la relación con el estudiante'
        };
      }
    });

    // Secondary contact yes/no dropdown (column U, rows 2-11)
    worksheet.getColumn(21).eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      if (rowNumber > 1 && rowNumber <= 11) {
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"${yesNoOptions.join(',')}"`],
          showErrorMessage: true,
          errorStyle: 'error',
          errorTitle: 'Valor Inválido',
          error: 'Debe seleccionar Sí o No',
          showInputMessage: true,
          promptTitle: 'Contacto Secundario',
          prompt: '¿Tiene contacto secundario?'
        };
      }
    });

    // Secondary relationship dropdown (column AE, rows 2-11)
    worksheet.getColumn(31).eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      if (rowNumber > 1 && rowNumber <= 11) {
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"${relationships.join(',')}"`],
          showErrorMessage: true,
          errorStyle: 'error',
          errorTitle: 'Valor Inválido',
          error: 'Debe seleccionar una relación válida',
          showInputMessage: true,
          promptTitle: 'Relación Familiar Secundaria',
          prompt: 'Seleccione la relación del contacto secundario'
        };
      }
    });

    // Add instructions worksheet
    this.addInstructionsWorksheet(workbook);
    
    // Add values reference worksheet  
    this.addValuesReferenceWorksheet(workbook, educationalLevels, courses);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private addInstructionsWorksheet(workbook: ExcelJS.Workbook) {
    const instructionsWs = workbook.addWorksheet('Instrucciones');
    
    const instructionsHeaders = ['Campo', 'Descripción', 'Obligatorio', 'Tipo de Input'];
    const instructions = [
      ['Nombre del Estudiante', 'Nombre propio del estudiante', 'Sí', 'Texto libre'],
      ['Apellidos del Estudiante', 'Apellidos completos del estudiante', 'Sí', 'Texto libre'],
      ['Email del Estudiante', 'Correo electrónico único del estudiante', 'Sí', 'Texto libre (formato email)'],
      ['Contraseña del Estudiante', 'Contraseña de acceso (mínimo 6 caracteres)', 'Sí', 'Texto libre'],
      ['Fecha de Nacimiento del Estudiante', 'Fecha de nacimiento', 'No', 'Texto libre (formato YYYY-MM-DD, opcional)'],
      ['DNI/NIE del Estudiante', 'Documento de identidad', 'No', 'Texto libre'],
      ['Teléfono del Estudiante', 'Número de teléfono', 'No', 'Texto libre'],
      ['Número de Matrícula', 'Se genera automáticamente si se deja vacío', 'No', 'Texto libre (opcional)'],
      ['Nivel Educativo', 'Nivel educativo del estudiante', 'Sí', '📋 DROPDOWN SELECCIONABLE'],
      ['Curso', 'Curso específico dentro del nivel', 'No', '📋 DROPDOWN SELECCIONABLE'],
      ['Nombre del Contacto Principal', 'Nombre del primer contacto familiar', 'Sí', 'Texto libre'],
      ['Apellidos del Contacto Principal', 'Apellidos del primer contacto familiar', 'No', 'Texto libre (opcional)'],
      ['Email del Contacto Principal', 'Email único del contacto principal', 'Sí', 'Texto libre (formato email)'],
      ['Contraseña del Contacto Principal', 'Contraseña de acceso (mínimo 6 caracteres)', 'Sí', 'Texto libre'],
      ['Teléfono del Contacto Principal', 'Teléfono del contacto principal', 'Sí', 'Texto libre'],
      ['DNI/NIE del Contacto Principal', 'Documento del contacto principal', 'No', 'Texto libre'],
      ['Fecha de Nacimiento del Contacto Principal', 'Fecha de nacimiento del contacto', 'No', 'Texto libre (formato YYYY-MM-DD)'],
      ['Dirección del Contacto Principal', 'Dirección de residencia', 'No', 'Texto libre'],
      ['Ocupación del Contacto Principal', 'Profesión u ocupación', 'No', 'Texto libre'],
      ['Relación con el Estudiante (Principal)', 'Relación familiar', 'Sí', '📋 DROPDOWN SELECCIONABLE'],
      ['¿Tiene Contacto Secundario?', 'Indica si hay un segundo contacto', 'No', '📋 DROPDOWN SELECCIONABLE (Sí/No)'],
      ['Nombre del Contacto Secundario', 'Nombre del segundo contacto', 'Opcional', 'Texto libre (opcional)'],
      ['Apellidos del Contacto Secundario', 'Apellidos del segundo contacto', 'Opcional', 'Texto libre (opcional)'],
      ['Email del Contacto Secundario', 'Email del segundo contacto - IMPORTANTE: Sin email NO se crea cuenta', 'Opcional', 'Texto libre (formato email, opcional)'],
      ['Contraseña del Contacto Secundario', 'Contraseña del segundo contacto - Solo si hay email', 'Opcional', 'Texto libre (opcional)'],
      ['Teléfono del Contacto Secundario', 'Teléfono del segundo contacto', 'Opcional', 'Texto libre (opcional)'],
      ['DNI/NIE del Contacto Secundario', 'Documento del segundo contacto', 'Opcional', 'Texto libre (opcional)'],
      ['Fecha de Nacimiento del Contacto Secundario', 'Fecha de nacimiento del segundo contacto', 'Opcional', 'Texto libre (formato YYYY-MM-DD, opcional)'],
      ['Dirección del Contacto Secundario', 'Dirección del segundo contacto', 'Opcional', 'Texto libre (opcional)'],
      ['Ocupación del Contacto Secundario', 'Profesión del segundo contacto', 'Opcional', 'Texto libre (opcional)'],
      ['Relación con el Estudiante (Secundario)', 'Relación del segundo contacto', 'Opcional', '📋 DROPDOWN SELECCIONABLE (opcional)'],
    ];

    // Add headers
    instructionsWs.addRow(instructionsHeaders);
    
    // Style headers
    const headerRow = instructionsWs.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '5B9BD5' } };
    
    // Add instructions
    instructions.forEach(instruction => {
      instructionsWs.addRow(instruction);
    });

    // Set column widths
    instructionsWs.getColumn(1).width = 30;
    instructionsWs.getColumn(2).width = 50;
    instructionsWs.getColumn(3).width = 15;
    instructionsWs.getColumn(4).width = 40;
  }

  private addValuesReferenceWorksheet(workbook: ExcelJS.Workbook, educationalLevels: EducationalLevel[], courses: Course[]) {
    const referenceWs = workbook.addWorksheet('Valores Válidos');
    
    const referenceHeaders = ['Tipo de Campo', 'Valores Disponibles en Dropdown', 'Notas'];
    const referenceData = [
      ['📋 Niveles Educativos', 'Educación Infantil', 'Dropdown automático en columna I'],
      ['', 'Educación Primaria', ''],
      ['', 'Educación Secundaria Obligatoria', ''],
      ['', '', ''],
      ['📋 Cursos - Infantil', '', 'Dropdown automático en columna J'],
      ...courses.filter(c => c.cycle?.educationalLevel?.name === 'Educación Infantil').map(c => ['', c.name, '']),
      ['', '', ''],
      ['📋 Cursos - Primaria', '', ''],
      ...courses.filter(c => c.cycle?.educationalLevel?.name === 'Educación Primaria').map(c => ['', c.name, '']),
      ['', '', ''],
      ['📋 Cursos - Secundaria', '', ''],
      ...courses.filter(c => c.cycle?.educationalLevel?.name === 'Educación Secundaria Obligatoria').map(c => ['', c.name, '']),
      ['', '', ''],
      ['📋 Relaciones Familiares', 'parent', 'Dropdown en columnas T y AE'],
      ['', 'guardian', ''],
      ['', 'other', ''],
      ['', '', ''],
      ['📋 Contacto Secundario', 'Sí', 'Dropdown en columna U'],
      ['', 'No', ''],
      ['', '', ''],
      ['ℹ️ INSTRUCCIONES', 'Los campos marcados con 📋 tienen', 'Haga clic en la celda y aparecerá'],
      ['', 'dropdown automático. NO escriba,', 'una flecha para seleccionar'],
      ['', 'solo seleccione de la lista.', 'el valor correcto.'],
    ];

    // Add headers
    referenceWs.addRow(referenceHeaders);
    
    // Style headers
    const headerRow = referenceWs.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '70AD47' } };
    
    // Add data
    referenceData.forEach(data => {
      referenceWs.addRow(data);
    });

    // Set column widths
    referenceWs.getColumn(1).width = 25;
    referenceWs.getColumn(2).width = 40;
    referenceWs.getColumn(3).width = 40;
  }

  private generateTemplateWithXLSX(educationalLevels: EducationalLevel[], courses: Course[]): Buffer {
    const headers = [
      'Nombre del Estudiante',
      'Apellidos del Estudiante', 
      'Email del Estudiante',
      'Contraseña del Estudiante',
      'Fecha de Nacimiento del Estudiante (opcional)',
      'DNI/NIE del Estudiante',
      'Teléfono del Estudiante',
      'Número de Matrícula',
      'Nivel Educativo',
      'Curso',
      'Nombre del Contacto Principal',
      'Apellidos del Contacto Principal',
      'Email del Contacto Principal',
      'Contraseña del Contacto Principal',
      'Teléfono del Contacto Principal',
      'DNI/NIE del Contacto Principal',
      'Fecha de Nacimiento del Contacto Principal',
      'Dirección del Contacto Principal',
      'Ocupación del Contacto Principal',
      'Relación con el Estudiante (Principal)',
      '¿Tiene Contacto Secundario?',
      'Nombre del Contacto Secundario',
      'Apellidos del Contacto Secundario',
      'Email del Contacto Secundario',
      'Contraseña del Contacto Secundario',
      'Teléfono del Contacto Secundario',
      'DNI/NIE del Contacto Secundario',
      'Fecha de Nacimiento del Contacto Secundario',
      'Dirección del Contacto Secundario',
      'Ocupación del Contacto Secundario',
      'Relación con el Estudiante (Secundario)',
    ];

    const exampleRow = [
      'Sofia Isabel',
      'Martínez Rodriguez',
      'sofia.martinez@ejemplo.com',
      'password123',
      '2011-03-22',
      '98765432B',
      '677654321',
      '', // Auto-generated enrollment number
      'Educación Primaria',
      '2º Primaria',
      'Carmen',
      'Rodriguez López',
      'carmen.rodriguez@ejemplo.com',
      'password123',
      '655443322',
      '11223344D',
      '1983-11-15',
      'Avenida de la Paz 45, Barcelona',
      'Médica',
      'parent',
      'Sí',
      'Miguel',
      'Martínez Ruiz',
      'miguel.martinez@ejemplo.com',
      'password123',
      '688776655',
      '55667788E',
      '1980-07-08',
      'Avenida de la Paz 45, Barcelona',
      'Arquitecto',
      'father',
    ];

    // Create main worksheet
    const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
    
    // Set column widths
    const colWidths = headers.map(() => ({ wch: 25 }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Inscripción');

    // Add instructions sheet
    const instructionsHeaders = ['Campo', 'Descripción', 'Obligatorio', 'Tipo de Input'];
    const instructions = [
      ['Nombre del Estudiante', 'Nombre propio del estudiante', 'Sí', 'Texto libre'],
      ['Apellidos del Estudiante', 'Apellidos completos del estudiante', 'Sí', 'Texto libre'],
      ['Email del Estudiante', 'Correo electrónico único del estudiante', 'Sí', 'Texto libre (formato email)'],
      ['Contraseña del Estudiante', 'Contraseña de acceso (mínimo 6 caracteres)', 'Sí', 'Texto libre'],
      ['Fecha de Nacimiento del Estudiante', 'Fecha de nacimiento', 'No', 'Texto libre (formato YYYY-MM-DD, opcional)'],
      ['DNI/NIE del Estudiante', 'Documento de identidad', 'No', 'Texto libre'],
      ['Teléfono del Estudiante', 'Número de teléfono', 'No', 'Texto libre'],
      ['Número de Matrícula', 'Se genera automáticamente si se deja vacío', 'No', 'Texto libre (opcional)'],
      ['Nivel Educativo', 'Nivel educativo del estudiante', 'Sí', '⚠️ USAR VALORES EXACTOS DE HOJA 3'],
      ['Curso', 'Curso específico dentro del nivel', 'No', '⚠️ USAR VALORES EXACTOS DE HOJA 3'],
      ['Nombre del Contacto Principal', 'Nombre del primer contacto familiar', 'Sí', 'Texto libre'],
      ['Apellidos del Contacto Principal', 'Apellidos del primer contacto familiar', 'Sí', 'Texto libre'],
      ['Email del Contacto Principal', 'Email único del contacto principal', 'Sí', 'Texto libre (formato email)'],
      ['Contraseña del Contacto Principal', 'Contraseña de acceso (mínimo 6 caracteres)', 'Sí', 'Texto libre'],
      ['Teléfono del Contacto Principal', 'Teléfono del contacto principal', 'Sí', 'Texto libre'],
      ['DNI/NIE del Contacto Principal', 'Documento del contacto principal', 'No', 'Texto libre'],
      ['Fecha de Nacimiento del Contacto Principal', 'Fecha de nacimiento del contacto', 'No', 'Texto libre (formato YYYY-MM-DD)'],
      ['Dirección del Contacto Principal', 'Dirección de residencia', 'No', 'Texto libre'],
      ['Ocupación del Contacto Principal', 'Profesión u ocupación', 'No', 'Texto libre'],
      ['Relación con el Estudiante (Principal)', 'Relación familiar', 'Sí', '⚠️ USAR: parent, guardian, other'],
      ['¿Tiene Contacto Secundario?', 'Indica si hay un segundo contacto', 'No', '⚠️ USAR: Sí o No'],
      ['Nombre del Contacto Secundario', 'Nombre del segundo contacto', 'Solo si tiene contacto secundario', 'Texto libre'],
      ['Apellidos del Contacto Secundario', 'Apellidos del segundo contacto', 'Solo si tiene contacto secundario', 'Texto libre'],
      ['Email del Contacto Secundario', 'Email del segundo contacto', 'Solo si tiene contacto secundario', 'Texto libre (formato email)'],
      ['Contraseña del Contacto Secundario', 'Contraseña del segundo contacto', 'Solo si tiene contacto secundario', 'Texto libre'],
      ['Teléfono del Contacto Secundario', 'Teléfono del segundo contacto', 'Solo si tiene contacto secundario', 'Texto libre'],
      ['DNI/NIE del Contacto Secundario', 'Documento del segundo contacto', 'Solo si tiene contacto secundario', 'Texto libre'],
      ['Fecha de Nacimiento del Contacto Secundario', 'Fecha de nacimiento del segundo contacto', 'Solo si tiene contacto secundario', 'Texto libre (formato YYYY-MM-DD)'],
      ['Dirección del Contacto Secundario', 'Dirección del segundo contacto', 'Solo si tiene contacto secundario', 'Texto libre'],
      ['Ocupación del Contacto Secundario', 'Profesión del segundo contacto', 'Solo si tiene contacto secundario', 'Texto libre'],
      ['Relación con el Estudiante (Secundario)', 'Relación del segundo contacto', 'Solo si tiene contacto secundario', '⚠️ USAR: parent, guardian, other'],
    ];

    const instructionsWs = XLSX.utils.aoa_to_sheet([instructionsHeaders, ...instructions]);
    instructionsWs['!cols'] = [{ wch: 30 }, { wch: 50 }, { wch: 15 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instrucciones');

    // Add reference sheet with valid values from database
    const referenceHeaders = ['🔍 Tipo de Campo', '✅ Valores Exactos a Copiar', '📍 Notas Importantes'];
    const referenceData = [
      ['🎓 NIVELES EDUCATIVOS', '⬇️ COPIAR EXACTAMENTE ⬇️', 'Campo: Nivel Educativo (Columna I)'],
      ...educationalLevels.map(el => ['', el.name, '']),
      ['', '', ''],
      ['📚 CURSOS - INFANTIL', '⬇️ COPIAR EXACTAMENTE ⬇️', 'Campo: Curso (Columna J)'],
      ...courses.filter(c => c.cycle?.educationalLevel?.name === 'Educación Infantil').map(c => ['', c.name, '']),
      ['', '', ''],
      ['📚 CURSOS - PRIMARIA', '⬇️ COPIAR EXACTAMENTE ⬇️', ''],
      ...courses.filter(c => c.cycle?.educationalLevel?.name === 'Educación Primaria').map(c => ['', c.name, '']),
      ['', '', ''],
      ['📚 CURSOS - SECUNDARIA', '⬇️ COPIAR EXACTAMENTE ⬇️', ''],
      ...courses.filter(c => c.cycle?.educationalLevel?.name === 'Educación Secundaria Obligatoria').map(c => ['', c.name, '']),
      ['', '', ''],
      ['👨‍👩‍👧‍👦 RELACIONES FAMILIARES', '⬇️ COPIAR EXACTAMENTE ⬇️', 'Campo: Relación (Columnas T y AE)'],
      ['', 'parent', ''],
      ['', 'guardian', ''],
      ['', 'other', ''],
      ['', '', ''],
      ['❓ CONTACTO SECUNDARIO', '⬇️ COPIAR EXACTAMENTE ⬇️', 'Campo: ¿Tiene Contacto Secundario? (Columna U)'],
      ['', 'Sí', ''],
      ['', 'No', ''],
      ['', '', ''],
      ['⚠️ INSTRUCCIONES CRÍTICAS', 'Para evitar errores:', 'MUY IMPORTANTE'],
      ['', '1. Copiar y pegar los valores exactos', 'No escribir a mano'],
      ['', '2. No cambiar acentos ni mayúsculas', 'Respetar formato exacto'],
      ['', '3. Verificar en esta hoja antes de subir', 'Prevenir errores de importación'],
    ];

    const referenceWs = XLSX.utils.aoa_to_sheet([referenceHeaders, ...referenceData]);
    referenceWs['!cols'] = [{ wch: 25 }, { wch: 40 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, referenceWs, '🔍 VALORES EXACTOS');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  // ===============================
  // MÉTODOS SIMPLIFICADOS
  // ===============================

  async processSimplifiedBulkImport(file: any): Promise<SimplifiedBulkImportResult> {
    const result: SimplifiedBulkImportResult = {
      totalRows: 0,
      successfulImports: 0,
      failedImports: 0,
      errors: [],
      warnings: [],
      importedUsers: [],
    };

    try {
      // Parse file based on extension
      const data = await this.parseSimplifiedFile(file);
      result.totalRows = data.length;

      console.log('🎯 Processing simplified bulk import with', data.length, 'rows');

      // Process each row
      for (let i = 0; i < data.length; i++) {
        const rowNumber = i + 2; // +2 because Excel rows start at 1 and we have header
        const rowData = data[i];

        try {
          // Store original secondary contact data before validation to detect if it was cleared
          const originalSecondaryData = {
            firstName: rowData.secondaryFirstName,
            lastName: rowData.secondaryLastName,
            email: rowData.secondaryEmail
          };
          
          // Transform and validate row data
          const simplifiedRow = await this.validateAndTransformSimplifiedRow(rowData, rowNumber);
          
          if (!simplifiedRow) {
            result.failedImports++;
            continue;
          }

          // Check if secondary contact was cleared due to incomplete data
          const secondaryDataWasCleared = (
            (originalSecondaryData.firstName || originalSecondaryData.lastName || originalSecondaryData.email) &&
            (!simplifiedRow.secondaryFirstName && !simplifiedRow.secondaryEmail)
          );

          // Generate passwords if empty
          const studentPassword = simplifiedRow.studentPassword || this.generatePassword();
          const primaryPassword = simplifiedRow.primaryPassword || this.generatePassword();
          const secondaryPassword = simplifiedRow.secondaryEmail && !simplifiedRow.secondaryPassword 
            ? this.generatePassword() 
            : simplifiedRow.secondaryPassword;

          // Convert to full enrollment DTO format with simplified data
          const enrollmentDto = this.convertSimplifiedToEnrollmentDto(simplifiedRow, {
            studentPassword,
            primaryPassword,
            secondaryPassword
          });

          // Process enrollment through existing service
          const enrollmentResult = await this.enrollmentService.processEnrollment(enrollmentDto);

          // Prepare notes about generated passwords and warnings
          const notes: string[] = [];
          if (!simplifiedRow.studentPassword) {
            notes.push('Contraseña del estudiante generada automáticamente');
          }
          if (!simplifiedRow.primaryPassword) {
            notes.push('Contraseña del progenitor 1 generada automáticamente');
          }
          if (simplifiedRow.secondaryEmail && !simplifiedRow.secondaryPassword) {
            notes.push('Contraseña del progenitor 2 generada automáticamente');
          }
          
          // Add warning if secondary contact was omitted due to incomplete data
          if (secondaryDataWasCleared) {
            notes.push('⚠️ Contacto secundario omitido por datos incompletos (faltaba nombre o email)');
            
            // Also add to warnings array
            result.warnings.push({
              rowNumber,
              field: 'secondaryContact',
              message: 'Contacto secundario omitido por datos incompletos - importación continuó sin progenitor 2',
              originalData: originalSecondaryData
            });
          }

          // Record successful import
          result.successfulImports++;
          result.importedUsers.push({
            rowNumber,
            studentName: `${simplifiedRow.studentFirstName} ${simplifiedRow.studentLastName}`,
            studentEmail: simplifiedRow.studentEmail,
            studentPassword,
            primaryName: `${simplifiedRow.primaryFirstName} ${simplifiedRow.primaryLastName}`,
            primaryEmail: simplifiedRow.primaryEmail,
            primaryPassword,
            secondaryName: simplifiedRow.secondaryFirstName && simplifiedRow.secondaryLastName 
              ? `${simplifiedRow.secondaryFirstName} ${simplifiedRow.secondaryLastName}`
              : undefined,
            secondaryEmail: simplifiedRow.secondaryEmail,
            secondaryPassword,
            notes
          });

        } catch (error) {
          console.error(`❌ Error processing simplified row ${rowNumber}:`, error);
          result.failedImports++;
          result.errors.push({
            rowNumber,
            message: error.message || 'Error desconocido durante el procesamiento',
            originalData: rowData,
          });
        }
      }

      return result;

    } catch (error) {
      throw new BadRequestException(`Error procesando archivo simplificado: ${error.message}`);
    }
  }

  private async parseSimplifiedFile(file: any): Promise<any[]> {
    // Use the same parsing logic as the full import
    let workbook;
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      let csvContent = file.buffer.toString('utf8');
      
      // Handle encoding issues
      if (csvContent.includes('Ã³') || csvContent.includes('Ã¡') || csvContent.includes('Ãº')) {
        csvContent = file.buffer.toString('latin1');
      }
      
      workbook = XLSX.read(csvContent, { 
        type: 'string',
        codepage: 65001,
        raw: false
      });
    } else {
      workbook = XLSX.read(file.buffer, { 
        type: 'buffer',
        codepage: 65001,
        raw: false
      });
    }
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const data = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: '',
      blankrows: false
    });

    if (data.length < 2) {
      throw new BadRequestException('El archivo debe contener al menos una fila de datos además de la cabecera');
    }

    // Get headers and data rows
    const headers = data[0] as string[];
    const rows = data.slice(1);

    // Convert to object format
    return rows.map(row => {
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[this.normalizeSimplifiedColumnName(header)] = row[index] || '';
      });
      return obj;
    });
  }

  private normalizeSimplifiedColumnName(columnName: string): string {
    // Normalize column names for simplified import
    const columnMap: { [key: string]: string } = {
      // Student fields - simplified
      'nombre del estudiante': 'studentFirstName',
      'apellidos del estudiante': 'studentLastName', 
      'email del estudiante': 'studentEmail',
      'contraseña del estudiante': 'studentPassword',
      'fecha de nacimiento del estudiante': 'studentBirthDate',
      
      // Primary contact fields - simplified
      'nombre del progenitor 1': 'primaryFirstName',
      'apellidos del progenitor 1': 'primaryLastName',
      'email del progenitor 1': 'primaryEmail',
      'contraseña del progenitor 1': 'primaryPassword',
      
      // Secondary contact fields - simplified
      'nombre del progenitor 2': 'secondaryFirstName',
      'apellidos del progenitor 2': 'secondaryLastName',
      'email del progenitor 2': 'secondaryEmail',
      'contraseña del progenitor 2': 'secondaryPassword',
    };

    const normalizedKey = columnName.toLowerCase().trim();
    return columnMap[normalizedKey] || columnName.replace(/\s+/g, '');
  }

  private async validateAndTransformSimplifiedRow(
    rowData: any, 
    rowNumber: number
  ): Promise<SimplifiedBulkEnrollmentRowDto | null> {
    console.log(`🔍 Validating simplified row ${rowNumber}:`, JSON.stringify(rowData, null, 2));
    
    if (!rowData || Object.keys(rowData).length === 0) {
      console.log(`⚠️ Row ${rowNumber} is empty, skipping`);
      return null;
    }

    // Create DTO instance
    const simplifiedRow = plainToClass(SimplifiedBulkEnrollmentRowDto, rowData);
    
    // Basic validation - ensure required fields are present
    if (!simplifiedRow.studentFirstName || !simplifiedRow.studentLastName || !simplifiedRow.studentEmail) {
      throw new Error('Faltan datos obligatorios del estudiante (nombre, apellidos, email)');
    }

    if (!simplifiedRow.primaryFirstName || !simplifiedRow.primaryEmail) {
      throw new Error('Faltan datos obligatorios del progenitor 1 (nombre, email)');
    }

    // Check secondary contact - if incomplete, clear it but continue with import
    if ((simplifiedRow.secondaryFirstName || simplifiedRow.secondaryLastName || simplifiedRow.secondaryEmail) &&
        !(simplifiedRow.secondaryFirstName && simplifiedRow.secondaryEmail)) {
      // Clear incomplete secondary contact data and add warning
      console.log(`⚠️ Row ${rowNumber}: Datos incompletos del progenitor 2 - se omitirá contacto secundario pero se continuará importación`);
      simplifiedRow.secondaryFirstName = undefined;
      simplifiedRow.secondaryLastName = undefined;
      simplifiedRow.secondaryEmail = undefined;
      simplifiedRow.secondaryPassword = undefined;
      // This will be handled as a warning in the main processing function
    }

    console.log(`✅ Simplified row ${rowNumber} validation passed`);
    return simplifiedRow;
  }

  private convertSimplifiedToEnrollmentDto(
    simplifiedRow: SimplifiedBulkEnrollmentRowDto, 
    passwords: { studentPassword: string; primaryPassword: string; secondaryPassword?: string }
  ): CreateEnrollmentDto {
    // Convert birth date from DD/MM/YYYY to YYYY-MM-DD format
    let formattedBirthDate = '2010-01-01'; // Default birth date - can be updated later
    if (simplifiedRow.studentBirthDate) {
      try {
        // Expect format DD/MM/YYYY, convert to YYYY-MM-DD
        const parts = simplifiedRow.studentBirthDate.split('/');
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2];
          formattedBirthDate = `${year}-${month}-${day}`;
        }
      } catch (error) {
        console.log(`⚠️ Error formatting birth date "${simplifiedRow.studentBirthDate}", using default`);
        // Keep default birth date if formatting fails
      }
    }

    // Convert simplified data to full enrollment format with defaults
    return {
      student: {
        firstName: simplifiedRow.studentFirstName,
        lastName: simplifiedRow.studentLastName,
        email: simplifiedRow.studentEmail,
        password: passwords.studentPassword,
        birthDate: formattedBirthDate,
        documentNumber: undefined,
        phone: undefined,
        enrollmentNumber: undefined, // Auto-generated
        educationalLevelId: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // Default to Primary Education
        courseId: undefined,
        classGroupIds: [],
      },
      family: {
        primaryContact: {
          firstName: simplifiedRow.primaryFirstName,
          lastName: simplifiedRow.primaryLastName,
          email: simplifiedRow.primaryEmail,
          password: passwords.primaryPassword,
          phone: '600000000', // Default phone - can be updated later
          documentNumber: undefined,
          dateOfBirth: undefined,
          address: undefined,
          occupation: undefined,
        },
        ...(simplifiedRow.secondaryEmail && {
          secondaryContact: {
            firstName: simplifiedRow.secondaryFirstName!,
            lastName: simplifiedRow.secondaryLastName!,
            email: simplifiedRow.secondaryEmail,
            password: passwords.secondaryPassword!,
            phone: '600000000', // Default phone - can be updated later
            documentNumber: undefined,
            dateOfBirth: undefined,
            address: undefined,
            occupation: undefined,
          },
        }),
        relationship: 'parent' as const, // Default relationship
      },
    };
  }

  private generatePassword(): string {
    // Generate a simple, secure password
    const length = 8;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }

  async generateSimplifiedTemplate(): Promise<Buffer> {
    console.log('🎯 Generating simplified template...');

    const headers = [
      'Nombre del Estudiante',
      'Apellidos del Estudiante',
      'Email del Estudiante',
      'Contraseña del Estudiante',
      'Fecha de nacimiento del estudiante',
      'Nombre del Progenitor 1',
      'Apellidos del Progenitor 1',
      'Email del Progenitor 1',
      'Contraseña del Progenitor 1',
      'Nombre del Progenitor 2',
      'Apellidos del Progenitor 2',
      'Email del Progenitor 2',
      'Contraseña del Progenitor 2'
    ];

    const exampleRows = [
      [
        'Ana',
        'García López',
        'ana.garcia@ejemplo.com',
        '', // Vacío - se generará automáticamente
        '15/03/2010', // Fecha de nacimiento en formato DD/MM/YYYY
        'María',
        'López Martín',
        'maria.lopez@ejemplo.com',
        'mipassword123',
        'Carlos',
        'García Ruiz',
        'carlos.garcia@ejemplo.com',
        '', // Vacío - se generará automáticamente
      ],
      [
        'Luis',
        'Martínez Santos',
        'luis.martinez@ejemplo.com',
        'luispass456',
        '22/08/2012', // Fecha de nacimiento en formato DD/MM/YYYY
        'Carmen',
        'Santos Gil',
        'carmen.santos@ejemplo.com',
        '', // Vacío - se generará automáticamente
        '', // Sin segundo progenitor
        '',
        '',
        '',
      ]
    ];

    // Create main worksheet
    const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);
    
    // Set column widths
    const colWidths = headers.map(() => ({ wch: 25 }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos Simplificados');

    // Add instructions sheet
    const instructionsHeaders = ['Campo', 'Obligatorio', 'Descripción'];
    const instructions = [
      ['Nombre del Estudiante', 'SÍ', 'Nombre propio del estudiante'],
      ['Apellidos del Estudiante', 'SÍ', 'Apellidos completos del estudiante'],
      ['Email del Estudiante', 'SÍ', 'Correo electrónico único del estudiante'],
      ['Contraseña del Estudiante', 'NO', 'Si está vacío, se genera automáticamente'],
      ['Nombre del Progenitor 1', 'SÍ', 'Nombre del primer progenitor/tutor'],
      ['Apellidos del Progenitor 1', 'SÍ', 'Apellidos del primer progenitor/tutor'],
      ['Email del Progenitor 1', 'SÍ', 'Email único del primer progenitor/tutor'],
      ['Contraseña del Progenitor 1', 'NO', 'Si está vacío, se genera automáticamente'],
      ['Nombre del Progenitor 2', 'NO', 'Nombre del segundo progenitor/tutor (opcional)'],
      ['Apellidos del Progenitor 2', 'NO', 'Apellidos del segundo progenitor/tutor (opcional)'],
      ['Email del Progenitor 2', 'NO', 'Email único del segundo progenitor/tutor (opcional)'],
      ['Contraseña del Progenitor 2', 'NO', 'Si hay progenitor 2 y está vacío, se genera automáticamente'],
      ['', '', ''],
      ['NOTAS IMPORTANTES:', '', ''],
      ['• Si la contraseña está vacía, se genera automáticamente', '', ''],
      ['• El segundo progenitor es completamente opcional', '', ''],
      ['• Los datos adicionales (teléfono, dirección, etc.) se pueden completar después', '', ''],
      ['• Los estudiantes se asignarán automáticamente a Educación Primaria', '', ''],
    ];

    const instructionsWs = XLSX.utils.aoa_to_sheet([instructionsHeaders, ...instructions]);
    instructionsWs['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instrucciones');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}