#!/usr/bin/env node
/**
 * 머블로봇 스티커 팩 생성기
 *
 * 일관된 캐릭터(둥근 로봇 + 안테나 + 다크 스크린 얼굴)에
 * 표정/소품 변형을 조합해 정적 SVG 10종을 생성한다.
 *
 * 사용법: node tools/make-mublobot-stickers.mjs
 * 출력:   plugins/stickers/mublobot/*.svg
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(dirname(fileURLToPath(import.meta.url))), 'plugins', 'stickers', 'mublobot');
mkdirSync(OUT, { recursive: true });

// 팔레트
const SHELL = '#eef2ff';      // 머리/몸 셸
const SHELL_LINE = '#c7d2fe'; // 셸 테두리
const SCREEN = '#1e2430';     // 얼굴 스크린
const ACCENT = '#4263eb';     // 브랜드 인디고
const GLOW = '#8ecbff';       // 눈/입 발광색
const PINK = '#ff8fab';

/**
 * 캐릭터 베이스.
 * face: 스크린 안 (눈/입), extras: 몸 밖 소품, arms: 팔 오버라이드
 */
function bot({ face, extras = '', arms = null, antennaColor = ACCENT }) {
    const defaultArms = `
    <ellipse cx="18" cy="78" rx="8" ry="12" fill="${SHELL}" stroke="${SHELL_LINE}" stroke-width="2" transform="rotate(18 18 78)"/>
    <ellipse cx="102" cy="78" rx="8" ry="12" fill="${SHELL}" stroke="${SHELL_LINE}" stroke-width="2" transform="rotate(-18 102 78)"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <!-- 안테나 -->
  <line x1="60" y1="14" x2="60" y2="24" stroke="${SHELL_LINE}" stroke-width="3" stroke-linecap="round"/>
  <circle cx="60" cy="11" r="5" fill="${antennaColor}"/>
  <!-- 귀 -->
  <rect x="8" y="48" width="8" height="16" rx="4" fill="${ACCENT}"/>
  <rect x="104" y="48" width="8" height="16" rx="4" fill="${ACCENT}"/>
  <!-- 팔 -->
  ${arms ?? defaultArms}
  <!-- 머리+몸 셸 -->
  <rect x="16" y="24" width="88" height="72" rx="30" fill="${SHELL}" stroke="${SHELL_LINE}" stroke-width="3"/>
  <!-- 얼굴 스크린 -->
  <rect x="28" y="38" width="64" height="40" rx="18" fill="${SCREEN}"/>
  ${face}
  <!-- 다리 -->
  <rect x="40" y="96" width="12" height="12" rx="5" fill="${SHELL}" stroke="${SHELL_LINE}" stroke-width="2"/>
  <rect x="68" y="96" width="12" height="12" rx="5" fill="${SHELL}" stroke="${SHELL_LINE}" stroke-width="2"/>
  ${extras}
</svg>`;
}

// 자주 쓰는 얼굴 부품
const smile = (w = 14) => `<path d="M ${60 - w / 2} 64 Q 60 ${64 + w * 0.8} ${60 + w / 2} 64" fill="none" stroke="${GLOW}" stroke-width="3.5" stroke-linecap="round"/>`;
const happyEyes = `
  <path d="M 40 54 Q 46 47 52 54" fill="none" stroke="${GLOW}" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M 68 54 Q 74 47 80 54" fill="none" stroke="${GLOW}" stroke-width="3.5" stroke-linecap="round"/>`;
const dotEyes = `
  <circle cx="46" cy="54" r="5" fill="${GLOW}"/>
  <circle cx="74" cy="54" r="5" fill="${GLOW}"/>`;
const star = (x, y, s, color = '#ffd43b') =>
    `<path transform="translate(${x} ${y}) scale(${s})" fill="${color}" d="M0,-6 L1.8,-1.8 L6,-1.2 L2.9,1.7 L3.7,6 L0,3.6 L-3.7,6 L-2.9,1.7 L-6,-1.2 L-1.8,-1.8 Z"/>`;
