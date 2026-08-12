/**
 * v1.7 기능 테스트 — 히스토리 / 체크리스트 / TOC / 슬래시 항목
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadMubloEditor, createEditor } from './helpers/dom.mjs';

const MubloEditor = loadMubloEditor();

test('히스토리: setHTML 이 기준점을 만들고 undo/redo 가 동작한다', () => {
    const ed = createEditor(MubloEditor);
    ed.setHTML('<p>버전1</p>');
    // 직접 변경 + 즉시 캡처
    ed.getElement().innerHTML = '<p>버전2</p>';
    ed._historyCapture();
    ed.getElement().innerHTML = '<p>버전3</p>';
    ed._historyCapture();

    ed._historyUndo();
    assert.match(ed.getElement().innerHTML, /버전2/);
    ed._historyUndo();
    assert.match(ed.getElement().innerHTML, /버전1/);
    ed._historyRedo();
    assert.match(ed.getElement().innerHTML, /버전2/);
    ed.destroy();
});

test('히스토리: undo 후 새 변경이 redo 분기를 폐기한다', () => {
    const ed = createEditor(MubloEditor);
    ed.setHTML('<p>A</p>');
    ed.getElement().innerHTML = '<p>B</p>';
    ed._historyCapture();
    ed._historyUndo(); // → A
    ed.getElement().innerHTML = '<p>C</p>';
    ed._historyCapture();
    ed._historyRedo(); // 분기 폐기됐으므로 이동 없음
    assert.match(ed.getElement().innerHTML, /C/);
    ed.destroy();
});

test('히스토리: 스택 상한 100 유지', () => {
    const ed = createEditor(MubloEditor);
    ed.setHTML('<p>0</p>');
    for (let i = 1; i <= 120; i++) {
        ed.getElement().innerHTML = `<p>${i}</p>`;
        ed._historyCapture();
    }
    assert.ok(ed._history.stack.length <= 100);
    ed.destroy();
});

test('TOC: 제목에 id 를 부여하고 nav 를 만든다', () => {
    const ed = createEditor(MubloEditor);
    ed.setHTML('<h1>첫번째 장</h1><p>내용</p><h2>소제목</h2><h3>세부</h3>');
    ed._insertToc();
    const area = ed.getElement();
    const toc = area.querySelector('nav[data-mublo-toc]');
    assert.ok(toc, 'nav[data-mublo-toc] 가 생성되어야 함');
    const links = toc.querySelectorAll('a');
    assert.equal(links.length, 3);
    // 제목마다 id 부여 + 링크 일치
    const h1 = area.querySelector('h1');
    assert.ok(h1.id);
    assert.equal(links[0].getAttribute('href'), '#' + h1.id);
    ed.destroy();
});

test('TOC: 재실행 시 기존 목차를 교체한다 (중복 생성 안 함)', () => {
    const ed = createEditor(MubloEditor);
    ed.setHTML('<h1>장</h1>');
    ed._insertToc();
    ed._insertToc();
    assert.equal(ed.getElement().querySelectorAll('nav[data-mublo-toc]').length, 1);
    ed.destroy();
});

test('슬래시 항목: 기본 14종 + 커스텀 버튼 포함', () => {
    const ed = createEditor(MubloEditor);
    const base = ed._slashItems().length;
    assert.ok(base >= 14, '기본 항목 14종 이상');
    ed.registerToolbarButton('slashtest', { icon: 'x', title: '슬래시테스트', onClick: () => {} });
    const withCustom = ed._slashItems();
    assert.ok(withCustom.some(it => it.key === 'slashtest'), '커스텀 버튼이 슬래시 메뉴에 노출');
    ed.destroy();
});

test('체크리스트 HTML 구조: data 속성 + 인라인 스타일', () => {
    const ed = createEditor(MubloEditor);
    ed.setHTML('<ul data-mublo-checklist style="list-style:none;"><li><input type="checkbox" contenteditable="false"><span>할 일</span></li></ul>');
    const html = ed.getHTML();
    assert.match(html, /data-mublo-checklist/);
    assert.match(html, /type="checkbox"/);
    ed.destroy();
});

test('a11y: 툴바 role 과 버튼 aria-label', () => {
    const ed = createEditor(MubloEditor, { toolbarItems: ['bold', 'italic'] });
    assert.equal(ed.getToolbar().getAttribute('role'), 'toolbar');
    const bold = ed.getToolbar().querySelector('[data-cmd="bold"]');
    assert.ok(bold.getAttribute('aria-label'));
    ed.destroy();
});

test('a11y: 모달 role/aria-modal', () => {
    const ed = createEditor(MubloEditor);
    const modal = ed.openModal('테스트 모달', '<p>본문</p>');
    assert.equal(modal.getAttribute('role'), 'dialog');
    assert.equal(modal.getAttribute('aria-modal'), 'true');
    assert.equal(modal.getAttribute('aria-label'), '테스트 모달');
    modal.remove();
    ed.destroy();
});
