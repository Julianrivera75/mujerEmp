/*
 * Configura el CORS del bucket de almacenamiento (Cloudflare R2 u otro compatible con S3) para que el
 * navegador pueda subir archivos directo con las URLs firmadas desde el sitio de la plataforma.
 *
 * Usa las variables S3_ENDPOINT, S3_BUCKET_NAME, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY y S3_REGION.
 *
 *   node scripts/storage-cors.js https://plataforma.empoderadasdiversas.com          (muestra lo que aplicaría)
 *   node scripts/storage-cors.js https://plataforma.empoderadasdiversas.com --apply
 */
const { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } = require('@aws-sdk/client-s3');

function client(prefix = 'S3') {
  const endpoint = process.env[`${prefix}_ENDPOINT`];
  const accessKeyId = process.env[`${prefix}_ACCESS_KEY_ID`];
  const secretAccessKey = process.env[`${prefix}_SECRET_ACCESS_KEY`];
  const bucket = process.env[`${prefix}_BUCKET_NAME`];
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      `Faltan variables ${prefix}_ENDPOINT, ${prefix}_BUCKET_NAME, ${prefix}_ACCESS_KEY_ID o ${prefix}_SECRET_ACCESS_KEY.`,
    );
  }
  return {
    bucket,
    s3: new S3Client({
      region: process.env[`${prefix}_REGION`] || 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    }),
  };
}

async function main() {
  const origin = process.argv[2];
  const apply = process.argv.includes('--apply');
  if (!origin || !/^https:\/\/[^\s/]+$/.test(origin)) {
    console.error('Uso: node scripts/storage-cors.js https://tu-dominio [--apply]');
    process.exit(1);
  }

  const rules = [
    {
      AllowedOrigins: [origin],
      AllowedMethods: ['PUT', 'GET', 'HEAD'],
      AllowedHeaders: ['content-type'],
      ExposeHeaders: ['ETag'],
      MaxAgeSeconds: 3600,
    },
  ];

  const { s3, bucket } = client();
  console.error(`Bucket: ${bucket}`);
  console.error(`Regla CORS: ${JSON.stringify(rules)}`);
  if (!apply) {
    console.error('Simulación: no se cambió nada. Agrega --apply para aplicarla.');
    return;
  }
  await s3.send(new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: { CORSRules: rules } }));
  const current = await s3.send(new GetBucketCorsCommand({ Bucket: bucket }));
  console.error(`CORS aplicado (${current.CORSRules?.length ?? 0} regla).`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
