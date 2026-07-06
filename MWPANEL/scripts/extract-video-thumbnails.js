#!/usr/bin/env node
/**
 * Extrae fotogramas de los vídeos del blog que no tienen thumbnail propio en Drive,
 * usando ffmpeg del host. Sube cada frame a Drive y guarda el thumbnailFileId en
 * BlogMedia.metadata para que el endpoint /video-thumbnail/:id lo sirva.
 *
 * Requisitos:
 *   - ffmpeg en /usr/bin/ffmpeg (verificado: sí)
 *   - google-credentials.json (service account) en /opt/mw-panel/backend/
 *   - docker access para psql al contenedor mw-panel-db-prod
 *   - googleapis y mime-types como deps (este script las instala en /tmp si no están)
 *
 * Uso:
 *   node /opt/mw-panel/scripts/extract-video-thumbnails.js dry      # lista qué hará
 *   node /opt/mw-panel/scripts/extract-video-thumbnails.js apply    # ejecuta de verdad
 *   node /opt/mw-panel/scripts/extract-video-thumbnails.js apply 5  # solo 5 vídeos
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync, spawnSync } = require('child_process');

const MODE = process.argv[2] || 'dry';
const LIMIT_OVERRIDE = process.argv[3] ? parseInt(process.argv[3], 10) : null;

if (!['dry', 'apply'].includes(MODE)) {
  console.error('Uso: node extract-video-thumbnails.js [dry|apply] [limit?]');
  process.exit(1);
}

// Asegurar deps en /tmp/blog-thumb-tools
const DEPS_DIR = '/tmp/blog-thumb-tools';
const REQUIRED = ['googleapis'];

function ensureDeps() {
  if (!fs.existsSync(DEPS_DIR)) {
    fs.mkdirSync(DEPS_DIR, { recursive: true });
  }
  const pkgPath = path.join(DEPS_DIR, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    fs.writeFileSync(pkgPath, '{"name":"blog-thumb-tools","version":"1.0.0","private":true}');
  }
  for (const dep of REQUIRED) {
    const depPath = path.join(DEPS_DIR, 'node_modules', dep);
    if (!fs.existsSync(depPath)) {
      console.log(`Instalando ${dep} en ${DEPS_DIR}...`);
      execFileSync('npm', ['install', dep, '--no-save', '--silent'], { cwd: DEPS_DIR, stdio: 'inherit' });
    }
  }
}

ensureDeps();

const { google } = require(path.join(DEPS_DIR, 'node_modules', 'googleapis'));

const CREDENTIALS_PATH = '/opt/mw-panel/backend/google-credentials.json';
if (!fs.existsSync(CREDENTIALS_PATH)) {
  console.error(`No existe ${CREDENTIALS_PATH}`);
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  keyFile: CREDENTIALS_PATH,
  scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

function dbQuery(sql) {
  const result = spawnSync('docker', [
    'exec', 'mw-panel-db-prod', 'psql', '-U', 'mwpanel', '-d', 'mwpanel',
    '-At', '-F', '|', '-c', sql,
  ], { encoding: 'utf-8' });
  if (result.status !== 0) {
    throw new Error(`psql failed: ${result.stderr}`);
  }
  return result.stdout.trim().split('\n').filter(Boolean);
}

function dbExec(sql) {
  const result = spawnSync('docker', [
    'exec', 'mw-panel-db-prod', 'psql', '-U', 'mwpanel', '-d', 'mwpanel',
    '-c', sql,
  ], { encoding: 'utf-8' });
  if (result.status !== 0) {
    throw new Error(`psql failed: ${result.stderr}`);
  }
}

async function downloadVideo(fileId, destPath) {
  const res = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'stream' },
  );
  await new Promise((resolve, reject) => {
    const out = fs.createWriteStream(destPath);
    res.data.pipe(out);
    res.data.on('error', reject);
    out.on('finish', resolve);
    out.on('error', reject);
  });
}

function extractFrame(videoPath, framePath) {
  // -ss antes de -i: seek rápido. -frames:v 1: un solo frame.
  // -vf scale='min(640,iw)':-2 : máx 640 ancho, alto par.
  const args = [
    '-y',
    '-ss', '00:00:01',
    '-i', videoPath,
    '-frames:v', '1',
    '-vf', "scale='min(640,iw)':-2",
    '-q:v', '4',
    framePath,
  ];
  const res = spawnSync('/usr/bin/ffmpeg', args, { encoding: 'utf-8' });
  if (res.status !== 0) {
    // Reintentar con seek a 00:00:00 (vídeos muy cortos)
    const args2 = [
      '-y',
      '-i', videoPath,
      '-frames:v', '1',
      '-vf', "scale='min(640,iw)':-2",
      '-q:v', '4',
      framePath,
    ];
    const res2 = spawnSync('/usr/bin/ffmpeg', args2, { encoding: 'utf-8' });
    if (res2.status !== 0) {
      throw new Error(`ffmpeg failed: ${res2.stderr.split('\n').slice(-3).join(' | ')}`);
    }
  }
  if (!fs.existsSync(framePath) || fs.statSync(framePath).size === 0) {
    throw new Error('ffmpeg generó un fichero vacío');
  }
}

async function uploadFrame(framePath, parentFolderId, name) {
  const res = await drive.files.create({
    requestBody: { name, parents: [parentFolderId] },
    media: {
      mimeType: 'image/jpeg',
      body: fs.createReadStream(framePath),
    },
    supportsAllDrives: true,
    fields: 'id',
  });
  // Permisos públicos
  try {
    await drive.permissions.create({
      fileId: res.data.id,
      requestBody: { role: 'reader', type: 'anyone' },
      supportsAllDrives: true,
    });
  } catch (e) {
    // ok, perms pueden fallar en algunas configs
  }
  return res.data.id;
}

async function main() {
  // Selecciona vídeos cuyo metadata.thumbnailFileId NO está
  let sql = `
    SELECT id,
           metadata->>'googleDriveId' AS drive_id,
           metadata->>'folderId' AS folder_id,
           filename
    FROM blog_media
    WHERE type = 'video'
      AND metadata->>'googleDriveId' IS NOT NULL
      AND (metadata->>'thumbnailFileId' IS NULL OR metadata->>'thumbnailFileId' = '')
    ORDER BY "createdAt" DESC
  `;
  if (LIMIT_OVERRIDE) sql += ` LIMIT ${LIMIT_OVERRIDE}`;
  sql += ';';

  const rows = dbQuery(sql);
  console.log(`Encontrados ${rows.length} vídeos sin thumbnailFileId.`);
  if (rows.length === 0) return;

  let ok = 0, fail = 0;
  for (let i = 0; i < rows.length; i++) {
    const [id, driveId, folderId, filename] = rows[i].split('|');
    const tag = `[${i + 1}/${rows.length}] ${id.slice(0, 8)} ${filename}`;
    if (MODE === 'dry') {
      console.log(`${tag} (driveId=${driveId}, folder=${folderId || 'NONE'}) -> would extract`);
      continue;
    }
    const tmpVideo = path.join(os.tmpdir(), `bt-${id}.bin`);
    const tmpFrame = path.join(os.tmpdir(), `bt-${id}.jpg`);
    try {
      console.log(`${tag} downloading...`);
      await downloadVideo(driveId, tmpVideo);
      const sizeMb = (fs.statSync(tmpVideo).size / 1024 / 1024).toFixed(1);
      console.log(`${tag} extracting frame from ${sizeMb}MB...`);
      extractFrame(tmpVideo, tmpFrame);
      // Si no hay folderId guardado, subir a la carpeta padre del propio vídeo
      let parent = folderId;
      if (!parent) {
        const meta = await drive.files.get({ fileId: driveId, fields: 'parents', supportsAllDrives: true });
        parent = meta.data.parents?.[0];
      }
      if (!parent) {
        throw new Error('No se pudo determinar carpeta padre en Drive');
      }
      console.log(`${tag} uploading frame to Drive folder ${parent}...`);
      const thumbId = await uploadFrame(tmpFrame, parent, `thumb_${filename}.jpg`);
      console.log(`${tag} updating DB...`);
      const escapedThumbId = thumbId.replace(/'/g, "''");
      dbExec(`
        UPDATE blog_media
        SET metadata = jsonb_set(
              COALESCE(metadata::jsonb, '{}'::jsonb),
              '{thumbnailFileId}',
              to_jsonb('${escapedThumbId}'::text)
            )::json
        WHERE id = '${id}';
      `);
      console.log(`${tag} ✅ DONE (thumb=${thumbId})`);
      ok++;
    } catch (e) {
      console.error(`${tag} ❌ FAIL: ${e.message}`);
      fail++;
    } finally {
      try { fs.unlinkSync(tmpVideo); } catch {}
      try { fs.unlinkSync(tmpFrame); } catch {}
    }
  }
  console.log(`---\nResumen: ${ok} OK, ${fail} fallos (modo=${MODE}).`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
