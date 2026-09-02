import { existsSync, copyFileSync, unlinkSync, rmSync, readdirSync } from 'fs';
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

function getMainOutDir() {
  const { isTest, isZoneTest } = getArgs();
  return isTest || isZoneTest ? 'dist-test' : 'dist';
}

function preserveWebConfig(action = 'backup', outDir) {
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

/** 将 dist-zone 的入口与资源合并进主产物目录（专区后台与主后台共用同一管理目录部署） */
function mergeZoneIntoMain(mainOutDir) {
  const zoneDir = path.join(__dirname, '..', 'dist-zone');
  const mainDir = path.join(__dirname, '..', mainOutDir);

  // 入口：zone.html 保持原名（访问地址 /cheng/zone.html）
  const zoneHtml = path.join(zoneDir, 'zone.html');
  if (existsSync(zoneHtml)) {
    copyFileSync(zoneHtml, path.join(mainDir, 'zone.html'));
    console.log(`[build] Merged zone.html -> ${mainOutDir}/zone.html`);
  }

  // 资源：按文件合并（同哈希文件内容一致，覆盖无副作用）
  const zoneAssets = path.join(zoneDir, 'assets');
  const mainAssets = path.join(mainDir, 'assets');
  if (existsSync(zoneAssets)) {
    for (const f of readdirSync(zoneAssets)) {
      copyFileSync(path.join(zoneAssets, f), path.join(mainAssets, f));
    }
    console.log(`[build] Merged zone assets -> ${mainOutDir}/assets`);
  }

  rmSync(zoneDir, { recursive: true, force: true });
  console.log('[build] Removed dist-zone/');
}

function copyAdminEntry(mainOutDir) {
  const indexPath = path.join(__dirname, '..', mainOutDir, 'index.html');
  const adminPath = path.join(__dirname, '..', mainOutDir, 'admin.html');
  if (existsSync(indexPath)) {
    // IIS 默认文档认 index.html（服务器 web.config 不含 admin.html），
    // 保留 index.html 作为默认文档入口，另复制 admin.html 兼容既有访问路径
    copyFileSync(indexPath, adminPath);
    console.log('[build] Copied index.html -> admin.html');
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
  const mainOutDir = getMainOutDir();

  preserveWebConfig('backup', mainOutDir);

  try {
    if (!isZone) {
      // ====== 主后台构建（原有流程不变） ======
      const mode = isTest ? 'test' : isProd ? 'production' : 'development';
      console.log(`[build] Building for ${mode}...`);
      if (existsSync(mainOutDir)) {
        rmSync(mainOutDir, { recursive: true, force: true });
      }
      execSync(`npx vite build --mode ${mode}`, { stdio: 'inherit' });
      copyAdminEntry(mainOutDir);
      console.log(`[build] Done: ${mainOutDir}/`);
    } else {
      // ====== 专区管理后台构建：zone 产物 + 主后台产物合并进同一目录 ======
      const zoneMode = isZoneTest ? 'zone-test' : 'zone-production';
      const adminMode = isZoneTest ? 'test' : 'production';

      console.log(`[build] Building zone console for ${zoneMode}...`);
      if (existsSync('dist-zone')) {
        rmSync('dist-zone', { recursive: true, force: true });
      }
      execSync(`npx vite build --mode ${zoneMode}`, { stdio: 'inherit' });

      console.log(`[build] Building admin for ${adminMode}...`);
      if (existsSync(mainOutDir)) {
        rmSync(mainOutDir, { recursive: true, force: true });
      }
      execSync(`npx vite build --mode ${adminMode}`, { stdio: 'inherit' });
      copyAdminEntry(mainOutDir);

      mergeZoneIntoMain(mainOutDir);
      console.log(`[build] Done: ${mainOutDir}/ (admin + zone.html)`);
    }
  } finally {
    preserveWebConfig('restore', mainOutDir);
  }

  // 清理临时目录
  const tmpDir = path.join(__dirname, '..', `${mainOutDir}-tmp`);
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true });
    console.log(`[build] Cleaned up: ${tmpDir}/`);
  }
}

build();