const heart = (x, y, s, color = PINK) =>
    `<path transform="translate(${x} ${y}) scale(${s})" fill="${color}" d="M0,3.5 C-4,-0.5 -6,-2.5 -6,-5 C-6,-7 -4.5,-8 -3,-8 C-1.8,-8 -0.6,-7.2 0,-6 C0.6,-7.2 1.8,-8 3,-8 C4.5,-8 6,-7 6,-5 C6,-2.5 4,-0.5 0,3.5 Z"/>`;

const STICKERS = [
    { file: 'best', label: '기분 최고!', svg: bot({
        face: `${star(46, 54, 1.1, GLOW)}${star(74, 54, 1.1, GLOW)}${smile(18)}`,
        extras: `${star(20, 26, 1.2)}${star(100, 22, 0.9)}${star(106, 40, 0.7)}`
    }) },
    { file: 'like', label: '좋아요!', svg: bot({
        face: `${happyEyes}${smile()}`,
        arms: `
    <ellipse cx="18" cy="78" rx="8" ry="12" fill="${SHELL}" stroke="${SHELL_LINE}" stroke-width="2" transform="rotate(18 18 78)"/>
    <g transform="translate(103 62) rotate(-12)">
      <rect x="-5" y="-2" width="12" height="14" rx="5" fill="${SHELL}" stroke="${SHELL_LINE}" stroke-width="2"/>
      <rect x="-3" y="-10" width="6" height="11" rx="3" fill="${SHELL}" stroke="${SHELL_LINE}" stroke-width="2"/>
    </g>`
    }) },
    { file: 'party', label: '축하해요!', svg: bot({
        antennaColor: PINK,
        face: `${happyEyes}${smile(18)}`,
        extras: `
    <path d="M 60 24 L 48 6 L 72 6 Z" fill="${PINK}" transform="rotate(14 60 15)"/>
    <circle cx="65" cy="4" r="3.5" fill="#ffd43b" />
    <circle cx="16" cy="20" r="2.5" fill="${ACCENT}"/><circle cx="30" cy="10" r="2" fill="#51cf66"/>
    <circle cx="94" cy="12" r="2.5" fill="${PINK}"/><circle cx="108" cy="28" r="2" fill="#ffd43b"/>
    <rect x="22" y="32" width="4" height="4" fill="#51cf66" transform="rotate(30 24 34)"/>
    <rect x="98" y="34" width="4" height="4" fill="${ACCENT}" transform="rotate(-20 100 36)"/>`
    }) },
    { file: 'love', label: '사랑해요', svg: bot({
        antennaColor: PINK,
        face: `${heart(46, 56, 1.15, PINK)}${heart(74, 56, 1.15, PINK)}${smile()}`,
        extras: `${heart(103, 30, 1, PINK)}${heart(14, 34, 0.7, PINK)}`
    }) },
    { file: 'sad', label: '슬퍼요', svg: bot({
        face: `
    <path d="M 40 52 Q 46 57 52 52" fill="none" stroke="${GLOW}" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M 68 52 Q 74 57 80 52" fill="none" stroke="${GLOW}" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M 52 68 Q 60 62 68 68" fill="none" stroke="${GLOW}" stroke-width="3.5" stroke-linecap="round"/>
    <ellipse cx="80" cy="64" rx="3" ry="4.5" fill="${GLOW}"/>`
    }) },
    { file: 'angry', label: '화났어요', svg: bot({
        antennaColor: '#fa5252',
        face: `
    <line x1="38" y1="47" x2="52" y2="52" stroke="#ff8787" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="82" y1="47" x2="68" y2="52" stroke="#ff8787" stroke-width="3.5" stroke-linecap="round"/>
    <circle cx="46" cy="58" r="4" fill="#ff8787"/><circle cx="74" cy="58" r="4" fill="#ff8787"/>
    <path d="M 52 70 Q 60 65 68 70" fill="none" stroke="#ff8787" stroke-width="3.5" stroke-linecap="round"/>`,
        extras: `
    <path d="M 14 24 q 3 -6 0 -12 M 20 26 q 3 -6 0 -12" stroke="#fa5252" stroke-width="2.5" fill="none" stroke-linecap="round"/>`
    }) },
    { file: 'surprise', label: '놀랐어요', svg: bot({
        face: `
    <circle cx="46" cy="54" r="6" fill="none" stroke="${GLOW}" stroke-width="3.5"/>
    <circle cx="74" cy="54" r="6" fill="none" stroke="${GLOW}" stroke-width="3.5"/>
    <ellipse cx="60" cy="68" rx="5" ry="6" fill="${GLOW}"/>`,
        extras: `
    <path d="M 104 18 l 4 -8 M 110 24 l 8 -4 M 108 34 l 8 2" stroke="#ffd43b" stroke-width="2.5" stroke-linecap="round"/>`
    }) },
    { file: 'sleepy', label: '졸려요', svg: bot({
        antennaColor: '#adb5bd',
        face: `
    <line x1="40" y1="55" x2="52" y2="55" stroke="${GLOW}" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="68" y1="55" x2="80" y2="55" stroke="${GLOW}" stroke-width="3.5" stroke-linecap="round"/>
    <ellipse cx="60" cy="68" rx="4" ry="5" fill="${GLOW}" opacity=".8"/>`,
        extras: `
    <text x="96" y="26" font-family="Arial, sans-serif" font-weight="bold" font-size="14" fill="${ACCENT}">z</text>
    <text x="104" y="18" font-family="Arial, sans-serif" font-weight="bold" font-size="11" fill="${ACCENT}" opacity=".7">z</text>
    <text x="110" y="11" font-family="Arial, sans-serif" font-weight="bold" font-size="8" fill="${ACCENT}" opacity=".5">z</text>`
    }) },
    { file: 'study', label: '열공중', svg: bot({
        face: `
    <circle cx="46" cy="54" r="8" fill="none" stroke="#ffd43b" stroke-width="3"/>
    <circle cx="74" cy="54" r="8" fill="none" stroke="#ffd43b" stroke-width="3"/>
    <line x1="54" y1="54" x2="66" y2="54" stroke="#ffd43b" stroke-width="3"/>
    <circle cx="46" cy="54" r="3" fill="${GLOW}"/><circle cx="74" cy="54" r="3" fill="${GLOW}"/>
    <path d="M 54 68 L 66 68" stroke="${GLOW}" stroke-width="3.5" stroke-linecap="round"/>`,
        extras: `
    <g transform="translate(88 100)">
      <path d="M -14 0 Q -14 -6 0 -6 Q 14 -6 14 0 L 14 4 Q 14 -2 0 -2 Q -14 -2 -14 4 Z" fill="${ACCENT}"/>
      <path d="M -12 -1 Q -12 -5 0 -5 L 0 -1 Q -12 -1 -12 3 Z" fill="#fff"/>
      <path d="M 12 -1 Q 12 -5 0 -5 L 0 -1 Q 12 -1 12 3 Z" fill="#e9ecef"/>
    </g>`
    }) },
    { file: 'fighting', label: '파이팅!', svg: bot({
        face: `
    <line x1="39" y1="49" x2="52" y2="51" stroke="${GLOW}" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="81" y1="49" x2="68" y2="51" stroke="${GLOW}" stroke-width="3.5" stroke-linecap="round"/>
    <circle cx="46" cy="57" r="4.5" fill="${GLOW}"/><circle cx="74" cy="57" r="4.5" fill="${GLOW}"/>
    <path d="M 50 67 Q 60 74 70 67" fill="none" stroke="${GLOW}" stroke-width="3.5" stroke-linecap="round"/>`,
        arms: `
    <ellipse cx="18" cy="78" rx="8" ry="12" fill="${SHELL}" stroke="${SHELL_LINE}" stroke-width="2" transform="rotate(18 18 78)"/>
    <circle cx="104" cy="52" r="9" fill="${SHELL}" stroke="${SHELL_LINE}" stroke-width="2"/>`,
        extras: `
    <path d="M 104 40 q -3 -7 3 -12 q -1 6 4 8 q 4 2 2 7 q -1 4 -6 4 q 3 -4 -3 -7" fill="#ff922b"/>`
    }) },
];

for (const s of STICKERS) {
    writeFileSync(join(OUT, s.file + '.svg'), s.svg.trim() + '\n');
}
// 팩 매니페스트 (등록 스크립트가 사용)
writeFileSync(join(OUT, 'pack.json'), JSON.stringify({
    name: '머블로봇',
    items: STICKERS.map(s => ({ file: s.file + '.svg', label: s.label }))
}, null, 2) + '\n');

console.log(`생성 완료: ${STICKERS.length}종 → ${OUT}`);
