/*
 * Copia todos los archivos del bucket actual (variables S3_*) a otro bucket (variables DEST_S3_*), por ejemplo
 * al pasar de Railway a Cloudflare R2. Conserva las claves y el tipo de cada archivo, así que las entregas,
 * materiales y fotos ya registrados en la base de datos siguen funcionando sin cambios.
 *
 * Por defecto solo cuenta y lista (no escribe). Con --apply copia; los archivos que ya existen en el destino
 * con el mismo tamaño se omiten, así que se puede repetir sin problema.
 *
 * Variables del destino: DEST_S3_ENDPOINT, DEST_S3_BUCKET_NAME, DEST_S3_ACCESS_KEY_ID, DEST_S3_SECRET_ACCESS_KEY,
 * DEST_S3_REGION (opcional, por defecto "auto").
 *
 *   railway ssh --service app -- node scripts/copy-storage.js            (simulación)
 *   railway ssh --service app -- node scripts/copy-storage.js --apply
 */
const {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} = require('@aws-sdk/client-s3');

function makeClient(prefix) {
  const endpoint = process.env[`${prefix}ENDPOINT`];
  const accessKeyId = process.env[`${prefix}ACCESS_KEY_ID`];
  const secretAccessKey = process.env[`${prefix}SECRET_ACCESS_KEY`];
  const bucket = process.env[`${prefix}BUCKET_NAME`];
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      `Faltan variables ${prefix}ENDPOINT, ${prefix}BUCKET_NAME, ${prefix}ACCESS_KEY_ID o ${prefix}SECRET_ACCESS_KEY.`,
    );
  }
  return {
    bucket,
    s3: new S3Client({
      region: process.env[`${prefix}REGION`] || 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    }),
  };
}

async function* listAll(s3, bucket) {
  let token;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }));
    for (const item of page.Contents ?? []) yield item;
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
}

async function existsWithSize(s3, bucket, key, size) {
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return head.ContentLength === size;
  } catch {
    return false;
  }
}

async function main() {
  const apply = process.argv.includes('--apply');
  const source = makeClient('S3_');
  const dest = makeClient('DEST_S3_');
  if (source.bucket === dest.bucket && process.env.S3_ENDPOINT === process.env.DEST_S3_ENDPOINT) {
    throw new Error('El origen y el destino son el mismo bucket.');
  }

  console.error(`Origen: ${source.bucket} -> Destino: ${dest.bucket} (${apply ? 'copiando' : 'simulación'})`);
  let total = 0;
  let bytes = 0;
  let copied = 0;
  let skipped = 0;
  let failed = 0;

  for await (const item of listAll(source.s3, source.bucket)) {
    total += 1;
    bytes += item.Size ?? 0;
    if (!apply) continue;

    try {
      if (await existsWithSize(dest.s3, dest.bucket, item.Key, item.Size)) {
        skipped += 1;
        continue;
      }
      const object = await source.s3.send(new GetObjectCommand({ Bucket: source.bucket, Key: item.Key }));
      const body = Buffer.from(await object.Body.transformToByteArray());
      await dest.s3.send(
        new PutObjectCommand({
          Bucket: dest.bucket,
          Key: item.Key,
          Body: body,
          ContentType: object.ContentType,
        }),
      );
      copied += 1;
    } catch (err) {
      failed += 1;
      console.error(`No se pudo copiar ${item.Key}: ${err.message}`);
    }
  }

  const mb = (bytes / (1024 * 1024)).toFixed(1);
  console.error(`Archivos en el origen: ${total} (${mb} MB).`);
  if (apply) console.error(`Copiados: ${copied}. Ya estaban: ${skipped}. Con error: ${failed}.`);
  else console.error('Simulación: no se copió nada. Agrega --apply para copiar.');
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
