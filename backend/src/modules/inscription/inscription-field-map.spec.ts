import { mapFieldsToInscription } from './inscription-field-map';

const base = (): Record<string,string> => ({
  'NOMBRERow1': 'TestNombre',
  'PRIMER APELLIDORow1': 'ApellidoUno',
  'SEGUNDO APELLIDORow1': 'ApellidoDos',
  'DÍALUGAR Y FECHA DE NACIMIENTO': '5',
  'MESLUGAR Y FECHA DE NACIMIENTO': '3',
  'AÑOLUGAR Y FECHA DE NACIMIENTO': '2018',
  'CALLEDIRECCIÓN DE RESIDENCIA HABITUAL': 'Calle Falsa',
  'NDIRECCIÓN DE RESIDENCIA HABITUAL': '10',
  'ALERGIAS CONOCIDAS obligado certificado médicoRow1': 'Ninguna',
  'NOMBRERow1_2': 'Maria', 'PRIMER APELLIDORow1_2': 'Gomez', 'TELÉFONORow1': '600111222', 'EMAILRow1': 'm@x.com',
  'NOMBRERow1_3': 'Juan', 'PRIMER APELLIDORow1_3': 'Perez', 'TELÉFONORow1_2': '600333444',
});

describe('mapFieldsToInscription', () => {
  it('mapea alumno, fecha, dirección y salud', () => {
    const r = mapFieldsToInscription(base(), 'Opción1');
    expect(r.student.firstName).toBe('TestNombre');
    expect(r.student.lastName).toBe('ApellidoUno ApellidoDos');
    expect(r.student.birthDate).toBe('2018-03-05');
    expect(r.student.address).toBe('Calle Falsa 10');
    expect(r.student.medicalText).toContain('Ninguna');
    // el consentimiento NO se infiere del radio (indistinguible): siempre null
    expect(r.student.photoConsent).toBeNull();
    expect(r.student.exitConsent).toBeNull();
  });
  it('infiere madre/padre por nombre y omite contactos vacíos', () => {
    const r = mapFieldsToInscription(base(), null);
    expect(r.guardians.length).toBe(2);
    expect(r.guardians[0]).toMatchObject({ fullName: 'Maria Gomez', relationship: 'madre', isPrimary: true });
    expect(r.guardians[1]).toMatchObject({ fullName: 'Juan Perez', relationship: 'padre' });
  });
  it('no crea banco si el IBAN está vacío', () => {
    expect(mapFieldsToInscription(base(), null).bank).toBeNull();
  });
});
