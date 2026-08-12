/**
 * 플러그인 테스트 — FileImport 변환기(MD/CSV/TXT) 중심
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadMubloEditor, loadPlugin } from './helpers/dom.mjs';

loadMubloEditor();
loadPlugin('plugins/MubloEditorFileImport.js');
const FI = globalThis.window.MubloEditorFileImport;

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
