#!/usr/bin/env node
/**
 * MubloEditor 빌드 — src/ 파트 파일을 순서대로 연결해 MubloEditor.js 생성
 *
 * 소스는 src/NN-*.js 파트들이며, 파일명 순으로 단순 연결(concat)된다.
 * 번들러/트랜스파일 없이 배포 파일을 만들므로 무의존 원칙이 유지되고,
 * 연결 결과는 항상 유효한 단일 IIFE 가 된다.
 *
 * 사용법: npm run build
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(ROOT, 'src');
const OUT = join(ROOT, 'MubloEditor.js');

const parts = readdirSync(SRC).filter(f => /^\d{2}-.*\.js$/.test(f)).sort();
if (!parts.length) {
    console.error('src/ 에 파트 파일(NN-*.js)이 없습니다');
    process.exit(1);
}

const output = parts.map(f => readFileSync(join(SRC, f), 'utf8')).join('');
writeFileSync(OUT, output);
console.log(`빌드 완료: ${parts.length}개 파트 → MubloEditor.js (${output.split('\n').length}줄)`);
parts.forEach(p => console.log('  ' + p));
