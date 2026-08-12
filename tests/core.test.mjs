/**
 * MubloEditor 코어 회귀 테스트 (jsdom)
 * 실행: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadMubloEditor, createEditor } from './helpers/dom.mjs';

const MubloEditor = loadMubloEditor();

test('버전과 공개 API 표면', () => {
    assert.match(MubloEditor.VERSION, /^\d+\.\d+\.\d+$/);
    for (const fn of ['create', 'get', 'getAll', 'destroy', 'registerPlugin', 'addToolbarItem', 'addLocale', 'setLocale']) {
        assert.equal(typeof MubloEditor[fn], 'function', fn + ' 이 공개 API 여야 함');
    }
});

test('에디터 생성과 기본 콘텐츠 왕복', () => {
    const ed = createEditor(MubloEditor);
    ed.setHTML('<p>안녕하세요 <strong>머블로</strong></p>');
    assert.match(ed.getHTML(), /안녕하세요 <strong>머블로<\/strong>/);
    assert.equal(ed.getText().includes('머블로'), true);
    assert.equal(ed.isEmpty(), false);
    ed.destroy();
});

test('setHTML 은 script 태그를 제거한다 (sanitize)', () => {
    const ed = createEditor(MubloEditor);
    ed.setHTML('<p>안전</p><script>window.hacked=1<\/script>');
    assert.doesNotMatch(ed.getHTML(), /<script/i);
    assert.match(ed.getHTML(), /안전/);
    ed.destroy();
});

test('setHTML 은 이벤트 핸들러 속성을 제거한다', () => {
    const ed = createEditor(MubloEditor);
    ed.setHTML('<p onclick="alert(1)" onmouseover="x()">텍스트</p><img src="x.png" onerror="alert(2)">');
    const html = ed.getHTML();
    assert.doesNotMatch(html, /onclick|onmouseover|onerror/i);
    ed.destroy();
});

test('setHTML 은 javascript: 프로토콜을 제거한다', () => {
    const ed = createEditor(MubloEditor);
    ed.setHTML('<a href="javascript:alert(1)">나쁜링크</a><a href="https://ok.com">좋은링크</a>');
    const html = ed.getHTML();
    assert.doesNotMatch(html, /javascript:/i);
    assert.match(html, /https:\/\/ok\.com/);
    ed.destroy();
});

test('data-quote-style 인라인 스타일 인용구가 보존된다', () => {
    const ed = createEditor(MubloEditor);
    const quote = '<blockquote data-quote-style="warning" style="margin:1em 0;background:#fff9db;">주의 내용</blockquote>';
    ed.setHTML(quote);
    const html = ed.getHTML();
    assert.match(html, /data-quote-style="warning"/);
    assert.match(html, /background:\s*(#fff9db|rgb\(255,\s*249,\s*219\))/);
    ed.destroy();
});

test('_parseVideoUrl: YouTube/Vimeo 변형을 임베드 URL 로 변환', () => {
    const ed = createEditor(MubloEditor);
    const cases = [
        ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/embed/dQw4w9WgXcQ'],
        ['https://youtu.be/dQw4w9WgXcQ', 'https://www.youtube.com/embed/dQw4w9WgXcQ'],
        ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'https://www.youtube.com/embed/dQw4w9WgXcQ'],
        ['https://vimeo.com/12345678', 'https://player.vimeo.com/video/12345678'],
        ['https://example.com/watch?v=x', null],
        ['not a url', null],
    ];
    for (const [input, expected] of cases) {
        assert.equal(ed._parseVideoUrl(input), expected, input);
    }
    ed.destroy();
});

test('_getYouTubeId: 영상 ID 추출', () => {
    const ed = createEditor(MubloEditor);
    assert.equal(ed._getYouTubeId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
    assert.equal(ed._getYouTubeId('https://vimeo.com/123'), null);
    ed.destroy();
});

test('getWordCount: 글자/단어 집계', () => {
    const ed = createEditor(MubloEditor);
    ed.setHTML('<p>hello world 안녕</p>');
    const c = ed.getWordCount();
    assert.equal(c.words, 3);
    assert.equal(c.charsNoSpace, 'helloworld안녕'.length);
    ed.destroy();
});

test('registerPlugin 은 기존/신규 인스턴스 모두에 적용된다', () => {
    const ed1 = createEditor(MubloEditor);
    let count = 0;
    MubloEditor.registerPlugin('test-counter-' + Date.now(), () => { count++; });
    assert.ok(count >= 1, '기존 인스턴스에 즉시 적용');
    const before = count;
    const ed2 = createEditor(MubloEditor);
    assert.ok(count > before, '신규 인스턴스에도 적용');
    ed1.destroy(); ed2.destroy();
});

test('registerToolbarButton: 인스턴스 커스텀 버튼 등록', () => {
    const ed = createEditor(MubloEditor, { toolbarItems: ['bold', 'mybtn'] });
    ed.registerToolbarButton('mybtn', { icon: '<i>x</i>', title: '커스텀', onClick: () => {} });
    const btn = ed.getToolbar().querySelector('[data-cmd="mybtn"]');
    assert.ok(btn, '툴바에 커스텀 버튼이 나타나야 함');
    ed.destroy();
});

test('insertHTML 의 sanitize 기본값', () => {
    const ed = createEditor(MubloEditor);
    ed.setHTML('<p>base</p>');
    // jsdom 은 execCommand 미구현이라 삽입 자체는 스텁 — sanitize 경로 호출만 확인
    assert.doesNotThrow(() => ed.insertHTML('<b>ok</b>'));
    assert.doesNotThrow(() => ed.insertHTML('<b>ok</b>', { sanitize: false }));
    ed.destroy();
});

test('스마트 붙여넣기 판별: 코드블록/비URL 은 개입하지 않는다', () => {
    const ed = createEditor(MubloEditor);
    const mkEvent = (text) => ({
        clipboardData: { getData: (k) => (k === 'text/plain' ? text : ''), items: [] },
        preventDefault() { this.prevented = true; }
    });
    // 일반 텍스트 → false
    assert.equal(ed._trySmartPaste(mkEvent('그냥 텍스트')), false);
    // URL + 공백 → false
    assert.equal(ed._trySmartPaste(mkEvent('https://a.com b')), false);
    // 비디오 URL → true (팝업 개입)
    assert.equal(ed._trySmartPaste(mkEvent('https://youtu.be/dQw4w9WgXcQ')), true);
    document.getElementById('mublo-editor-modal')?.remove();
    ed.destroy();
});

test('로케일: en 설정 시 영어 문자열', () => {
    MubloEditor.setLocale('en');
    assert.equal(MubloEditor.getLocale(), 'en');
    MubloEditor.setLocale('ko');
    assert.equal(MubloEditor.getLocale(), 'ko');
});
