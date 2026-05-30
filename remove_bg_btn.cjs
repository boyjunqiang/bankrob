const fs = require('fs');
const path = require('path');

const endpoint = "http://k165.com:9800/api/proxy/background-removal/api/remove-background-single";

async function processImage(filename, outFilename) {
  const filePath = path.join(__dirname, 'public', 'assets', filename);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filename}`);
    return;
  }

  const formData = new FormData();
  const fileData = fs.readFileSync(filePath);
  const blob = new Blob([fileData]);
  formData.append('image', blob, filename);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'image/png'
      }
    });

    if (response.ok) {
      const buffer = await response.arrayBuffer();
      const outPath = path.join(__dirname, 'public', 'assets', outFilename);
      fs.writeFileSync(outPath, Buffer.from(buffer));
      console.log(`Saved transparent image to ${outFilename}`);
    } else {
      console.error(`Failed for ${filename}: ${response.statusText}`);
    }
  } catch (err) {
    console.error(`Error processing ${filename}:`, err);
  }
}

async function main() {
  await processImage('btn_normal.jpg', 'btn_normal.png');
  await processImage('btn_pressed.jpg', 'btn_pressed.png');
  console.log('All done!');
}

main();
