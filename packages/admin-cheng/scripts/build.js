import { existsSync, copyFileSync, unlinkSync, renameSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getArgs() {
  const args = process.argv.slice(2);
  const isTest = args.includes('--test');
  const isProd = args.includes('--prod');
  return { isTest, isProd };
}

function getOutDir() {
  const { isTest } = getArgs();
  return isTest ? 'dist-test' : 'dist';
}

function preserveWebConfig(action = 'backup') {
  const outDir = getOutDir();
  const webConfigPath = path.join(__dirname, '..', outDir, 'web.config');
  const tempPath = path.join(__dirname, '..', '.web.config.tmp');

  if (action === 'backup') {
    if (existsSync(webConfigPath)) {
      copyFileSync(webConfigPath, tempPath);
      console.log('[build] web.config backed up');
    }
  } else if (action === 'restore') {
    if (existsSync(tempPath)) {
      copyFileSync(tempPath, webConfigPath);
      unlinkSync(tempPath);
      console.log('[build] web.config restored');
    }
  }
}

function build() {
  const { isTest, isProd } = getArgs();
  let mode = 'development';
  if (isTest) mode = 'test';
  if (isProd) mode = 'production';

  const outDir = getOutDir();

  preserveWebConfig('backup');

  try {
    console.log(`[build] Building for ${mode}...`);

    if (existsSync(outDir)) {
      rmSync(outDir, { recursive: true, force: true });
    }

    execSync(`npx vite build --mode ${mode}`, { stdio: 'inherit' });

    const indexPath = path.join(__dirname, '..', outDir, 'index.html');
    const adminPath = path.join(__dirname, '..', outDir, 'admin.html');
    if (existsSync(indexPath)) {
      renameSync(indexPath, adminPath);
      console.log(`[build] Renamed index.html -> admin.html`);
    }
  } finally {
    preserveWebConfig('restore');
  }

  console.log(`[build] Done: ${outDir}/`);
}

build();
