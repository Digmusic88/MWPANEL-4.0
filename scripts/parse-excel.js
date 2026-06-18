// Parser de validación del Excel "Datos y Pagos 25-26 OFICIAL" — solo lectura, sin tocar BD.
const X = require('/tmp/node_modules/xlsx');
const FILE = '/opt/mw-secretaria/Datos y Pagos  25-26 OFICIAL.xlsx';
const wb = X.readFile(FILE);
const serialToDate = (n) => {
  if (typeof n !== 'number' || !n) return null;
  const d = new Date(Date.UTC(1899,11,30) + Math.round(n)*86400000);
  return d.toISOString().slice(0,10);
};
const clean = (v) => (v===undefined||v===null) ? '' : String(v).trim();

// Config de roster por servicio
const ROSTERS = {
  INGLES: { sheet:'INGLES 25-26', grouped:true, marker:2, groupCol:0, idx:0, name:1, birth:2, age:3, school:4, grade:5, mother:6, father:7, addr:8, postal:9, ph1:10, ph2:11 },
  APOYO:  { sheet:'APOYO',        grouped:true, marker:2, groupCol:1, idx:0, name:1, birth:2, age:3, school:4, grade:5, mother:6, father:7, addr:8, postal:9, ph1:10, ph2:11 },
  DANZA:  { sheet:'DANZA 25-26',  grouped:true, marker:4, groupCol:3, idx:1, name:3, birth:4, age:5, school:6, grade:7, mother:8, father:9, addr:10, postal:null, ph1:12, ph2:null },
  ESCUELA:{ sheet:'ESC.ALT.',     grouped:false, marker:4, idx:0, name:1, birth:4, age:5, grade:6, mother:7, father:8, addr:9, postal:10, ph1:11, ph2:12 },
};

for (const [svc,c] of Object.entries(ROSTERS)) {
  const ws = wb.Sheets[c.sheet];
  if (!ws) { console.log(`\n### ${svc}: hoja "${c.sheet}" NO encontrada`); continue; }
  const rows = X.utils.sheet_to_json(ws, {header:1, blankrows:false, defval:''});
  let curGroup = c.grouped ? null : svc;
  let students = [], groups = new Set();
  for (const r of rows) {
    const markerVal = clean(r[c.marker]).toLowerCase();
    const isHeader = markerVal.startsWith('fecha nac');
    if (isHeader) { if (c.grouped) { curGroup = clean(r[c.groupCol]) || curGroup; groups.add(curGroup); } continue; }
    const idx = r[c.idx], name = clean(r[c.name]);
    if (name && !isNaN(Number(idx)) && String(idx)!=='' && !/fecha|nombre|edad|colegio/i.test(name)) {
      students.push({ group: curGroup, name, birth: serialToDate(r[c.birth]),
        school: clean(r[c.school]), grade: clean(r[c.grade]),
        mother: clean(r[c.mother]), father: clean(r[c.father]),
        phone1: clean(r[c.ph1]), phone2: c.ph2!=null?clean(r[c.ph2]):'' });
    }
  }
  console.log(`\n### ${svc} (${c.sheet}): grupos=${c.grouped?groups.size:'-'} alumnos=${students.length}`);
  if (c.grouped) console.log('   grupos:', [...groups].join(' | '));
  console.log('   muestra:', JSON.stringify(students.slice(0,2),null,0));
}
