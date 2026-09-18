const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const srcDir = 'c:/AM-PM-Skincare/ezgif-407dcb96eaf7d49d-jpg';
const destDir = 'c:/AM-PM-Skincare/Am-PM-Skincareweb/public/frames';

async function processAllFrames() {
  console.log('Starting 1080p Lanczos3 & Unsharp Mask enhancement for 300 frames...');
  const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.jpg')).sort();
  
  const startTime = Date.now();
  let completed = 0;

  // Process in batches of 15 concurrently for maximum speed
  const concurrency = 15;
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    await Promise.all(batch.map(async (file) => {
      const srcPath = path.join(srcDir, file);
      const destPath = path.join(destDir, file);

      await sharp(srcPath)
        .resize(1920, 1080, {
          kernel: sharp.kernel.lanczos3,
          fit: 'cover',
          position: 'center'
        })
        .sharpen({
          sigma: 1.1,
          m1: 1.0,
          m2: 2.2
        })
        .jpeg({
          quality: 92,
          mozjpeg: true
        })
        .toFile(destPath);

      completed++;
    }));

    process.stdout.write(`\rProgress: ${completed} / ${files.length} frames enhanced (${Math.round((completed/files.length)*100)}%)`);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nSuccessfully enhanced all ${completed} frames to 1920x1080 in ${duration}s!`);
}

processAllFrames().catch(err => {
  console.error('Enhancement error:', err);
  process.exit(1);
});
