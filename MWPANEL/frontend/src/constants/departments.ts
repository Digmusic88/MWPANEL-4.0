export const DEPARTMENTS = [
  { value: 'matematicas', label: 'Matemáticas' },
  { value: 'lengua', label: 'Lengua y Literatura' },
  { value: 'ciencias', label: 'Ciencias Naturales' },
  { value: 'sociales', label: 'Ciencias Sociales' },
  { value: 'idiomas', label: 'Idiomas' },
  { value: 'educacion_fisica', label: 'Educación Física' },
  { value: 'artes', label: 'Artes y Música' },
  { value: 'tecnologia', label: 'Tecnología' },
  { value: 'religion', label: 'Religión/Valores' },
  { value: 'orientacion', label: 'Orientación' },
] as const;

export const DEPARTMENT_OPTIONS = DEPARTMENTS.map(dept => ({
  label: dept.label,
  value: dept.label, // Use label as value for consistency with existing data
}));

export const DEPARTMENT_LABELS = DEPARTMENTS.map(dept => dept.label);