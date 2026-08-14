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

test('mdToHtml: <details>/<summary> 생 HTML 블록은 태그로 살아남는다', () => {
    const html = FI.mdToHtml('<details>\n<summary>더 보기</summary>\n<ul><li>항목</li></ul>\n</details>');
    assert.match(html, /<details>/);
    assert.match(html, /<summary>더 보기<\/summary>/);
    assert.doesNotMatch(html, /&lt;details&gt;/);
});

test('mdToHtml: 생 HTML 블록 안의 <a href>·<li> 는 이스케이프되지 않는다', () => {
    const html = FI.mdToHtml('<details>\n<ul><li>Built using <a href="https://rubyonrails.org/">Ruby on Rails</a></li></ul>\n</details>');
    assert.match(html, /<a href="https:\/\/rubyonrails\.org\/">Ruby on Rails<\/a>/);
    assert.match(html, /<li>Built using/);
    assert.doesNotMatch(html, /&lt;a href/);
});

test('mdToHtml: <script> 블록은 여전히 이스케이프된다 (허용 목록 밖)', () => {
    const html = FI.mdToHtml('<script>\nalert(1)\n</script>');
    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /&lt;script&gt;/);
});

test('mdToHtml: <iframe>·<style> 블록도 이스케이프된다', () => {
    const a = FI.mdToHtml('<iframe src="https://evil.example"></iframe>');
    assert.doesNotMatch(a, /<iframe/);
    assert.match(a, /&lt;iframe/);
    const b = FI.mdToHtml('<style>\nbody{display:none}\n</style>');
    assert.doesNotMatch(b, /<style/);
    assert.match(b, /&lt;style&gt;/);
});

test('mdToHtml: 마크다운과 생 HTML 이 섞여도 마크다운 변환은 그대로다', () => {
    const html = FI.mdToHtml('# 제목\n\n<details>\n<summary>펼치기</summary>\n</details>\n\n- 목록\n\n[링크](https://a.com)');
    assert.match(html, /<h1>제목<\/h1>/);
    assert.match(html, /<details>/);
    assert.match(html, /<ul><li>목록<\/li><\/ul>/);
    assert.match(html, /<a href="https:\/\/a\.com"[^>]*>링크<\/a>/);
});

test('mdToHtml: HTML 주석은 본문에 글자로 남지 않는다', () => {
    const html = FI.mdToHtml('<!-- Made with love -->\n\n본문');
    assert.match(html, /<!-- Made with love -->/);
    assert.doesNotMatch(html, /&lt;!--/);
    assert.match(html, /<p>본문<\/p>/);
});

test('mdToHtml: 코드 펜스 안의 <b>·허용 태그는 계속 이스케이프된다', () => {
    const html = FI.mdToHtml('```\n<details>\n<b>bold</b>\n```');
    assert.match(html, /&lt;details&gt;/);
    assert.match(html, /&lt;b&gt;/);
    assert.doesNotMatch(html, /<details>/);
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
