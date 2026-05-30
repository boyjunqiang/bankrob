const fs = require('fs');
const path = require('path');

const files = [
  { in: '棕色袋子.jpg', out: 'bag_brown.png' },
  { in: '深色袋子.jpg', out: 'bag_dark.png' },
  { in: '绿色袋子.png', out: 'bag_green.png' },
  { in: '金色袋子.png', out: 'bag_gold.png' },
  { in: '黄色袋子.jpg', out: 'bag_yellow.png' }
];

async function removeBg(inputFile, outputFile) {
  const inPath = path.join(__dirname, 'public', 'assets', inputFile);
  const outPath = path.join(__dirname, 'public', 'assets', outputFile);
  
  if (!fs.existsSync(inPath)) {
    console.error(`File not found: ${inPath}`);
    return;
  }

  const formData = new FormData();
  formData.append('file', new Blob([fs.readFileSync(inPath)]), inputFile);
  formData.append('model', 'birefnet-general');
  formData.append('alpha_matting', 'true');

  const url = 'http://k165.com:9800/api/proxy/background-removal/api/remove-background-single';

  while (true) {
    console.log(`Processing ${inputFile}...`);
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData
      });

      if (response.status === 202) {
        const retryAfter = response.headers.get('Retry-After') || 5;
        console.log(`Service starting, waiting ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} ${await response.text()}`);
      }

      const buffer = await response.arrayBuffer();
      fs.writeFileSync(outPath, Buffer.from(buffer));
      console.log(`Saved transparent image to ${outputFile}`);
      break;
    } catch (error) {
      console.error(`Error processing ${inputFile}:`, error.message);
      break;
    }
  }
}

async function main() {
  for (const f of files) {
    await removeBg(f.in, f.out);
  }
  console.log('All done!');
}

main();
