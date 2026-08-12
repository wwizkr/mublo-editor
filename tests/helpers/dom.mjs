/**
 * jsdom 환경 셋업 — MubloEditor 를 node 에서 로드하기 위한 전역 준비.
 * 각 테스트 파일 최상단에서 import 한다.
 */
import { JSDOM } from 'jsdom';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost/',
    pretendToBeVisual: true,
});

const { window } = dom;

// MubloEditor / 플러그인이 참조하는 전역 노출
globalThis.window = window;
globalThis.document = window.document;
globalThis.navigator = window.navigator;
globalThis.HTMLElement = window.HTMLElement;
globalThis.Node = window.Node;
globalThis.DOMParser = window.DOMParser;
globalThis.MouseEvent = window.MouseEvent;
globalThis.KeyboardEvent = window.KeyboardEvent;
globalThis.Event = window.Event;
globalThis.CustomEvent = window.CustomEvent;
globalThis.getComputedStyle = window.getComputedStyle;
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);
globalThis.localStorage = window.localStorage;
globalThis.FileReader = window.FileReader;
globalThis.File = window.File;
globalThis.Blob = window.Blob;
globalThis.URL = window.URL;

// jsdom 에 없는 API 보강
if (!window.matchMedia) {
    window.matchMedia = undefined; // 코드가 typeof 로 가드함
}
if (!document.execCommand) {
    // jsdom 은 execCommand 미구현 — 호출 흔적만 남기는 스텁
    document.execCommand = () => true;
}
if (!window.getSelection) {
    globalThis.getSelection = () => ({ rangeCount: 0, removeAllRanges() {}, addRange() {}, toString: () => '' });
}

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** MubloEditor 모듈 로드 (CommonJS export 사용) */
export function loadMubloEditor() {
    delete require.cache[require.resolve(join(ROOT, 'MubloEditor.js'))];
    const MubloEditor = require(join(ROOT, 'MubloEditor.js'));
    globalThis.MubloEditor = MubloEditor;
    window.MubloEditor = MubloEditor;
    return MubloEditor;
}

/** 플러그인 로드 (전역 MubloEditor 필요) */
export function loadPlugin(relPath) {
    delete require.cache[require.resolve(join(ROOT, relPath))];
    require(join(ROOT, relPath));
}

/** 테스트용 textarea 로 에디터 생성 */
export function createEditor(MubloEditor, options = {}) {
    const ta = document.createElement('textarea');
    ta.id = 'test-editor-' + Math.random().toString(36).slice(2, 8);
    document.body.appendChild(ta);
    return MubloEditor.create(ta, options);
}

export { dom, window };
