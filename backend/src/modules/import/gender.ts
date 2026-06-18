// Adivina el género de una persona a partir de su nombre de pila, para asignar
// relación madre/padre a los tutores. Devuelve 'f' | 'm' | null (incierto).
//
// Estrategia: diccionario de nombres españoles/vascos comunes + heurística de
// terminación (-a femenino, -o masculino) como respaldo. Lo incierto → null,
// para que el personal lo asigne a mano.

const norm = (s: string) =>
  (s || '').toLowerCase().replace(/ª/g, 'a').replace(/º/g, 'o')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();

// Abreviaturas frecuentes en los listados.
const ABBREV: Record<string, string> = {
  ma: 'maria', // "Mª"
  mo: 'maria', // "Mº" (escrito con º)
  fco: 'francisco',
  fdez: 'fernando',
  jo: 'jose', // "Jº"
};

const FEMALE = new Set([
  'ana', 'maria', 'mari', 'laura', 'patricia', 'susana', 'adriana', 'beatriz', 'isabel', 'marta',
  'silvia', 'virginia', 'carmen', 'cristina', 'elena', 'berta', 'esther', 'fatima', 'maider', 'maite',
  'mariana', 'natalia', 'nekane', 'nerea', 'raquel', 'tania', 'viviana', 'aisha', 'amy', 'blanca',
  'claudia', 'eliana', 'eva', 'arantxa', 'sherezade', 'loli', 'lorena', 'aitxiber', 'lucia', 'sara',
  'paula', 'andrea', 'alba', 'irene', 'julia', 'noelia', 'sonia', 'rocio', 'pilar', 'montserrat',
  'monica', 'sandra', 'yolanda', 'rosa', 'teresa', 'angela', 'alicia', 'gloria', 'vanesa', 'veronica',
  'miriam', 'nuria', 'ainhoa', 'idoia', 'leire', 'amaia', 'garbine', 'edurne', 'oihana', 'uxue', 'june',
  'yenni', 'jenny', 'yaiza', 'tamara', 'estibaliz', 'itziar', 'saioa', 'ainara', 'naroa', 'olatz',
  'ariadna', 'noemi', 'carla', 'marina', 'clara', 'lidia', 'rebeca', 'celia', 'aurora', 'belen',
  'inmaculada', 'concepcion', 'dolores', 'consuelo', 'milagros', 'mercedes', 'angeles', 'rosario',
  'guadalupe', 'soledad', 'fabiola', 'gabriela', 'daniela', 'valeria', 'lucila', 'katia', 'nadia',
  'sofia', 'eider', 'ane', 'maialen', 'malen', 'irati', 'haizea', 'enara', 'jaione', 'amaya', 'iratxe',
  'begona', 'arrate', 'oihane', 'ainhize', 'aroa', 'jessica', 'yesica', 'sheila', 'tatiana', 'diana',
  'carolina', 'johana', 'yohana', 'maribel',
  // Ampliación 2 (vistas en los listados, claramente femeninas)
  'araceli', 'conchi', 'ines', 'iris', 'leyre', 'lourdes', 'nieves', 'pili', 'tere', 'marian',
  'marisol', 'maricruz', 'myriam', 'nagore', 'eneritz', 'aitziber', 'alazne', 'izaskun', 'izascun',
  'josune', 'judit', 'mentxu', 'klari', 'ester', 'elizabeth', 'ingrid', 'jennifer', 'jenifer',
  'karen', 'lilian', 'irantzu', 'ohiane', 'maruchi', 'marila', 'macarmen', 'mocarmen', 'mojose',
  'eider', 'aitziber', 'janeth', 'magaly', 'gladys', 'ivonne', 'lizeth', 'nataly', 'yurani', 'seidy',
  'anabel', 'marijose', 'mery', 'marilut', 'marilutz', 'brigitte', 'fanny', 'emily', 'grace', 'katy',
]);

const MALE = new Set([
  'david', 'javier', 'miguel', 'alberto', 'juan', 'jose', 'jesus', 'mikel', 'carlos', 'francisco',
  'jorge', 'manuel', 'eduardo', 'inaki', 'daniel', 'oscar', 'pablo', 'aitor', 'fernando', 'javi',
  'jonathan', 'ricardo', 'santiago', 'xabier', 'adrian', 'antonio', 'fermin', 'ignacio', 'juanjo',
  'luis', 'ruben', 'sergio', 'abbas', 'abib', 'andres', 'arturo', 'asier', 'fran', 'enrrique', 'enrique',
  'pedro', 'angel', 'alvaro', 'ivan', 'raul', 'victor', 'hector', 'marcos', 'gonzalo', 'ander', 'unai',
  'iker', 'jon', 'julen', 'markel', 'eneko', 'benat', 'gorka', 'imanol', 'koldo', 'patxi', 'joseba',
  'roberto', 'rafael', 'diego', 'alejandro', 'guillermo', 'gabriel', 'mario', 'jaime', 'felix', 'cesar',
  'emilio', 'tomas', 'agustin', 'ramon', 'salvador', 'vicente', 'joaquin', 'martin', 'nicolas', 'ismael',
  'borja', 'cristian', 'christian', 'sebastian', 'mohamed', 'ahmed', 'youssef', 'eoin', 'aimar', 'oier',
  'ekaitz', 'beltran', 'ibai', 'unax', 'mattin', 'hodei', 'aratz', 'iban', 'txomin', 'endika', 'iosu',
  'josu', 'aimar', 'aner', 'eric', 'erik', 'bruno', 'hugo', 'leo', 'dario', 'fabian', 'wilson', 'jhon',
  'jefferson', 'cedric', 'thiago', 'anderson',
  // Ampliación 2 (vistas en los listados, claramente masculinas)
  'abel', 'abraham', 'aritz', 'damian', 'julian', 'edu', 'kike', 'xavi', 'sebas', 'txemi', 'eder',
  'edgar', 'clemente', 'marcial', 'henry', 'edwin', 'paul', 'roger', 'ronald', 'inaqui', 'dabid',
  'javii', 'javiier', 'chritian', 'lenin', 'maikel', 'percy', 'klever', 'maxim', 'simeon', 'ned',
  'neil', 'omar', 'khalid', 'rachid', 'ibrahim', 'taoufiq', 'nelson', 'frankling', 'wilton', 'ferson',
  'kilian', 'josue', 'natanael', 'agus', 'anibal', 'gregor', 'hans', 'helbert', 'domingos',
]);

export function guessGender(fullName: string): 'f' | 'm' | null {
  const tokens = norm(fullName).split(' ').filter(Boolean);
  if (tokens.length === 0) return null;
  let first = tokens[0];
  if (ABBREV[first]) first = ABBREV[first];

  if (FEMALE.has(first)) return 'f';
  if (MALE.has(first)) return 'm';

  // Respaldo por terminación (solo nombres de pila "normales")
  if (first.length >= 3) {
    if (first.endsWith('a')) return 'f';
    if (first.endsWith('o')) return 'm';
  }
  return null;
}

export function genderToRelationship(g: 'f' | 'm' | null): 'madre' | 'padre' | null {
  if (g === 'f') return 'madre';
  if (g === 'm') return 'padre';
  return null;
}
