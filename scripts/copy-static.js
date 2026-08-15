/**
 * Copies public/ into dist/ after a build.
 *
 * app.ts serves `path.join(__dirname, 'public')`. Under ts-node that resolves
 * to Backend/public and everything works; from a compiled build __dirname is
 * dist/, and tsc only emits JavaScript — so a production server had no CSV
 * templates to serve and /templates 404'd. Nothing catches this in
 * development, which is exactly why it went unnoticed.
 *
 * Also creates the scratch directory multer writes uploads into before
 * parsing them, so the first bulk import does not fail on a read-only or
 * missing path.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const from = path.join(root, 'public');
const to = path.join(root, 'dist', 'public');

if (!fs.existsSync(from)) {
    console.error(`copy-static: ${from} does not exist`);
    process.exit(1);
}

fs.cpSync(from, to, { recursive: true });
fs.mkdirSync(path.join(to, 'my-uploads'), { recursive: true });

console.log(`copy-static: ${path.relative(root, from)} -> ${path.relative(root, to)}`);
