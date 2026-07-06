import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as PDFKit from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { User, UserRole } from '../entities/user.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { FamiliesService } from '../../families/families.service';

export interface CredentialsPDFOptions {
  role: UserRole;
  includeInactiveUsers?: boolean;
}

export interface GeneratedCredentialsPDF {
  filePath: string;
  fileName: string;
  size: number;
  generatedAt: Date;
  userCount: number;
  temporaryPasswords: { [userId: string]: string };
}

@Injectable()
export class CredentialsPDFService {
  private readonly outputDir = path.join(process.cwd(), 'reports');
  private readonly logoPath = path.join(process.cwd(), 'uploads', 'logo-MWSchool.png');

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
    @Inject(forwardRef(() => FamiliesService))
    private familiesService: FamiliesService,
  ) {
    this.ensureOutputDirectory();
  }

  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async generateCredentialsPDF(options: CredentialsPDFOptions): Promise<GeneratedCredentialsPDF> {
    const { role, includeInactiveUsers = false } = options;
    
    // Obtener usuarios por rol
    const users = await this.getUsersByRole(role, includeInactiveUsers);
    
    if (users.length === 0) {
      throw new Error(`No hay usuarios con rol ${role} para generar credenciales`);
    }

    // Obtener información adicional para familias (estudiantes asociados)
    let familiesWithStudents: any[] = [];
    if (role === UserRole.FAMILY) {
      const allFamilies = await this.familiesService.findAll();
      familiesWithStudents = allFamilies;
    }

    // Generar contraseñas temporales para todos los usuarios y guardarlas en BD
    const temporaryPasswords: { [userId: string]: string } = {};
    await this.generateAndSaveTemporaryPasswords(users, temporaryPasswords);

    // Generar nombre de archivo único
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `credenciales_${role}_${timestamp}.pdf`;
    const filePath = path.join(this.outputDir, fileName);

    // Crear el PDF
    const doc = new PDFKit({
      size: 'A4',
      margin: 40,
      bufferPages: true
    });

    // Configurar stream de salida
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Generar contenido del PDF
    await this.generatePDFContent(doc, users, role, temporaryPasswords, familiesWithStudents);

    // Finalizar documento
    doc.end();

    // Esperar a que se complete la escritura
    await new Promise<void>((resolve, reject) => {
      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });

    // Obtener tamaño del archivo
    const stats = fs.statSync(filePath);

    return {
      filePath,
      fileName,
      size: stats.size,
      generatedAt: new Date(),
      userCount: users.length,
      temporaryPasswords
    };
  }

  private async getUsersByRole(role: UserRole, includeInactive: boolean): Promise<User[]> {
    const queryBuilder = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('user.role = :role', { role });

    if (!includeInactive) {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive: true });
    }

    return queryBuilder
      .orderBy('profile.lastName', 'ASC')
      .addOrderBy('profile.firstName', 'ASC')
      .getMany();
  }

  private async generateAndSaveTemporaryPasswords(users: User[], passwordsMap: { [userId: string]: string }): Promise<void> {
    console.log(`🔐 Generating temporary passwords for ${users.length} users...`);
    
    for (const user of users) {
      // Generate a temporary password that meets security requirements
      const tempPassword = this.generateSecureTemporaryPassword();
      passwordsMap[user.id] = tempPassword;
      
      // Save temporary password to database
      user.temporaryPassword = tempPassword;
      console.log(`🔍 DEBUG - Setting temporaryPassword for ${user.email}, will manually hash and set fields`);
      
      // Manually hash and set the temporary password fields
      const bcrypt = require('bcrypt');
      user.temporaryPasswordHash = await bcrypt.hash(tempPassword, 10);
      user.isPasswordTemporary = true;
      
      // Clear the virtual field
      delete user.temporaryPassword;
      
      const savedUser = await this.usersRepository.save(user);
      console.log(`🔍 DEBUG - After manual save for ${user.email}:`, {
        isPasswordTemporary: savedUser.isPasswordTemporary,
        hasTemporaryPasswordHash: savedUser.temporaryPasswordHash ? 'YES' : 'NO'
      });
      
      console.log(`✅ Temporary password generated and saved for user: ${user.email}`);
    }
    
    console.log(`🔐 All temporary passwords generated and saved successfully`);
  }

  private async generatePDFContent(doc: PDFKit.PDFDocument, users: User[], role: UserRole, temporaryPasswords?: { [userId: string]: string }, familiesWithStudents?: any[]): Promise<void> {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 40;
    const contentWidth = pageWidth - (2 * margin);
    
    // Configuración de colores
    const primaryColor = '#1890ff';
    const textColor = '#333333';
    const borderColor = '#d9d9d9';

    // Título principal del documento
    doc.fontSize(24)
       .fillColor(primaryColor)
       .text(`Credenciales de Acceso - ${this.getRoleDisplayName(role)}`, margin, margin, {
         width: contentWidth,
         align: 'center'
       });

    doc.fontSize(12)
       .fillColor('#666666')
       .text(`Generado el ${new Date().toLocaleDateString('es-ES')} - Total de usuarios: ${users.length}`, {
         width: contentWidth,
         align: 'center'
       });

    let currentY = margin + 60; // Reducido de 80
    const userBlockHeight = role === UserRole.FAMILY ? 160 : 140; // Reducido significativamente
    const maxUserBlocksPerPage = Math.floor((pageHeight - margin - 80) / userBlockHeight);
    let userCount = 0;

    for (const user of users) {
      // Verificar si necesitamos una nueva página
      if (userCount > 0 && userCount % maxUserBlocksPerPage === 0) {
        doc.addPage();
        currentY = margin;
      }

      const userTempPassword = temporaryPasswords ? temporaryPasswords[user.id] : this.generateTemporaryPassword();
      
      // Obtener información de estudiantes si es una familia
      let familyStudentsInfo = null;
      if (role === UserRole.FAMILY && familiesWithStudents) {
        const family = familiesWithStudents.find(f => 
          f.primaryContact?.id === user.id || f.secondaryContact?.id === user.id
        );
        if (family && family.students) {
          familyStudentsInfo = family.students.map((fs: any) => {
            const firstName = fs.student.user.profile?.firstName || 'Sin nombre';
            const lastName = fs.student.user.profile?.lastName || '';
            return `${firstName} ${lastName}`.trim();
          }).filter(name => name !== 'Sin nombre').join(', ');
        }
      }
      
      await this.generateUserCredentialBlock(doc, user, margin, currentY, contentWidth, userTempPassword, familyStudentsInfo);
      currentY += userBlockHeight;
      userCount++;
    }
  }

  private async generateUserCredentialBlock(
    doc: PDFKit.PDFDocument, 
    user: User, 
    x: number, 
    y: number, 
    width: number,
    temporaryPassword: string,
    familyStudentsInfo?: string | null
  ): Promise<void> {
    const blockHeight = familyStudentsInfo ? 150 : 130; // Bloques más compactos
    const padding = 10; // Reducido de 15
    const borderColor = '#d9d9d9';
    const scissorColor = '#999999';

    // Dibujar borde del bloque con líneas punteadas para recortar
    doc.strokeColor(borderColor)
       .lineWidth(1)
       .dash(5, { space: 3 })
       .rect(x, y, width, blockHeight)
       .stroke()
       .undash();

    // Agregar iconos de tijera en las esquinas
    doc.fontSize(10)
       .fillColor(scissorColor)
       .text('✂', x - 10, y - 5)
       .text('✂', x + width, y - 5)
       .text('✂', x - 10, y + blockHeight - 5)
       .text('✂', x + width, y + blockHeight - 5);

    // Área de contenido dentro del bloque
    const contentX = x + padding;
    const contentY = y + padding;
    const contentWidth = width - (2 * padding);

    // Agregar logo si existe
    if (fs.existsSync(this.logoPath)) {
      try {
        // Logo más pequeño para bloques compactos
        const logoWidth = 35; // Reducido de 60
        const logoX = contentX + (contentWidth / 2) - (logoWidth / 2);
        
        doc.image(this.logoPath, logoX, contentY, {
          width: logoWidth
          // NO especificar height para que PDFKit mantenga la proporción automáticamente
        });
      } catch (error) {
        console.warn('Error loading logo:', error);
      }
    }

    let textY = contentY + 30; // Reducido de 50

    // Mensaje informativo más corto y compacto
    const infoMessage = `Contraseña generada automáticamente. Cambiar desde el panel de usuario.`;
    
    doc.fontSize(8) // Reducido de 9
       .fillColor('#666666')
       .text(infoMessage, contentX, textY, {
         width: contentWidth,
         align: 'center',
         lineGap: 1 // Reducido de 2
       });

    textY += 20; // Reducido de 35

    // Separador
    doc.strokeColor('#e8e8e8')
       .lineWidth(1)
       .moveTo(contentX + 20, textY)
       .lineTo(contentX + contentWidth - 20, textY)
       .stroke();

    textY += 10; // Reducido de 15

    // Información del usuario
    const fullName = `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() || 'Sin nombre';
    
    // Nombre completo
    doc.fontSize(11) // Reducido de 14
       .fillColor('#1890ff')
       .font('Helvetica-Bold')
       .text('Nombre:', contentX, textY, { continued: true }) // Texto más corto
       .fillColor('#333333')
       .font('Helvetica')
       .text(` ${fullName}`);

    textY += 12; // Reducido significativamente para compactar

    // Información de estudiantes (solo para familias)
    if (familyStudentsInfo) {
      doc.fontSize(12)
         .fillColor('#52c41a')
         .font('Helvetica-Bold')
         .text('Familiares de:', contentX, textY, { continued: true })
         .fillColor('#333333')
         .font('Helvetica')
         .text(` ${familyStudentsInfo}`, {
           width: contentWidth,
           align: 'left'
         });
      textY += 15; // Reducido para compactar familias
      
      // Agregar una nota explicativa
      doc.fontSize(9)
         .fillColor('#666666')
         .font('Helvetica')
         .text('(Acceso seguimiento académico)', contentX, textY, {
           width: contentWidth,
           align: 'center'
         });
      textY += 12; // Texto más corto y menos espacio
    }

    // Usuario (email)
    doc.fontSize(14)
       .fillColor('#1890ff')
       .font('Helvetica-Bold')
       .text('Usuario:', contentX, textY, { continued: true })
       .fillColor('#333333')
       .font('Helvetica')
       .text(` ${user.email}`);

    textY += 18; // Reducido para compactar

    // Contraseña temporal funcional
    doc.fontSize(14)
       .fillColor('#1890ff')
       .font('Helvetica-Bold')
       .text('Contraseña temporal:', contentX, textY, { continued: true })
       .fillColor('#d4380d')
       .font('Helvetica-Bold')
       .text(` ${temporaryPassword}`);

    // Agregar nota sobre contraseña temporal
    doc.fontSize(8)
       .fillColor('#52c41a')
       .font('Helvetica')
       .text('✓ Funciona primer acceso, cambiar desde perfil', contentX, textY + 12, {
         width: contentWidth,
         align: 'center'
       });
  }

  private generateTemporaryPassword(): string {
    // Fallback method for backward compatibility (not used in new implementation)
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'; // Sin O, 0 para evitar confusión
    let password = '';
    
    // Formato: 2 letras + 2 números + 2 letras
    for (let i = 0; i < 2; i++) {
      password += chars.charAt(Math.floor(Math.random() * 25)); // Letras
    }
    for (let i = 0; i < 2; i++) {
      password += chars.charAt(Math.floor(Math.random() * 9) + 25); // Números
    }
    for (let i = 0; i < 2; i++) {
      password += chars.charAt(Math.floor(Math.random() * 25)); // Letras
    }
    
    return password;
  }

  private generateSecureTemporaryPassword(): string {
    // Generate password that meets security requirements:
    // At least 8 characters, one lowercase, one uppercase, one number, one special character
    const lowercase = 'abcdefghijklmnpqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMPQRSTUVWXYZ'; // Removed confusing letters
    const numbers = '23456789'; // Removed 0 and 1 to avoid confusion
    const special = '@#$%&';
    
    let password = '';
    
    // Ensure at least one of each required type
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += special.charAt(Math.floor(Math.random() * special.length));
    
    // Fill remaining 4 characters from all character sets
    const allChars = lowercase + uppercase + numbers + special;
    for (let i = 0; i < 4; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    // Shuffle the password to avoid predictable patterns
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  }

  private getRoleDisplayName(role: UserRole): string {
    const roleNames = {
      [UserRole.STUDENT]: 'Estudiantes',
      [UserRole.TEACHER]: 'Profesores',
      [UserRole.FAMILY]: 'Familias',
      [UserRole.ADMIN]: 'Administradores'
    };
    return roleNames[role] || role;
  }

  // Método para limpiar archivos PDF antiguos
  async cleanupOldFiles(daysOld: number = 7): Promise<void> {
    const files = fs.readdirSync(this.outputDir);
    const now = new Date();

    for (const file of files) {
      if (file.startsWith('credenciales_') && file.endsWith('.pdf')) {
        const filePath = path.join(this.outputDir, file);
        const stats = fs.statSync(filePath);
        const daysDiff = (now.getTime() - stats.mtime.getTime()) / (1000 * 3600 * 24);

        if (daysDiff > daysOld) {
          fs.unlinkSync(filePath);
        }
      }
    }
  }
}