const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const docsDir = path.join(projectRoot, 'docs');

const SOURCES = ['index.html', 'widget.html', 'styles', 'scripts'];
const ensureDir = (dirPath) => fs.mkdirSync(dirPath, { recursive: true });

const copyFile = (src, dest) => {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
};

const copyDir = (src, dest) => {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  entries.forEach((entry) => {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      copyFile(srcPath, destPath);
    }
  });
};

const main = () => {
  ensureDir(docsDir);

  SOURCES.forEach((item) => {
    const srcPath = path.join(projectRoot, item);
    const destPath = path.join(docsDir, item);
    if (!fs.existsSync(srcPath)) return;
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (stat.isFile()) {
      copyFile(srcPath, destPath);
    }
  });

  const noJekyllPath = path.join(docsDir, '.nojekyll');
  fs.writeFileSync(noJekyllPath, '');

  console.log('Docs folder updated for GitHub Pages.');
};

main();
