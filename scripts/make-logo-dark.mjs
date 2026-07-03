import sharp from "sharp";

const { data, info } = await sharp("C:/Users/Alex/Downloads/112.png")
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;
const buf = Buffer.from(data);

for (let i = 0; i < buf.length; i += channels) {
  const r = buf[i], g = buf[i + 1], b = buf[i + 2];

  // Fundo branco → transparente
  if (r > 230 && g > 230 && b > 230) {
    buf[i + 3] = 0;
    continue;
  }

  // Azul escuro (#0A2238 e variações) → branco
  if (r < 80 && g < 80 && b > g && b > r) {
    buf[i] = 255;
    buf[i + 1] = 255;
    buf[i + 2] = 255;
  }
}

await sharp(buf, { raw: { width, height, channels } })
  .png()
  .toFile("D:/sistema altis/app/public/logo-dark.png");

console.log("logo-dark.png criado com sucesso.");
