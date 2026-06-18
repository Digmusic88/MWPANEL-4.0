const X = require('/tmp/node_modules/xlsx');
const wb = X.readFile('/opt/mw-secretaria/Datos y Pagos  25-26 OFICIAL.xlsx');
const serialToDate = (n) => (typeof n==='number'&&n) ? new Date(Date.UTC(1899,11,30)+Math.round(n)*86400000).toISOString().slice(0,10) : null;
const clean = (v)=> (v===undefined||v===null)?'':String(v).trim();
const norm = (s)=> clean(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim();

// rosters (nombres) por servicio para emparejar
const rosterNames = {
  INGLES: {sheet:'INGLES 25-26', name:1, marker:2},
  APOYO: {sheet:'APOYO', name:1, marker:2},
  DANZA: {sheet:'DANZA 25-26', name:3, marker:4},
  ESCUELA: {sheet:'ESC.ALT.', name:1, marker:4},
};
function rosterSet(c){
  const rows=X.utils.sheet_to_json(wb.Sheets[c.sheet],{header:1,blankrows:false,defval:''});
  const set=new Set();
  for(const r of rows){ if(clean(r[c.marker]).toLowerCase().startsWith('fecha nac'))continue;
    const nm=clean(r[c.name]); const idx=r[c.name-(c.name>1?c.name:0)];
    if(nm && !/fecha|nombre|edad|colegio/i.test(nm) && /[a-zA-ZáéíóúñÁ]/.test(nm) && nm.split(' ').length>=2) set.add(norm(nm)); }
  return set;
}

const PAYS = {
  INGLES:{sheet:'P I 25-26', name:1, cells:[[2,'matricula',null],[3,'mensualidad','2025-09'],[4,'mensualidad','2025-10'],[5,'mensualidad','2025-11'],[6,'mensualidad','2025-12'],[7,'mensualidad','2026-01'],[8,'mensualidad','2026-02'],[9,'mensualidad','2026-03'],[10,'mensualidad','2026-04'],[11,'mensualidad','2026-05'],[12,'mensualidad','2026-06']]},
  APOYO:{sheet:'PA25-26', name:1, cells:[[2,'matricula',null],[3,'mensualidad','2025-09'],[4,'mensualidad','2025-10'],[5,'mensualidad','2025-11'],[6,'mensualidad','2025-12'],[7,'mensualidad','2026-01'],[8,'mensualidad','2026-02'],[9,'mensualidad','2026-03'],[10,'mensualidad','2026-04'],[11,'mensualidad','2026-05'],[12,'mensualidad','2026-06']]},
  DANZA:{sheet:'PD25-26', name:2, cells:[[3,'matricula',null],[4,'mensualidad','2025-09'],[5,'mensualidad','2025-10'],[6,'mensualidad','2025-11'],[7,'mensualidad','2025-12'],[8,'mensualidad','2026-01'],[9,'mensualidad','2026-02'],[10,'mensualidad','2026-03'],[11,'mensualidad','2026-04'],[12,'mensualidad','2026-05'],[13,'mensualidad','2026-06']]},
  ESCUELA:{sheet:'PEs25-26', name:1, cells:[[2,'matricula',null],[3,'material',null],[4,'mensualidad','2025-08'],[5,'mensualidad','2025-09'],[6,'mensualidad','2025-10'],[7,'mensualidad','2025-11'],[8,'mensualidad','2025-12'],[9,'mensualidad','2026-01'],[10,'mensualidad','2026-02'],[11,'mensualidad','2026-03'],[12,'mensualidad','2026-04'],[13,'mensualidad','2026-05']]},
};

for(const [svc,c] of Object.entries(PAYS)){
  const ros = rosterSet(rosterNames[svc]);
  const rows=X.utils.sheet_to_json(wb.Sheets[c.sheet],{header:1,blankrows:false,defval:''});
  let paid=0, exento=0, matched=0, unmatched=0; const unm=[];
  let people=0;
  for(const r of rows){
    const nm=clean(r[c.name]);
    if(!nm || !/[a-zA-ZáéíóúñÁ]/.test(nm) || nm.split(' ').length<2 || /nombre|fecha/i.test(nm)) continue;
    people++;
    const inRoster = ros.has(norm(nm));
    if(inRoster) matched++; else { unmatched++; if(unm.length<6) unm.push(nm); }
    for(const [col,concept,period] of c.cells){
      const v=r[col];
      if(typeof v==='number' && v>1000){ paid++; }
      else if(clean(v).toLowerCase()==='x'){ exento++; }
    }
  }
  console.log(`\n### ${svc} pagos (${c.sheet}): filas-persona=${people} en_roster=${matched} NO_en_roster=${unmatched}`);
  console.log(`   celdas pagadas(fecha)=${paid}  exentas(x)=${exento}`);
  if(unm.length) console.log('   no emparejados (muestra):', unm.join(' | '));
}
