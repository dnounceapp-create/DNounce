import sharp from "sharp";
import fs from "fs";

const input = "public/icons/logoicon-512x512.png";
const outputDir = "public/icons";

const sizes = [120, 152, 167, 180];

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

(async () => {
  for (const size of sizes) {
    const filename = `${outputDir}/logoicon-${size}x${size}.png`;
    await sharp(input).resize(size, size).toFile(filename);
    console.log(`✅ Generated ${filename}`);
  }
})();