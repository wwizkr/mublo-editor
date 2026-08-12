/**
 * 플러그인 테스트 — FileImport 변환기(MD/CSV/TXT) + Layouts 프리셋
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadMubloEditor, loadPlugin } from './helpers/dom.mjs';

loadMubloEditor();
loadPlugin('plugins/MubloEditorFileImport.js');
loadPlugin('plugins/MubloEditorLayouts.js');
const FI = globalThis.window.MubloEditorFileImport;
const LY = globalThis.window.MubloEditorLayouts;

test('플러그인 전역 API 노출', () => {
    assert.equal(typeof FI.setConvertHandler, 'function');
    assert.equal(typeof FI.mdToHtml, 'function');
    assert.equal(typeof FI.csvToHtml, 'function');
    assert.equal(typeof FI.textToHtml, 'function');
});

test('mdToHtml: 제목/서식/링크', () => {
    const html = FI.mdToHtml('# 제목1\n\n## 제목2\n\n**굵게** *기울임* `코드` [링크](https://a.com)');
    assert.match(html, /<h1>제목1<\/h1>/);
    assert.match(html, /<h2>제목2<\/h2>/);
    assert.match(html, /<strong>굵게<\/strong>/);
    assert.match(html, /<em>기울임<\/em>/);
    assert.match(html, /<code>코드<\/code>/);
    assert.match(html, /<a href="https:\/\/a\.com"[^>]*>링크<\/a>/);
});

test('mdToHtml: 목록과 인용', () => {
    const html = FI.mdToHtml('- 하나\n- 둘\n\n1. 첫째\n2. 둘째\n\n> 인용문');
    assert.match(html, /<ul><li>하나<\/li><li>둘<\/li><\/ul>/);
    assert.match(html, /<ol><li>첫째<\/li><li>둘째<\/li><\/ol>/);
    assert.match(html, /<blockquote>인용문<\/blockquote>/);
});

test('mdToHtml: 테이블 (구분선 제거, 첫 행 th)', () => {
    const html = FI.mdToHtml('| A | B |\n|---|---|\n| 1 | 2 |');
    assert.match(html, /<th[^>]*>A<\/th>/);
    assert.match(html, /<td[^>]*>1<\/td>/);
    assert.doesNotMatch(html, /---/);
});

test('mdToHtml: 코드 블록은 이스케이프된다', () => {
    const html = FI.mdToHtml('```js\nconst a = "<b>";\n```');
    assert.match(html, /data-language="js"/);
    assert.match(html, /&lt;b&gt;/);
    assert.doesNotMatch(html, /<b>/);
});

test('mdToHtml: XSS 원문은 이스케이프된다', () => {
    const html = FI.mdToHtml('<script>alert(1)</script>\n\n일반 문단');
    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /&lt;script&gt;/);
});

test('csvToHtml: 쉼표/인용부호/개행 처리', () => {
    const html = FI.csvToHtml('이름,메모\n"김, 철수","줄1\n줄2"\n영희,보통');
    assert.match(html, /<th[^>]*>이름<\/th>/);
    assert.match(html, /김, 철수/);
    assert.match(html, /영희/);
});

test('csvToHtml: 세미콜론/탭 구분자 자동 감지', () => {
    assert.match(FI.csvToHtml('a;b;c\n1;2;3'), /<td[^>]*>2<\/td>/);
    assert.match(FI.csvToHtml('a\tb\n1\t2'), /<td[^>]*>2<\/td>/);
});

test('textToHtml: 빈 줄로 문단 구분, 단일 개행은 <br>', () => {
    const html = FI.textToHtml('문단1 줄1\n문단1 줄2\n\n문단2');
    assert.match(html, /<p>문단1 줄1<br>문단1 줄2<\/p>/);
    assert.match(html, /<p>문단2<\/p>/);
});

test('textToHtml: HTML 특수문자 이스케이프', () => {
    assert.match(FI.textToHtml('<div> & "quote"'), /&lt;div&gt; &amp; &quot;quote&quot;/);
});

test('Layouts: 프리셋 10종 노출 (2단×2 + 3단 포함)', () => {
    assert.equal(LY.presets.length, 10);
    for (const id of ['col-2', 'col-2r', 'col-3']) {
        assert.ok(LY.presets.includes(id), id + ' 프리셋 존재');
    }
});

test('Layouts: col-2 는 이미지|텍스트 2단 (flex-wrap 반응형)', () => {
    const html = LY.buildLayout('col-2', '/a.jpg', '본문', 40);
    assert.match(html, /data-mublo-layout="col-2"/);
    assert.match(html, /flex-wrap:wrap/);
    assert.ok(html.indexOf('<img') < html.indexOf('본문'), '이미지가 텍스트보다 앞');
});

test('Layouts: col-2r 은 텍스트|이미지 순서', () => {
    const html = LY.buildLayout('col-2r', '/a.jpg', '본문', 40);
    assert.match(html, /data-mublo-layout="col-2r"/);
    assert.ok(html.indexOf('본문') < html.indexOf('<img'), '텍스트가 이미지보다 앞');
});

test('Layouts: col-3 는 이미지 최대 3장 + 하단 캡션', () => {
    const html = LY.buildLayout('col-3', '/a.jpg', '캡션', 40, ['/b.jpg', '/c.jpg']);
    assert.match(html, /data-mublo-layout="col-3"/);
    assert.equal((html.match(/<img /g) || []).length, 3);
    assert.match(html, /캡션/);
    // 추가 이미지가 없으면 1장만
    const one = LY.buildLayout('col-3', '/a.jpg', '캡션', 40, []);
    assert.equal((one.match(/<img /g) || []).length, 1);
});
