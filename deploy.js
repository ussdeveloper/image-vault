import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

function deploy() {
  const configFile = path.join(__dirname, 'target-dir');
  if (!fs.existsSync(configFile)) {
    console.error('Config file "target-dir" not found.');
    process.exit(1);
  }

  const content = fs.readFileSync(configFile, 'utf8');
  const targetMatch = content.match(/target-dir:\s*(.+)/);
  const replaceMatch = content.match(/replace:\s*(.+)/);

  if (!targetMatch) {
    console.error('Could not find target-dir in config.');
    process.exit(1);
  }

  const targetPath = targetMatch[1].trim();
  const shouldReplace = replaceMatch ? replaceMatch[1].trim() === 'true' : false;
  const distPath = path.join(__dirname, 'dist');

  if (!fs.existsSync(distPath)) {
    console.error('Dist folder not found. Please run "npm run build" first.');
    process.exit(1);
  }

  console.log(`Target path: ${targetPath}`);
  console.log(`Replace: ${shouldReplace}`);

  if (shouldReplace && fs.existsSync(targetPath)) {
    console.log(`Clearing target directory: ${targetPath}`);
    fs.rmSync(targetPath, { recursive: true, force: true });
  }

  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }

  console.log('Copying files from dist to target...');
  copyRecursiveSync(distPath, targetPath);
  console.log('Deployment completed successfully!');
}

deploy();
