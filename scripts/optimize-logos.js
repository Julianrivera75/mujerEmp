/*
 * Genera los logos optimizados de public/logos a partir de los originales en docs/imagenes:
 * recorta los márgenes, quita el fondo blanco (queda transparente) y los reduce a un tamaño adecuado para la web.
 *
 *   node scripts/optimize-logos.js
 */
const path = require('path');
const sharp = require('sharp');

const SOURCE = path.join(__dirname, '..', 'docs', 'imagenes');
const TARGET = path.join(__dirname, '..', 'public', 'logos');

// `transparent`: el fondo blanco pasa a transparente. `floor` es el gris más claro que se descarta (marcas de agua tenues).
const LOGOS = [
  {
    file: 'Empoderadas Diversas.jpeg',
    out: 'empoderadas-diversas.png',
    width: 640,
    background: '#ffffff',
    transparent: true,
    floor: 40,
  },
  { file: 'Voces Poderosas.jpeg', out: 'voces-poderosas.png', width: 360, background: '#ffffff', transparent: true },
  { file: 'Impacto360.jpeg', out: 'impacto-360.png', width: 360, circle: true },
  { file: 'CUCUniversity.jpeg', out: 'cuc-university.png', width: 360, background: '#000000' },
  { file: 'LydaCorrea.jpeg', out: 'lyda-correa.png', width: 360, background: '#000c2e' },
  {
    file: 'Magos.jpeg',
    out: 'magos-apple-fix.png',
    width: 240,
    crop: { left: 100, top: 565, width: 720, height: 730 },
  },
  { file: 'Mujeres en break.jpeg', out: 'mujeres-en-break.png', width: 300, background: '#ffffff', transparent: true },
  // Versión blanca sobre fondo transparente: se muestra sobre una base oscura.
  { file: 'alcaldialocalsantafe-sinfondo.png', out: 'alcaldia-santa-fe.png', width: 360, alphaTrim: true },
  { file: 'Museo.jpeg', out: 'museo-empresarial-cultural.png', width: 360, background: '#ffffff', transparent: true },
];

/** Convierte el fondo blanco en transparencia conservando el suavizado de los bordes. */
async function whiteToAlpha(image, floor = 12) {
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const raw = 255 - Math.min(r, g, b);
    const alpha = raw <= floor ? 0 : Math.min(255, Math.round(((raw - floor) * 255) / (255 - floor)));
    if (alpha === 0) {
      data[i] = data[i + 1] = data[i + 2] = 0;
    } else {
      // píxel = a·color + (1 − a)·blanco  →  color = 255 − (255 − píxel) / a
      const a = raw / 255;
      const unmix = (c) => Math.max(0, Math.min(255, Math.round(255 - (255 - c) / a)));
      data[i] = unmix(r);
      data[i + 1] = unmix(g);
      data[i + 2] = unmix(b);
    }
    data[i + 3] = alpha;
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
}

/** Versión del logo principal para fondos oscuros: el morado pasa a blanco y el rosa se aclara un poco. */
async function lightVariant(file, out) {
  const { data, info } = await sharp(path.join(TARGET, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // El alfa de los trazos sólidos oscuros quedó parcial al quitar el fondo: se refuerza para que el blanco sea pleno.
    data[i + 3] = Math.min(255, Math.round(data[i + 3] * 1.45));
    if (b > r + 12) {
      data[i] = data[i + 1] = data[i + 2] = 255;
    } else {
      data[i] = Math.round(r + (255 - r) * 0.3);
      data[i + 1] = Math.round(g + (255 - g) * 0.3);
      data[i + 2] = Math.round(b + (255 - b) * 0.3);
    }
  }
  const info2 = await sharp(data, { raw: info })
    .png({ compressionLevel: 9, palette: true })
    .toFile(path.join(TARGET, out));
  console.log(`${out}: ${info2.width}x${info2.height} (${Math.round(info2.size / 1024)} KB)`);
}

async function main() {
  for (const logo of LOGOS) {
    const input = path.join(SOURCE, logo.file);
    let image;
    if (logo.circle) {
      // Impacto360 va dentro de un círculo: se recorta un cuadrado centrado y se enmascara para dejar solo el círculo.
      const meta = await sharp(input).metadata();
      const side = Math.round(meta.height * 0.97);
      const mask = Buffer.from(
        `<svg width="${side}" height="${side}"><circle cx="${side / 2}" cy="${side / 2}" r="${side / 2}" fill="#fff"/></svg>`,
      );
      image = sharp(
        await sharp(input)
          .extract({
            left: Math.round((meta.width - side) / 2),
            top: Math.round((meta.height - side) / 2),
            width: side,
            height: side,
          })
          .composite([{ input: mask, blend: 'dest-in' }])
          .png()
          .toBuffer(),
      );
    } else if (logo.crop) {
      // Este original trae mucho fondo y una marca de agua: se recorta el área del logo a mano.
      image = sharp(input).extract(logo.crop);
    } else if (logo.alphaTrim) {
      image = sharp(await sharp(input).trim({ background: '#00000000', threshold: 8 }).png().toBuffer());
    } else {
      image = sharp(input).trim({ background: logo.background, threshold: 28 });
    }
    if (logo.transparent) {
      image = await whiteToAlpha(sharp(await image.png().toBuffer()), logo.floor);
    }
    const info = await image
      .resize({ width: logo.width, withoutEnlargement: true })
      .png({ compressionLevel: 9, palette: true })
      .toFile(path.join(TARGET, logo.out));
    console.log(`${logo.out}: ${info.width}x${info.height} (${Math.round(info.size / 1024)} KB)`);
  }
  await lightVariant('empoderadas-diversas.png', 'empoderadas-diversas-claro.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
