// Preview del split de nombres sobre secretaria.students (dry-run, no modifica nada).
// Uso: ts-node scripts/preview-name-split.ts
import { Client } from 'pg';
import * as fs from 'fs';
import { splitName } from '../src/modules/import/name-splitter';

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const { rows } = await client.query(
    `SELECT id, first_name FROM secretaria.students
     WHERE COALESCE(last_name,'')='' AND COALESCE(first_name,'')<>''
     ORDER BY first_name`,
  );
  await client.end();

  const out: string[] = ['id,original,firstName,lastName,flagged,reason'];
  const flagged: string[] = [];
  const csvEsc = (s: string) => '"' + (s || '').replace(/"/g, '""') + '"';

  for (const r of rows) {
    const res = splitName(r.first_name);
    out.push(
      [r.id, csvEsc(r.first_name), csvEsc(res.firstName), csvEsc(res.lastName), res.flagged, csvEsc(res.reason || '')].join(','),
    );
    if (res.flagged) {
      flagged.push(`  [${res.reason}]  "${r.first_name}"  ->  nombre="${res.firstName}" | apellidos="${res.lastName}"`);
    }
  }

  fs.writeFileSync('/tmp/name-split-preview.csv', out.join('\n'));
  console.log(`Total: ${rows.length} alumnos`);
  console.log(`CSV completo: /tmp/name-split-preview.csv`);
  console.log(`\nMarcados para revisión: ${flagged.length}`);
  console.log(flagged.join('\n'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
