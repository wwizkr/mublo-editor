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
 *   node tools/sync.mjs mublo-dev --minimal       # 런타임 필수 파일만 배포 (문서/데모 제외)
 *   node tools/sync.mjs mublo-dev --minimal --prune  # + 배포 목록 외 잔여 파일 삭제
 *
 * config.php 는 프로젝트별 커스터마이징 대상이므로 기본적으로 배포에서 제외한다.
 * (예: mublo-biz 는 자체 config.php 를 사용 중)
 * --prune 은 config.php / config.local.php 는 절대 삭제하지 않는다.
 */
import { cpSync, existsSync, readdirSync, statSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));   // mublo-editor/
const PROJECTS_ROOT = dirname(ROOT);                             // d:/project/mublo/
const LIB_SUBPATH = join('public', 'assets', 'lib', 'editor', 'mublo-editor');

// 런타임 필수 파일 — 에디터가 실제 동작하는 데 필요한 것 (config.php 제외)
const RUNTIME_FILES = [
    'MubloEditor.js',
    'MubloEditor.css',
    'LICENSE',
    'editor.lib.php',
    join('plugins', 'MubloEditorImageUpload.js'),
    join('plugins', 'MubloEditorLayouts.js'),
    join('plugins', 'MubloEditorFileImport.js'),
    join('plugins', 'MubloEditorExport.js'),
    join('plugins', 'MubloEditorStickers.js'),
    join('plugins', 'stickers'),                    // 스티커 팩 에셋 + packs.js (디렉터리, 라이선스 고지 포함)
    join('plugins', 'upload', 'upload.php'),
    join('plugins', 'upload', '.htaccess'),
    join('plugins', 'opengraph', 'og-proxy.php'),
    join('plugins', 'import', 'convert.php'),
];
// 문서/데모/개발 편의 파일 — 없어도 에디터 동작에는 지장 없음 (--minimal 에서 제외)
const EXTRA_FILES = [
    'MubloEditor.d.ts',
    'README.md',
    'index.html',
    'package.json',
    join('plugins', 'upload', 'upload.html'),
    join('plugins', 'upload', 'README.md'),
];
const SYNC_FILES = [...RUNTIME_FILES, ...EXTRA_FILES];
const CONFIG_FILES = ['config.php'];
const PRUNE_KEEP = new Set(['config.php', 'config.local.php']); // --prune 에서도 항상 보존

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const all = args.includes('--all');
const withConfig = args.includes('--with-config');
const dist = args.includes('--dist');
const minimal = args.includes('--minimal');
const prune = args.includes('--prune');
const named = args.filter(a => !a.startsWith('--'));

const baseFiles = minimal ? RUNTIME_FILES : SYNC_FILES;

// --dist: 프로젝트 배포와 동일한 파일 목록을 dist/ 에 모아서 생성 (배포 패키지 확인용)
if (dist) {
    const distDir = join(ROOT, 'dist');
    const files = withConfig ? [...baseFiles, ...CONFIG_FILES] : baseFiles;
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

const files = withConfig ? [...baseFiles, ...CONFIG_FILES] : baseFiles;

/** dest 하위 전체 파일을 dest 기준 상대 경로로 나열 */
function listFilesRec(dir, base = dir) {
    const out = [];
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) out.push(...listFilesRec(full, base));
        else out.push(relative(base, full));
    }
    return out;
}

/** 빈 하위 디렉터리 제거 (dir 자체는 남김) */
function removeEmptyDirs(dir) {
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (!statSync(full).isDirectory()) continue;
        removeEmptyDirs(full);
        if (!readdirSync(full).length) rmSync(full, { recursive: true });
    }
}

for (const target of targets) {
    const dest = join(PROJECTS_ROOT, target, LIB_SUBPATH);
    console.log(`\n→ ${target}${minimal ? ' (minimal)' : ''}${dryRun ? ' (dry-run)' : ''}`);
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

    // --prune: 배포 목록에 없는 잔여 파일 제거 (config.php / config.local.php 는 보존)
    if (prune && existsSync(dest)) {
        const isExpected = (rel) => files.some(f => rel === f || rel.startsWith(f + sep));
        for (const rel of listFilesRec(dest)) {
            if (PRUNE_KEEP.has(rel)) continue;
            if (isExpected(rel)) continue;
            console.log(`  삭제: ${rel}`);
            if (!dryRun) rmSync(join(dest, rel));
        }
        if (!dryRun) removeEmptyDirs(dest);
    }
}

console.log(`\n완료: ${targets.length}개 프로젝트${minimal ? ' (minimal)' : ''}${withConfig ? ' (config.php 포함)' : ''}`);
