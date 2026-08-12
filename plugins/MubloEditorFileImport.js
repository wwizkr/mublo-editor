/**
 * ============================================================
 * MubloEditor FileImport Plugin (v1.6)
 * 문서 파일 가져오기 (텍스트 추출 → 에디터 삽입)
 * ============================================================
 *
 * 클라이언트 단독 지원: TXT · MD · HTML · CSV
 * 서버 변환 지원(선택): DOCX · XLSX · PDF
 *   MubloEditorFileImport.setConvertHandler(async (file) => html)
 *   핸들러를 등록하면 해당 확장자가 자동 활성화된다.
 *
 * 사용법:
 * 1. MubloEditor.js 다음에 이 파일 로드
 * 2. data-toolbar-items 에 'fileimport' 추가
 */
(function () {
    'use strict';
    if (typeof MubloEditor === 'undefined') {
        console.error('[MubloEditorFileImport] MubloEditor must be loaded first');
        return;
    }

    const STR = {
        ko: {
            title: '파일 불러오기',
            drop: '파일을 여기에 드래그하거나 클릭하세요',
            mode: '삽입 방식', modeReplace: '기존 내용 교체', modeAppend: '기존 내용 뒤에 추가', modeCursor: '커서 위치에 삽입',
            insert: '에디터에 삽입', converting: '변환 중...', done: '변환 완료',
            unsupported: '지원하지 않는 파일 형식입니다', failed: '변환에 실패했습니다',
        },
        en: {
            title: 'Import File',
            drop: 'Drag a file here or click to select',
            mode: 'Insert mode', modeReplace: 'Replace content', modeAppend: 'Append', modeCursor: 'At cursor',
            insert: 'Insert', converting: 'Converting...', done: 'Converted',
            unsupported: 'Unsupported file type', failed: 'Conversion failed',
        }
    };
    const t = (k) => (STR[MubloEditor.getLocale()] || STR.ko)[k] || k;
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    let convertHandler = null; // (file) => Promise<html> — DOCX/XLSX/PDF 용

    const CLIENT_EXTS = ['txt', 'md', 'markdown', 'html', 'htm', 'csv'];
    const SERVER_EXTS = ['docx', 'xlsx', 'pdf'];

    // ---------------------------------------------------------
    // 변환기
    // ---------------------------------------------------------
    function textToHtml(text) {
        return text.split(/\r?\n\r?\n+/).map(p =>
            '<p>' + esc(p.trim()).replace(/\r?\n/g, '<br>') + '</p>'
        ).join('');
    }

    /** 경량 마크다운 파서 (heading/list/code/quote/table/hr/인라인 서식) */
    function mdToHtml(md) {
        const lines = md.replace(/\r\n/g, '\n').split('\n');
        const out = [];
        let list = null;       // 'ul' | 'ol'
        let inCode = false, codeLang = '', codeBuf = [];
        let para = [];

        const inline = (s) => esc(s)
            .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;">')
            .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/(^|\W)\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/~~([^~]+)~~/g, '<s>$1</s>');
        const flushPara = () => { if (para.length) { out.push('<p>' + para.map(inline).join('<br>') + '</p>'); para = []; } };
        const flushList = () => { if (list) { out.push(`</${list}>`); list = null; } };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (inCode) {
                if (/^```/.test(line)) {
                    out.push(`<pre class="mublo-code-block" data-language="${esc(codeLang || 'text')}">${esc(codeBuf.join('\n'))}</pre>`);
                    inCode = false; codeBuf = [];
                } else codeBuf.push(line);
                continue;
            }
            const codeStart = line.match(/^```(\w*)/);
            if (codeStart) { flushPara(); flushList(); inCode = true; codeLang = codeStart[1]; continue; }

            const h = line.match(/^(#{1,6})\s+(.*)/);
            if (h) { flushPara(); flushList(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }

            if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { flushPara(); flushList(); out.push('<hr>'); continue; }

            const q = line.match(/^>\s?(.*)/);
            if (q) { flushPara(); flushList(); out.push(`<blockquote>${inline(q[1])}</blockquote>`); continue; }

            // 테이블: | a | b | 형태 연속 줄
            if (/^\s*\|.+\|\s*$/.test(line)) {
                flushPara(); flushList();
                const tbl = [];
                while (i < lines.length && /^\s*\|.+\|\s*$/.test(lines[i])) { tbl.push(lines[i]); i++; }
                i--;
                const rows = tbl.map(r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()))
                    .filter(cells => !cells.every(c => /^:?-{2,}:?$/.test(c))); // 구분선 제거
                if (rows.length) {
                    const cellStyle = 'border:1px solid #dee2e6; padding:8px;';
                    let html = '<table style="width:100%;border-collapse:collapse;"><tbody>';
                    rows.forEach((cells, ri) => {
                        const tag = ri === 0 ? 'th' : 'td';
                        html += '<tr>' + cells.map(c => `<${tag} style="${cellStyle}">${inline(c)}</${tag}>`).join('') + '</tr>';
                    });
                    out.push(html + '</tbody></table>');
                }
                continue;
            }

            const ul = line.match(/^\s*[-*+]\s+(.*)/);
            const ol = line.match(/^\s*\d+[.)]\s+(.*)/);
            if (ul || ol) {
                flushPara();
                const want = ul ? 'ul' : 'ol';
                if (list !== want) { flushList(); out.push(`<${want}>`); list = want; }
                out.push(`<li>${inline((ul || ol)[1])}</li>`);
                continue;
            }

            if (line.trim() === '') { flushPara(); flushList(); continue; }
            para.push(line);
        }
        flushPara(); flushList();
        if (inCode && codeBuf.length) out.push(`<pre class="mublo-code-block" data-language="text">${esc(codeBuf.join('\n'))}</pre>`);
        return out.join('');
    }

    function csvToHtml(text) {
        // 구분자 자동 감지 (탭 > 세미콜론 > 쉼표)
        const firstLine = text.split(/\r?\n/)[0] || '';
        const delim = firstLine.includes('\t') ? '\t' : (firstLine.split(';').length > firstLine.split(',').length ? ';' : ',');

        // 간단한 인용부호 지원 CSV 파서
        const rows = [];
        let row = [], cell = '', inQuote = false;
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (inQuote) {
                if (ch === '"') {
                    if (text[i + 1] === '"') { cell += '"'; i++; } else inQuote = false;
                } else cell += ch;
            } else if (ch === '"') inQuote = true;
            else if (ch === delim) { row.push(cell); cell = ''; }
            else if (ch === '\n' || ch === '\r') {
                if (ch === '\r' && text[i + 1] === '\n') i++;
                row.push(cell); cell = '';
                if (row.some(c => c.trim() !== '')) rows.push(row);
                row = [];
            } else cell += ch;
        }
        if (cell !== '' || row.length) { row.push(cell); if (row.some(c => c.trim() !== '')) rows.push(row); }
        if (!rows.length) return '';

        const cellStyle = 'border:1px solid #dee2e6; padding:8px;';
        let html = '<table style="width:100%;border-collapse:collapse;"><tbody>';
        rows.forEach((cells, ri) => {
            const tag = ri === 0 ? 'th' : 'td';
            html += '<tr>' + cells.map(c => `<${tag} style="${cellStyle}">${esc(c)}</${tag}>`).join('') + '</tr>';
        });
        return html + '</tbody></table>';
    }

    async function convert(file) {
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        if (SERVER_EXTS.includes(ext)) {
            if (!convertHandler) throw new Error(t('unsupported'));
            return await convertHandler(file);
        }
        const text = await file.text();
        if (ext === 'md' || ext === 'markdown') return mdToHtml(text);
        if (ext === 'html' || ext === 'htm') return text; // 삽입 시 sanitize 통과
        if (ext === 'csv') return csvToHtml(text);
        return textToHtml(text); // txt 및 기타 텍스트
    }

    // ---------------------------------------------------------
    // UI
    // ---------------------------------------------------------
    function injectCss() {
        if (document.getElementById('mublo-plugin-fileimport-css')) return;
        const style = document.createElement('style');
        style.id = 'mublo-plugin-fileimport-css';
        style.textContent = `
.mublo-editor-fi-drop { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:.375rem; min-height:110px; margin-bottom:.875rem; padding:1rem; border:2px dashed var(--border, var(--bs-border-color, #adb5bd)); border-radius:.5rem; cursor:pointer; text-align:center; color:var(--muted-foreground, var(--bs-secondary-color, #6c757d)); font-size:.875rem; transition:border-color .15s, background .15s; }
.mublo-editor-fi-drop:hover, .mublo-editor-fi-drop.dragover { border-color:var(--bs-success, #198754); background:rgba(25,135,84,.05); }
.mublo-editor-fi-exts { font-size:.75rem; letter-spacing:.02em; }
.mublo-editor-fi-modes { display:flex; gap:1rem; flex-wrap:wrap; margin-bottom:.875rem; font-size:.8125rem; }
.mublo-editor-fi-modes label { display:flex; align-items:center; gap:.3rem; cursor:pointer; }
.mublo-editor-fi-file { display:flex; justify-content:space-between; align-items:center; margin-bottom:.5rem; font-size:.8125rem; }
.mublo-editor-fi-status { color:var(--bs-success, #198754); font-size:.75rem; }
.mublo-editor-fi-preview { display:none; max-height:220px; overflow:auto; padding:.75rem 1rem; border:1px solid var(--border, var(--bs-border-color, #dee2e6)); border-radius:.5rem; background:var(--background, var(--bs-body-bg, #fff)); font-size:.8125rem; }
.mublo-editor-fi-preview table { border-collapse:collapse; }
`;
        document.head.appendChild(style);
    }

    function openDialog(editor) {
        injectCss();
        editor.saveSelection();

        const exts = CLIENT_EXTS.concat(convertHandler ? SERVER_EXTS : []);
        const extLabel = ['TXT', 'MD', 'HTML', 'CSV'].concat(convertHandler ? ['DOCX', 'XLSX', 'PDF'] : []).join(' · ');
        let convertedHtml = null;

        const body = `
            <div class="mublo-editor-fi-drop" id="mfi-drop">
                <div>${t('drop')}</div>
                <div class="mublo-editor-fi-exts">${extLabel}</div>
            </div>
            <input type="file" id="mfi-input" accept="${exts.map(e => '.' + e).join(',')}" style="display:none">
            <div class="mublo-editor-fi-file" id="mfi-file" style="display:none">
                <strong id="mfi-name"></strong><span class="mublo-editor-fi-status" id="mfi-status"></span>
            </div>
            <div class="mublo-editor-fi-modes">
                <span style="font-weight:600">${t('mode')}</span>
                <label><input type="radio" name="mfi-mode" value="replace" checked> ${t('modeReplace')}</label>
                <label><input type="radio" name="mfi-mode" value="append"> ${t('modeAppend')}</label>
                <label><input type="radio" name="mfi-mode" value="cursor"> ${t('modeCursor')}</label>
            </div>
            <div class="mublo-editor-fi-preview" id="mfi-preview"></div>
        `;

        const modal = editor.openModal(t('title'), body, t('insert'), (m) => {
            if (convertedHtml === null) return false;
            const mode = m.querySelector('input[name="mfi-mode"]:checked').value;
            if (mode === 'replace') {
                editor.setHTML('');
                editor.insertHTML(convertedHtml);
            } else if (mode === 'append') {
                editor.setHTML(editor.getHTML() + convertedHtml);
            } else {
                editor.insertHTML(convertedHtml);
            }
        });

        const drop = modal.querySelector('#mfi-drop');
        const input = modal.querySelector('#mfi-input');
        const preview = modal.querySelector('#mfi-preview');

        const handleFile = async (file) => {
            if (!file) return;
            const ext = (file.name.split('.').pop() || '').toLowerCase();
            modal.querySelector('#mfi-file').style.display = 'flex';
            modal.querySelector('#mfi-name').textContent = file.name;
            const status = modal.querySelector('#mfi-status');
            if (!exts.includes(ext)) {
                status.textContent = t('unsupported');
                convertedHtml = null;
                preview.style.display = 'none';
                return;
            }
            status.textContent = t('converting');
            try {
                convertedHtml = await convert(file);
                status.textContent = t('done');
                // 미리보기는 sanitize 를 거친 결과를 보여준다 (삽입 결과와 동일 경로)
                preview.innerHTML = '';
                const tmp = document.createElement('div');
                tmp.innerHTML = convertedHtml;
                tmp.querySelectorAll('script,style,link,meta').forEach(el => el.remove());
                preview.append(...tmp.childNodes);
                preview.style.display = 'block';
            } catch (err) {
                console.error('[MubloEditorFileImport]', err);
                status.textContent = t('failed');
                convertedHtml = null;
                preview.style.display = 'none';
            }
        };

        drop.addEventListener('click', () => input.click());
        input.addEventListener('change', () => handleFile(input.files && input.files[0]));
        drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('dragover'); });
        drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
        drop.addEventListener('drop', e => {
            e.preventDefault();
            drop.classList.remove('dragover');
            handleFile(e.dataTransfer.files && e.dataTransfer.files[0]);
        });
    }

    MubloEditor.addToolbarItem('fileimport', {
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/></svg>',
        title: STR.ko.title,
        onClick: openDialog
    });

    // 전역 설정 API
    window.MubloEditorFileImport = {
        /** DOCX/XLSX/PDF 서버 변환 핸들러 등록: (file) => Promise<html> */
        setConvertHandler(fn) { if (typeof fn === 'function') convertHandler = fn; },
        // 테스트/재사용용 변환기 노출
        mdToHtml, csvToHtml, textToHtml
    };
})();
