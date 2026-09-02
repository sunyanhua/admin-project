import { existsSync, copyFileSync, unlinkSync, renameSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getArgs() {
  const args = process.argv.slice(2);
  const isTest = args.includes('--test');
  const isProd = args.includes('--prod');
  const isZoneTest = args.includes('--zone-test');
  const isZoneProd = args.includes('--zone-prod');
  return { isTest, isProd, isZoneTest, isZoneProd };
}

function getOutDir() {
  const { isTest, isZoneTest, isZoneProd } = getArgs();
  if (isZoneTest || isZoneProd) return 'dist-zone';
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
  const { isTest, isProd, isZoneTest, isZoneProd } = getArgs();
  const flags = [isTest, isProd, isZoneTest, isZoneProd].filter(Boolean);
  if (flags.length > 1) {
    console.error('[build] --test / --prod / --zone-test / --zone-prod 互斥，请只指定一个');
    process.exit(1);
  }
  const isZone = isZoneTest || isZoneProd;

  let mode = 'development';
  if (isTest) mode = 'test';
  if (isProd) mode = 'production';
  if (isZoneTest) mode = 'zone-test';
  if (isZoneProd) mode = 'zone-production';

  const outDir = getOutDir();

  preserveWebConfig('backup');

  try {
    console.log(`[build] Building for ${mode}...`);

    if (existsSync(outDir)) {
      rmSync(outDir, { recursive: true, force: true });
    }

    execSync(`npx vite build --mode ${mode}`, { stdio: 'inherit' });

    if (isZone) {
      // 专区管理后台：zone.html 是唯一入口，改名为 index.html（IIS 默认文档）
      const zonePath = path.join(__dirname, '..', outDir, 'zone.html');
      const indexPath = path.join(__dirname, '..', outDir, 'index.html');
      if (existsSync(zonePath)) {
        if (existsSync(indexPath)) unlinkSync(indexPath);
        renameSync(zonePath, indexPath);
        console.log(`[build] Renamed zone.html -> index.html`);
      }
    } else {
      const indexPath = path.join(__dirname, '..', outDir, 'index.html');
      const adminPath = path.join(__dirname, '..', outDir, 'admin.html');
      if (existsSync(indexPath)) {
        // IIS 默认文档认 index.html（服务器 web.config 不含 admin.html），
        // 保留 index.html 作为默认文档入口，另复制 admin.html 兼容既有访问路径
        copyFileSync(indexPath, adminPath);
        console.log(`[build] Copied index.html -> admin.html`);
      }
    }
  } finally {
    preserveWebConfig('restore');
  }

  // 清理临时目录
  const tmpDir = path.join(__dirname, '..', `${outDir}-tmp`);
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true });
    console.log(`[build] Cleaned up: ${outDir}-tmp/`);
  }
  console.log(`[build] Done: ${outDir}/`);
}

build();
