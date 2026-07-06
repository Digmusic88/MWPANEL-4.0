import { IsArray, IsUUID, IsIn, ArrayNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class FamilyCredentialResendDto {
  @ApiProperty({ 
    description: 'ID de la familia',
    example: 'e9114728-e559-4173-9028-7c8a521af38f'
  })
  @IsUUID(4)
  familyId: string;

  @ApiProperty({ 
    description: 'Tipo de contacto al que enviar las credenciales',
    enum: ['primary', 'secondary'],
    example: 'primary'
  })
  @IsIn(['primary', 'secondary'])
  contactType: 'primary' | 'secondary';
}

export class BulkResendCredentialsDto {
  @ApiProperty({
    description: 'Lista de familias y contactos a los que enviar credenciales',
    type: [FamilyCredentialResendDto],
    example: [
      {
        familyId: 'e9114728-e559-4173-9028-7c8a521af38f',
        contactType: 'primary'
      },
      {
        familyId: 'f8225839-f669-5284-a139-8d9b632bf49g',
        contactType: 'secondary'
      }
    ]
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => FamilyCredentialResendDto)
  familyContacts: FamilyCredentialResendDto[];
}