#!/usr/bin/env node
/**
 * mublo-editor → 각 프로젝트 배포 스크립트
 *
 * 사용법:
 *   node tools/sync.mjs mublo-public              # 특정 프로젝트에만 배포
 *   node tools/sync.mjs mublo-public mublo-dev    # 여러 프로젝트
 *   node tools/sync.mjs --all                     # 에디터가 설치된 모든 프로젝트
 *   node tools/sync.mjs --all --dry-run           # 복사 없이 대상만 출력
 *   node tools/sync.mjs mublo-biz --with-config   # config.php 포함 배포 (주의)
 *   node tools/sync.mjs --dist                    # 배포용 파일만 dist/ 에 모아서 생성
 *
 * config.php 는 프로젝트별 커스터마이징 대상이므로 기본적으로 배포에서 제외한다.
 * (예: mublo-biz 는 자체 config.php 를 사용 중)
 */
import { cpSync, existsSync, readdirSync, statSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));   // mublo-editor/
const PROJECTS_ROOT = dirname(ROOT);                             // d:/project/mublo/
const LIB_SUBPATH = join('public', 'assets', 'lib', 'editor', 'mublo-editor');

// 배포 대상 파일 (config.php 제외)
const SYNC_FILES = [
    'MubloEditor.js',
    'MubloEditor.css',
    'MubloEditor.d.ts',
    'README.md',
    'LICENSE',
    'index.html',
    'editor.lib.php',
    'package.json',
    join('plugins', 'MubloEditorImageUpload.js'),
    join('plugins', 'MubloEditorLayouts.js'),
    join('plugins', 'MubloEditorFileImport.js'),
    join('plugins', 'MubloEditorExport.js'),
    join('plugins', 'MubloEditorStickers.js'),
    join('plugins', 'stickers'),                    // 스티커 팩 에셋 + packs.js (디렉터리)
    join('plugins', 'upload', 'upload.php'),
    join('plugins', 'upload', 'upload.html'),
    join('plugins', 'upload', 'README.md'),
    join('plugins', 'upload', '.htaccess'),
    join('plugins', 'opengraph', 'og-proxy.php'),
    join('plugins', 'import', 'convert.php'),
];
const CONFIG_FILES = ['config.php'];

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const all = args.includes('--all');
const withConfig = args.includes('--with-config');
const dist = args.includes('--dist');
const named = args.filter(a => !a.startsWith('--'));

// --dist: 프로젝트 배포와 동일한 파일 목록을 dist/ 에 모아서 생성 (배포 패키지 확인용)
if (dist) {
    const distDir = join(ROOT, 'dist');
    const files = withConfig ? [...SYNC_FILES, ...CONFIG_FILES] : SYNC_FILES;
    rmSync(distDir, { recursive: true, force: true });
    console.log(`→ dist/ 생성${dryRun ? ' (dry-run)' : ''}`);
    for (const file of files) {
        const src = join(ROOT, file);
        if (!existsSync(src)) { console.log(`  스킵 (원본 없음): ${file}`); continue; }
        if (!dryRun) {
            const to = join(distDir, file);
            mkdirSync(dirname(to), { recursive: true });
            cpSync(src, to, { recursive: true });
        }
        console.log(`  ${file}`);
    }
    console.log(`\n완료: dist/ (${files.length}개 항목${withConfig ? ', config.php 포함' : ''})`);
    process.exit(0);
}

// 에디터가 설치된 프로젝트 자동 탐색
const installed = readdirSync(PROJECTS_ROOT).filter(d => {
    const full = join(PROJECTS_ROOT, d);
    if (d === 'mublo-editor') return false;
    try {
        return statSync(full).isDirectory() && existsSync(join(full, LIB_SUBPATH));
    } catch { return false; }
});

let targets;
if (all) {
    targets = installed;
} else if (named.length) {
    const unknown = named.filter(n => !installed.includes(n));
    if (unknown.length) {
        console.error(`에디터가 설치되지 않았거나 없는 프로젝트: ${unknown.join(', ')}`);
        console.error(`가능한 대상: ${installed.join(', ')}`);
        process.exit(1);
    }
    targets = named;
} else {
    console.log('배포 가능한 프로젝트:');
    installed.forEach(p => console.log(`  - ${p}`));
    console.log('\n사용법: node tools/sync.mjs <프로젝트...> | --all  [--dry-run] [--with-config]');
    process.exit(0);
}

const files = withConfig ? [...SYNC_FILES, ...CONFIG_FILES] : SYNC_FILES;

for (const target of targets) {
    const dest = join(PROJECTS_ROOT, target, LIB_SUBPATH);
    console.log(`\n→ ${target}${dryRun ? ' (dry-run)' : ''}`);
    for (const file of files) {
        const src = join(ROOT, file);
        if (!existsSync(src)) { console.log(`  스킵 (원본 없음): ${file}`); continue; }
        const to = join(dest, file);
        if (!dryRun) {
            mkdirSync(dirname(to), { recursive: true });
            cpSync(src, to, { recursive: true });   // 디렉터리 항목(stickers 등) 포함
        }
        console.log(`  ${relative(ROOT, src)}`);
    }
}

console.log(`\n완료: ${targets.length}개 프로젝트${withConfig ? ' (config.php 포함)' : ''}`);
