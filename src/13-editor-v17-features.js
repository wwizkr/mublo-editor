        // =========================================================
        // 실행취소 히스토리 (v1.7) — 스냅샷 기반, execCommand undo 대체
        // =========================================================
        /** 현재 선택 위치를 contentArea 기준 경로로 저장 */
        _selectionToPath() {
            const sel = window.getSelection();
            if (!sel || !sel.rangeCount) return null;
            const range = sel.getRangeAt(0);
            if (!this.contentArea.contains(range.startContainer)) return null;
            const path = [];
            let node = range.startContainer;
            while (node && node !== this.contentArea) {
                const parent = node.parentNode;
                if (!parent) return null;
                path.unshift(Array.prototype.indexOf.call(parent.childNodes, node));
                node = parent;
            }
            return { path, offset: range.startOffset };
        }

        _pathToSelection(saved) {
            if (!saved) return;
            let node = this.contentArea;
            for (const idx of saved.path) {
                if (!node.childNodes[idx]) break;
                node = node.childNodes[idx];
            }
            try {
                const range = document.createRange();
                const max = node.nodeType === 3 ? node.textContent.length : node.childNodes.length;
                range.setStart(node, Math.min(saved.offset, max));
                range.collapse(true);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            } catch (e) { /* 위치 복원 실패는 무시 */ }
        }

        /** 변경 debounce 후 스냅샷 저장 */
        _historyScheduleCapture() {
            if (this._history.restoring) return;
            clearTimeout(this._history.timer);
            this._history.timer = setTimeout(() => this._historyCapture(), 400);
        }

        _historyCapture() {
            if (this._history.restoring || this.isSourceMode) return;
            const html = this.contentArea.innerHTML;
            const h = this._history;
            if (h.idx >= 0 && h.stack[h.idx]?.html === html) return; // 변화 없음
            // 현재 위치 이후(redo 분기) 폐기
            h.stack = h.stack.slice(0, h.idx + 1);
            h.stack.push({ html, sel: this._selectionToPath() });
            if (h.stack.length > 100) h.stack.shift();
            h.idx = h.stack.length - 1;
        }

        _historyRestore(state) {
            const h = this._history;
            h.restoring = true;
            try {
                this.contentArea.innerHTML = state.html;
                this._highlightAllCodeBlocks();
                this._pathToSelection(state.sel);
                this._saveSelection();
                this._syncLight();
                this._updateWordCount();
                this.fire('change', { content: this.getHTML() });
            } finally {
                h.restoring = false;
            }
        }

        _historyUndo() {
            // 대기 중인 스냅샷 먼저 확정
            clearTimeout(this._history.timer);
            this._historyCapture();
            const h = this._history;
            if (h.idx <= 0) return;
            h.idx--;
            this._historyRestore(h.stack[h.idx]);
        }

        _historyRedo() {
            const h = this._history;
            if (h.idx >= h.stack.length - 1) return;
            h.idx++;
            this._historyRestore(h.stack[h.idx]);
        }

        // =========================================================
        // 슬래시 커맨드 (v1.7) — 빈 블록에서 '/' 입력 → 삽입 메뉴
        // =========================================================
        _slashItems() {
            const items = [
                { key: 'paragraph', icon: '¶', label: _t('slashParagraph'), run: () => this._exec('formatBlock', 'p') },
                { key: 'h1', icon: 'H1', label: _t('slashH1'), run: () => this._exec('formatBlock', 'h1') },
                { key: 'h2', icon: 'H2', label: _t('slashH2'), run: () => this._exec('formatBlock', 'h2') },
                { key: 'h3', icon: 'H3', label: _t('slashH3'), run: () => this._exec('formatBlock', 'h3') },
                { key: 'bullet', icon: '•', label: _t('slashBullet'), run: () => this._exec('insertUnorderedList') },
                { key: 'number', icon: '1.', label: _t('slashNumber'), run: () => this._exec('insertOrderedList') },
                { key: 'checklist', icon: '☑', label: _t('slashChecklist'), run: () => this._insertChecklist() },
                { key: 'quote', icon: '❝', label: _t('slashQuote'), run: () => this._openQuoteGallery() },
                { key: 'code', icon: '</>', label: _t('slashCode'), run: () => this._insertCodeBlock() },
                { key: 'table', icon: '⊞', label: _t('slashTable'), run: () => this._insertTable() },
                { key: 'image', icon: '🖼', label: _t('slashImage'), run: () => this._openImageDialog() },
                { key: 'video', icon: '▶', label: _t('slashVideo'), run: () => this._insertVideo() },
                { key: 'hr', icon: '—', label: _t('slashHr'), run: () => this._exec('insertHorizontalRule') },
                { key: 'toc', icon: '≡', label: _t('slashToc'), run: () => this._insertToc() },
            ];
            // 플러그인 커스텀 툴바 버튼도 메뉴에 노출
            const appendCustom = (map) => map.forEach((def, name) => {
                if (typeof def.onClick === 'function') {
                    items.push({ key: name, icon: '＋', label: def.title || name, run: () => def.onClick(this) });
                }
            });
            appendCustom(customToolbarItems);
            appendCustom(this._customToolbarItems);
            return items;
        }

        /** input 시점: 현재 블록이 '/…' 로 시작하면 메뉴 표시/갱신 */
        _updateSlashMenu() {
            if (this.isSourceMode || this._isComposing) { this._hideSlashMenu(); return; }
            const block = this._getCurrentBlock();
            if (!block || /^(TD|TH|PRE|LI)$/.test(block.tagName)) { this._hideSlashMenu(); return; }
            const text = block.textContent || '';
            if (!text.startsWith('/') || text.length > 24 || /\s/.test(text)) { this._hideSlashMenu(); return; }

            const query = text.slice(1).toLowerCase();
            const matches = this._slashItems().filter(it =>
                !query || it.label.toLowerCase().includes(query) || it.key.includes(query));
            if (!matches.length) { this._hideSlashMenu(); return; }

            this._slashBlock = block;
            this._slashMatches = matches;
            if (this._slashIndex >= matches.length) this._slashIndex = 0;

            if (!this._slashMenu) {
                this._slashMenu = document.createElement('div');
                this._slashMenu.className = 'mublo-editor-slash-menu';
                this._slashMenu.setAttribute('role', 'listbox');
                document.body.appendChild(this._slashMenu);
            }
            this._slashMenu.innerHTML = matches.map((it, i) =>
                `<button type="button" role="option" class="mublo-editor-slash-item${i === this._slashIndex ? ' active' : ''}" data-idx="${i}">
                    <span class="mublo-editor-slash-icon">${it.icon}</span><span>${escapeHtml(it.label)}</span>
                </button>`).join('') + `<div class="mublo-editor-slash-hint">${_t('slashHint')}</div>`;

            this._slashMenu.querySelectorAll('.mublo-editor-slash-item').forEach(btn => {
                btn.addEventListener('mousedown', (e) => {
                    e.preventDefault(); // 에디터 포커스 유지
                    this._runSlashItem(parseInt(btn.dataset.idx, 10));
                });
            });

            // 블록 근처에 위치
            const rect = block.getBoundingClientRect();
            const menu = this._slashMenu;
            menu.style.left = Math.min(rect.left, window.innerWidth - 240) + 'px';
            const mh = menu.offsetHeight || 300;
            menu.style.top = (rect.bottom + mh > window.innerHeight - 8 ? rect.top - mh - 4 : rect.bottom + 4) + 'px';
        }

        _hideSlashMenu() {
            if (this._slashMenu) { this._slashMenu.remove(); this._slashMenu = null; }
            this._slashBlock = null;
            this._slashIndex = 0;
        }

        /** 메뉴 열림 상태의 키 처리. true 반환 시 기본 동작 취소 */
        _handleSlashKeydown(e) {
            if (!this._slashMenu) return false;
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const n = this._slashMatches.length;
                this._slashIndex = (this._slashIndex + (e.key === 'ArrowDown' ? 1 : n - 1)) % n;
                this._slashMenu.querySelectorAll('.mublo-editor-slash-item').forEach((b, i) => {
                    b.classList.toggle('active', i === this._slashIndex);
                    if (i === this._slashIndex) b.scrollIntoView({ block: 'nearest' });
                });
                return true;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                this._runSlashItem(this._slashIndex);
                return true;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                this._hideSlashMenu();
                return true;
            }
            return false;
        }

        _runSlashItem(idx) {
            const item = this._slashMatches?.[idx];
            const block = this._slashBlock;
            this._hideSlashMenu();
            if (!item) return;
            // '/query' 텍스트 제거 후 커서를 블록에 위치
            if (block && this.contentArea.contains(block)) {
                block.textContent = '';
                if (!block.firstChild) block.appendChild(document.createElement('br'));
                const sel = window.getSelection();
                const range = document.createRange();
                range.setStart(block, 0);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
                this._saveSelection();
            }
            this._withLocale(() => item.run());
        }

        // =========================================================
        // 표 Tab 네비게이션 (v1.7)
        // =========================================================
        /** Tab/Shift+Tab: 다음/이전 셀. 마지막 셀에서 Tab → 행 추가. true 반환 시 처리됨 */
        _handleTableTab(e) {
            const sel = window.getSelection();
            if (!sel.rangeCount) return false;
            let node = sel.getRangeAt(0).startContainer;
            if (node.nodeType === 3) node = node.parentNode;
            const cell = node.closest && node.closest('td, th');
            if (!cell || !this.contentArea.contains(cell)) return false;

            const table = cell.closest('table');
            const cells = Array.from(table.querySelectorAll('td, th'));
            const idx = cells.indexOf(cell);
            if (idx === -1) return false;

            e.preventDefault();
            let target;
            if (e.shiftKey) {
                if (idx === 0) return true; // 첫 셀에서는 이동 없음
                target = cells[idx - 1];
            } else if (idx === cells.length - 1) {
                // 마지막 셀 → 아래 행 추가 후 새 행 첫 셀로
                this._insertTableRow(cell, true);
                const newCells = Array.from(table.querySelectorAll('td, th'));
                target = newCells[idx + 1] || newCells[newCells.length - 1];
            } else {
                target = cells[idx + 1];
            }
            if (target) {
                const range = document.createRange();
                range.selectNodeContents(target);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
                this._saveSelection();
            }
            return true;
        }

        // =========================================================
        // 체크리스트 (v1.7)
        // =========================================================
        _insertChecklist() {
            this._restoreSelection();
            const li = '<li style="display:flex;align-items:flex-start;gap:.5em;margin:.3em 0;"><input type="checkbox" contenteditable="false" style="margin-top:.32em;flex:0 0 auto;"><span>&nbsp;</span></li>';
            const html = `<ul data-mublo-checklist style="list-style:none;padding-left:.25em;margin:1em 0;">${li}</ul>`;
            this._exec('insertHTML', html);
            // 커서를 첫 항목 텍스트로
            const list = this.contentArea.querySelector('ul[data-mublo-checklist]:last-of-type');
            const span = list?.querySelector('li:first-child span');
            if (span) {
                const sel = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(span);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
                this._saveSelection();
            }
        }

        /** 체크박스 토글을 checked 속성으로 영속화 (뷰 페이지에서도 상태 유지) */
        _initChecklistToggle() {
            this.contentArea.addEventListener('click', (e) => {
                const box = e.target;
                if (box.matches && box.matches('ul[data-mublo-checklist] input[type="checkbox"]')) {
                    if (box.checked) box.setAttribute('checked', '');
                    else box.removeAttribute('checked');
                    this._onChange();
                }
            });
        }

        // =========================================================
        // 목차(TOC) 삽입 (v1.7)
        // =========================================================
        _insertToc() {
            this._restoreSelection();
            const headings = Array.from(this.contentArea.querySelectorAll('h1, h2, h3'))
                .filter(h => !h.closest('[data-mublo-toc]') && h.textContent.trim());
            if (!headings.length) {
                alert(_t('tocEmpty'));
                return;
            }
            // 제목마다 앵커 id 부여 (없을 때만)
            headings.forEach((h, i) => {
                if (!h.id) h.id = 'mublo-h-' + (i + 1) + '-' + h.textContent.trim().slice(0, 20).replace(/[^\w가-힣]+/g, '-');
            });
            const items = headings.map(h => {
                const level = parseInt(h.tagName[1], 10);
                const indent = (level - 1) * 1.1;
                return `<li style="margin:.25em 0;padding-left:${indent}em;list-style:none;">` +
                    `<a href="#${escapeHtml(h.id)}" style="color:#4263eb;text-decoration:none;">${escapeHtml(h.textContent.trim())}</a></li>`;
            }).join('');
            const html =
                `<nav data-mublo-toc contenteditable="false" style="margin:1em 0;padding:.9em 1.1em;border:1px solid #dee2e6;border-radius:8px;background:#f8f9fa;">` +
                `<strong style="display:block;margin-bottom:.5em;color:#343a40;font-size:.9em;">${_t('tocTitle')}</strong>` +
                `<ul style="margin:0;padding:0;">${items}</ul></nav>`;

            // 기존 TOC 가 있으면 교체
            const existing = this.contentArea.querySelector('nav[data-mublo-toc]');
            if (existing) {
                existing.outerHTML = html;
                this._onChange();
                return;
            }

            // 블록 사이에 DOM 직접 삽입 (p 내부에 nav 가 끼는 것 방지)
            const temp = document.createElement('div');
            temp.innerHTML = html;
            const nav = temp.firstChild;
            const block = this._getCurrentBlock();
            if (block && block.parentNode === this.contentArea) {
                this.contentArea.insertBefore(nav, block.nextSibling);
            } else {
                this.contentArea.insertBefore(nav, this.contentArea.firstChild);
            }
            this._onChange();
        }

        // =========================================================
        // 커서/블록 위치 헬퍼 (마크다운 · 코드블록 공용)
        // =========================================================
        /** 현재 커서가 속한 블록 요소를 반환 (없으면 null) */
        _getCurrentBlock() {
            const sel = window.getSelection();
            if (!sel.rangeCount) return null;
            let node = sel.getRangeAt(0).startContainer;
            if (node.nodeType === 3) node = node.parentNode;
            const blockRe = /^(P|DIV|H[1-6]|LI|BLOCKQUOTE|PRE|TD|TH)$/;
            while (node && node !== this.contentArea) {
                if (node.tagName && blockRe.test(node.tagName)) return node;
                node = node.parentNode;
            }
            return null;
        }

        /** 현재 커서가 코드 블록(pre) 내부에 있으면 해당 pre 요소를 반환 */
        _getClosestCodeBlock() {
            const sel = window.getSelection();
            if (!sel.rangeCount) return null;
            let node = sel.getRangeAt(0).startContainer;
            if (node.nodeType === 3) node = node.parentNode;
            while (node && node !== this.contentArea) {
                if (node.tagName === 'PRE') return node;
                node = node.parentNode;
            }
            return null;
        }

        /** block 시작부터 (node, offset)까지의 순수 텍스트 */
        _textBeforeCaret(block, node, offset) {
            try {
                const range = document.createRange();
                range.setStart(block, 0);
                range.setEnd(node, offset);
                return range.toString();
            } catch (e) {
                return '';
            }
        }

        /** 마크다운 변환 성공 시 잠깐 시각적 피드백 */
        _flashMarkdown() {
            this.wrapper.classList.add('mublo-editor-md-flash');
            clearTimeout(this._mdFlashTimer);
            this._mdFlashTimer = setTimeout(() => {
                this.wrapper.classList.remove('mublo-editor-md-flash');
            }, 250);
        }

