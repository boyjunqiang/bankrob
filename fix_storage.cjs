const fs = require('fs');
const path = require('path');

const scenesDir = path.join(__dirname, 'src', 'scenes');
const files = fs.readdirSync(scenesDir).filter(f => f.endsWith('.js'));

for (const file of files) {
  const filePath = path.join(scenesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  let modified = false;

  if (content.includes('localStorage.')) {
    // Add import if not exists
    if (!content.includes('../utils/storage.js')) {
      content = content.replace(/(import .*;\n)+/, match => match + "import { getStorage, setStorage } from '../utils/storage.js';\n");
    }

    // Replace try { localStorage.setItem(...) } catch(...) { ... } with setStorage(...)
    content = content.replace(/try\s*\{\s*localStorage\.setItem\(([^,]+),\s*(.+?)\);\s*\}\s*catch\s*\([^)]*\)\s*\{\s*[^}]*\s*\}/g, 'setStorage($1, $2);');
    content = content.replace(/try\s*\{\s*localStorage\.setItem\(([^,]+),\s*(.+?)\);\s*\}\s*catch[^{]*\{\}/g, 'setStorage($1, $2);');

    // Replace localStorage.setItem(...) with setStorage(...)
    content = content.replace(/localStorage\.setItem\(([^,]+),\s*(.+?)\);?/g, 'setStorage($1, $2);');

    // Replace localStorage.getItem(...) with getStorage(...)
    content = content.replace(/localStorage\.getItem\((.+?)\)/g, 'getStorage($1)');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + file);
  }
}
