/*
 * Genera los logos optimizados de public/logos a partir de los originales en docs/imagenes:
 * recorta los márgenes y los reduce a un tamaño adecuado para la web.
 *
 *   node scripts/optimize-logos.js
 */
const path = require('path');
const sharp = require('sharp');

const SOURCE = path.join(__dirname, '..', 'docs', 'imagenes');
const TARGET = path.join(__dirname, '..', 'public', 'logos');

const LOGOS = [
  { file: 'Empoderadas Diversas.jpeg', out: 'empoderadas-diversas.png', width: 640, background: '#ffffff' },
  { file: 'Voces Poderosas.jpeg', out: 'voces-poderosas.png', width: 360, background: '#ffffff' },
  { file: 'Impacto360.jpeg', out: 'impacto-360.png', width: 360, circle: true },
  { file: 'CUCUniversity.jpeg', out: 'cuc-university.png', width: 360, background: '#000000' },
  { file: 'LydaCorrea.jpeg', out: 'lyda-correa.png', width: 360, background: '#000c2e' },
  { file: 'Magos.jpeg', out: 'magos-apple-fix.png', width: 240, crop: { left: 100, top: 565, width: 720, height: 730 } },
  { file: 'Mujeres en break.jpeg', out: 'mujeres-en-break.png', width: 300, background: '#ffffff' },
  { file: 'Museo.jpeg', out: 'museo-empresarial-cultural.png', width: 360, background: '#ffffff' },
];

async function main() {
  for (const logo of LOGOS) {
    const input = path.join(SOURCE, logo.file);
    let image;
    if (logo.circle) {
      // Impacto360 va dentro de un círculo: se recorta un cuadrado centrado para conservar solo el círculo.
      const meta = await sharp(input).metadata();
      const side = Math.round(meta.height * 0.97);
      image = sharp(input).extract({
        left: Math.round((meta.width - side) / 2),
        top: Math.round((meta.height - side) / 2),
        width: side,
        height: side,
      });
    } else if (logo.crop) {
      // Este original trae mucho fondo y una marca de agua: se recorta el área del logo a mano.
      image = sharp(input).extract(logo.crop);
    } else {
      image = sharp(input).trim({ background: logo.background, threshold: 28 });
    }
    const info = await image
      .resize({ width: logo.width, withoutEnlargement: true })
      .png({ compressionLevel: 9, palette: true })
      .toFile(path.join(TARGET, logo.out));
    console.log(`${logo.out}: ${info.width}x${info.height} (${Math.round(info.size / 1024)} KB)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
