        // =========================================================
        // 스마트 붙여넣기 (v1.5)
        // 단일 URL 붙여넣기 → 삽입 방식 선택 (썸네일 카드 / 임베드 / OG 카드 / 단순 링크)
        // =========================================================

        /** YouTube 영상 ID 추출 (썸네일 카드용). 아니면 null */
        _getYouTubeId(url) {
            const embed = this._parseVideoUrl(url);
            const m = embed && embed.match(/youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{11})/);
            return m ? m[1] : null;
        }

        /** 붙여넣은 내용이 단일 URL 이면 선택 팝업 처리. 처리했으면 true */
        _trySmartPaste(e) {
            const text = (e.clipboardData?.getData('text/plain') || '').trim();
            if (!/^https?:\/\/\S+$/.test(text)) return false;
            if (this._getClosestCodeBlock()) return false; // 코드 블록 안은 그대로 붙여넣기

            const videoEmbed = this._parseVideoUrl(text);
            const hasOg = typeof this._ogFetchHandler === 'function';

            // 일반 URL 인데 OG 핸들러가 없으면 선택지가 하나뿐 → 기본 동작 유지
            if (!videoEmbed && !hasOg) return false;

            e.preventDefault();
            this._saveSelection();

            // 세션 기억 선택이 있으면 즉시 적용
            const kind = videoEmbed ? 'video' : 'link';
            const remembered = this._smartPasteChoice[kind];
            if (remembered) {
                this._applySmartPaste(remembered, text, videoEmbed);
                return true;
            }

            this._withLocale(() => this._openSmartPasteDialog(text, videoEmbed, hasOg));
            return true;
        }

        _openSmartPasteDialog(url, videoEmbed, hasOg) {
            const ytId = videoEmbed ? this._getYouTubeId(url) : null;
            const options = [];
            if (videoEmbed) {
                // 썸네일 카드는 서버 없이 썸네일을 얻을 수 있는 YouTube 만 제공
                if (ytId) options.push({ id: 'card', icon: '🖼️', label: _t('pasteThumbCard'), desc: _t('pasteThumbCardDesc') });
                options.push({ id: 'embed', icon: '▶️', label: _t('pasteEmbed'), desc: _t('pasteEmbedDesc') });
            } else if (hasOg) {
                options.push({ id: 'og', icon: '🪧', label: _t('pasteOgCard'), desc: _t('pasteOgCardDesc') });
            }
            options.push({ id: 'link', icon: '🔗', label: _t('pastePlainLink'), desc: _t('pastePlainLinkDesc') });

            const optionsHtml = options.map((o, i) => `
                <button type="button" class="mublo-editor-paste-opt${i === 0 ? ' selected' : ''}" data-choice="${o.id}">
                    <span class="mublo-editor-paste-opt-icon">${o.icon}</span>
                    <span class="mublo-editor-paste-opt-text">
                        <strong>${o.label}</strong>
                        <small>${o.desc}</small>
                    </span>
                </button>`).join('');

            const body = `
                <div class="mublo-editor-paste-url">${escapeHtml(url)}</div>
                <div class="mublo-editor-paste-opts">${optionsHtml}</div>
                <div class="mublo-editor-modal-check">
                    <input type="checkbox" id="mublo-editor-paste-remember">
                    <label for="mublo-editor-paste-remember">${_t('pasteRemember')}</label>
                </div>
            `;

            const modal = this._createModal(
                videoEmbed ? _t('pasteVideoTitle') : _t('pasteLinkTitle'),
                body, _t('insert'),
                (m) => {
                    const choice = m.querySelector('.mublo-editor-paste-opt.selected')?.dataset.choice || 'link';
                    if (m.querySelector('#mublo-editor-paste-remember').checked) {
                        this._smartPasteChoice[videoEmbed ? 'video' : 'link'] = choice;
                    }
                    this._withLocale(() => this._applySmartPaste(choice, url, videoEmbed));
                }
            );

            modal.querySelectorAll('.mublo-editor-paste-opt').forEach(btn => {
                btn.addEventListener('click', () => {
                    modal.querySelectorAll('.mublo-editor-paste-opt').forEach(b => b.classList.toggle('selected', b === btn));
                });
                btn.addEventListener('dblclick', () => {
                    modal.querySelector('#mublo-editor-modal-confirm').click();
                });
            });
        }

        _applySmartPaste(choice, url, videoEmbed) {
            switch (choice) {
                case 'card': this._insertVideoThumbCard(url); break;
                case 'embed': this.insertVideo(url); break;
                case 'og': this._insertOgCard(url); break;
                default: this._insertPlainLink(url);
            }
        }

        _insertPlainLink(url) {
            this._restoreSelection();
            const safe = escapeHtml(url);
            this._exec('insertHTML', `<a href="${safe}" target="_blank" rel="noopener noreferrer">${safe}</a>`);
        }

        /** YouTube 썸네일 카드 삽입. OG 핸들러가 있으면 제목도 가져온다 */
        async _insertVideoThumbCard(url) {
            const ytId = this._getYouTubeId(url);
            if (!ytId) { this._insertPlainLink(url); return; }
            const thumb = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;

            let title = '';
            if (typeof this._ogFetchHandler === 'function') {
                try {
                    const og = await this._ogFetchHandler(url);
                    title = og?.title || '';
                } catch (err) { /* 제목 없이 진행 */ }
            }

            const safeUrl = escapeHtml(url);
            const label = escapeHtml(title || url);
            const html =
                `<figure data-mublo-card="video" contenteditable="false" style="margin:1em 0;">` +
                `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display:block;max-width:480px;border:1px solid #dee2e6;border-radius:8px;overflow:hidden;text-decoration:none;background:#fff;">` +
                `<span style="position:relative;display:block;"><img src="${thumb}" alt="${label}" loading="lazy" style="display:block;width:100%;height:auto;">` +
                `<span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:48px;height:48px;border-radius:50%;background:rgba(0,0,0,.65);color:#fff;font-size:20px;line-height:48px;text-align:center;">▶</span></span>` +
                `<span style="display:block;padding:.55em .8em;color:#495057;font-size:.875em;word-break:break-all;">${label}</span>` +
                `</a></figure><p><br></p>`;
            this._restoreSelection();
            this._exec('insertHTML', html);
        }

        /** OG 카드 삽입. 메타 수집 실패 시 단순 링크로 폴백 */
        async _insertOgCard(url) {
            let og = null;
            try {
                og = await this._ogFetchHandler(url);
            } catch (err) {
                console.warn('[MubloEditor] OG fetch failed, fallback to plain link:', err);
            }
            if (!og || (!og.title && !og.description && !og.image)) {
                this._insertPlainLink(url);
                return;
            }

            const safeUrl = escapeHtml(url);
            let host = '';
            try { host = new URL(url).hostname.replace(/^www\./, ''); } catch (err) { /* 무시 */ }
            const title = escapeHtml(og.title || host || url);
            const desc = escapeHtml((og.description || '').slice(0, 160));
            // 이미지는 http(s) URL 만 허용
            const image = (typeof og.image === 'string' && /^https?:\/\//i.test(og.image)) ? escapeHtml(og.image) : '';

            const imgHtml = image
                ? `<span style="flex:0 0 96px;align-self:stretch;overflow:hidden;"><img src="${image}" alt="" loading="lazy" style="display:block;width:96px;height:100%;min-height:72px;object-fit:cover;"></span>`
                : '';
            const html =
                `<figure data-mublo-card="og" contenteditable="false" style="margin:1em 0;">` +
                `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display:flex;max-width:560px;border:1px solid #dee2e6;border-radius:8px;overflow:hidden;text-decoration:none;background:#fff;">` +
                imgHtml +
                `<span style="display:block;flex:1;min-width:0;padding:.7em .9em;">` +
                `<span style="display:block;color:#212529;font-weight:600;font-size:.9em;line-height:1.35;overflow:hidden;">${title}</span>` +
                (desc ? `<span style="display:block;margin-top:.25em;color:#6c757d;font-size:.8em;line-height:1.4;overflow:hidden;">${desc}</span>` : '') +
                `<span style="display:block;margin-top:.35em;color:#adb5bd;font-size:.75em;">${escapeHtml(host)}</span>` +
                `</span></a></figure><p><br></p>`;
            this._restoreSelection();
            this._exec('insertHTML', html);
        }

        _insertTable() {
            this._saveSelection();
            const body = `
                <div class="mublo-editor-table-picker">
                    <div class="mublo-editor-table-grid" id="mublo-editor-table-grid"></div>
                    <div class="mublo-editor-table-info" id="mublo-editor-table-info">0 x 0</div>
                </div>
            `;

            const modal = this._createModal(_t('tableInsert'), body, _t('insert'), () => {
                // 그리드 클릭 시 이미 삽입되므로 확인 버튼은 닫기 역할만 하거나 비활성화
                return true;
            });

            // 그리드 생성 (10x10)
            const grid = modal.querySelector('#mublo-editor-table-grid');
            const info = modal.querySelector('#mublo-editor-table-info');
            
            for (let i = 0; i < 100; i++) {
                const cell = document.createElement('div');
                cell.className = 'mublo-editor-table-cell';
                cell.dataset.idx = i;
                grid.appendChild(cell);
            }

            const cells = grid.querySelectorAll('.mublo-editor-table-cell');
            
            grid.addEventListener('mouseover', (e) => {
                if (!e.target.classList.contains('mublo-editor-table-cell')) return;
                const idx = parseInt(e.target.dataset.idx);
                const row = Math.floor(idx / 10) + 1;
                const col = (idx % 10) + 1;
                info.textContent = `${row} x ${col}`;
                
                cells.forEach((c, i) => {
                    const r = Math.floor(i / 10) + 1;
                    const cIdx = (i % 10) + 1;
                    c.classList.toggle('active', r <= row && cIdx <= col);
                });
            });

            grid.addEventListener('click', () => {
                const [rows, cols] = info.textContent.split(' x ').map(Number);
                if (rows > 0 && cols > 0) {
                    let html = '<table class="table table-bordered" style="width:100%; border-collapse:collapse;"><tbody>';
                    for (let r = 0; r < rows; r++) {
                        html += '<tr>';
                        for (let c = 0; c < cols; c++) html += '<td style="border:1px solid #dee2e6; padding:8px;">&nbsp;</td>';
                        html += '</tr>';
                    }
                    html += '</tbody></table>';
                    this._exec('insertHTML', html);
                    modal.querySelector('.mublo-editor-modal-close').click();
                }
            });
        }

        _print() {
            const content = this.getHTML();
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                <head>
                    <title>Print</title>
                    <style>body{font-family:sans-serif;padding:20px;line-height:1.6}img{max-width:100%}</style>
                </head>
                <body>
                    ${content}
                    <script>window.onload=function(){window.print();window.close();}<\/script>
                </body>
                </html>
            `);
            printWindow.document.close();
        }

        _toggleFullscreen() {
            this.isFullscreen = !this.isFullscreen;
            this.wrapper.classList.toggle('mublo-editor-fullscreen', this.isFullscreen);
            document.body.classList.toggle('mublo-editor-noscroll', this.isFullscreen);
            const btn = this.toolbar.querySelector('[data-cmd="fullscreen"]');
            if (btn) btn.innerHTML = this.isFullscreen ? TOOLBAR_ICONS.fullscreenExit : TOOLBAR_ICONS.fullscreen;
            this.fire('fullscreenStateChanged', { state: this.isFullscreen });
            if (this._getToolbarMedia()?.matches) this._renderResponsiveToolbar();
        }

        _toggleSource() {
            this.isSourceMode = !this.isSourceMode;
            if (this.isSourceMode) {
                this.sourceArea.value = this._formatHTML(convertCodeHtmlToShortcodes(this.contentArea.innerHTML));
                this.contentArea.style.display = 'none';
                this.sourceArea.style.display = 'block';
            } else {
                const sourceValue = convertCodeShortcodesToHtml(this.sourceArea.value);
                this.contentArea.innerHTML = this.options.sanitize ? sanitizeHtml(sourceValue) : sourceValue;
                this.sourceArea.style.display = 'none';
                this.contentArea.style.display = 'block';
                // WYSIWYG 복귀 시 코드 블록 구문 강조 재적용
                this._highlightAllCodeBlocks();
            }

            // 툴바 버튼 활성/비활성화 처리 (소스 모드에서는 편집 도구 잠금)
            this.toolbar.querySelectorAll('.mublo-editor-btn').forEach(btn => {
                const cmd = btn.dataset.cmd;
                if (cmd !== 'source' && cmd !== 'fullscreen') {
                    btn.disabled = this.isSourceMode;
                }
            });

            const btn = this.toolbar.querySelector('[data-cmd="source"]');
            if (btn) btn.classList.toggle('active', this.isSourceMode);
            this._onChange();
            this.fire('sourceModeChanged', { state: this.isSourceMode });
            if (this._getToolbarMedia()?.matches) this._renderResponsiveToolbar();
        }

        _formatHTML(html) {
            // 블록 태그 주위에 줄바꿈을 추가하여 가독성을 높임 (내용은 건드리지 않음)
            const tokens = html.split(/(<[^>]+>)/g);
            let formatted = '';
            const blockTags = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'tbody', 'thead', 'tfoot', 'tr', 'td', 'th', 'blockquote', 'pre', 'hr', 'header', 'footer', 'section', 'article', 'aside', 'nav', 'style'];
            
            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i];
                if (!token) continue;
                
                const isTag = token.startsWith('<') && token.endsWith('>');
                if (isTag) {
                    const tagNameMatch = token.match(/^<\/?([a-z0-9]+)/i);
                    const tagName = tagNameMatch ? tagNameMatch[1].toLowerCase() : '';
                    const isBlock = blockTags.includes(tagName);
                    
                    if (isBlock) {
                        const isClosing = token.startsWith('</');
                        if (!isClosing) {
                            // 여는 태그: 앞에 줄바꿈
                            if (formatted.length > 0 && !formatted.endsWith('\n')) formatted += '\n';
                            formatted += token;
                        } else {
                            // 닫는 태그: 뒤에 줄바꿈
                            formatted += token;
                            if (i < tokens.length - 1) formatted += '\n';
                        }
                    } else {
                        formatted += token;
                    }
                } else {
                    formatted += token;
                }
            }
            
            // 연속된 줄바꿈 제거 및 정리
            return formatted.replace(/\n\s*\n/g, '\n').trim();
        }

        // =========================================================
        // 찾기/바꾸기
        // =========================================================
        _toggleFindReplace() {
            if (this.findReplaceBar && this.findReplaceBar.style.display !== 'none') {
                this._closeFindReplace();
                return;
            }
            this._openFindReplace();
        }

        _openFindReplace() {
            if (!this.findReplaceBar) {
                this._buildFindReplaceBar();
            }
            this.findReplaceBar.style.display = 'flex';
            this.findReplaceBar.querySelector('.mublo-editor-find-input').focus();
            const btn = this.toolbar.querySelector('[data-cmd="findreplace"]');
            if (btn) btn.classList.add('active');
        }

        _closeFindReplace() {
            if (this.findReplaceBar) {
                this.findReplaceBar.style.display = 'none';
            }
            this._clearHighlights();
            const btn = this.toolbar.querySelector('[data-cmd="findreplace"]');
            if (btn) btn.classList.remove('active');
        }

        _buildFindReplaceBar() {
            this.findReplaceBar = document.createElement('div');
            this.findReplaceBar.className = 'mublo-editor-findreplace';
            this.findReplaceBar.innerHTML = `
                <input type="text" class="mublo-editor-find-input" placeholder="${_t('findPlaceholder')}">
                <input type="text" class="mublo-editor-replace-input" placeholder="${_t('replacePlaceholder')}">
                <span class="mublo-editor-find-count"></span>
                <button type="button" class="mublo-editor-btn mublo-editor-find-prev" title="${_t('findPrev')}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
                </button>
                <button type="button" class="mublo-editor-btn mublo-editor-find-next" title="${_t('findNext')}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <button type="button" class="mublo-editor-btn mublo-editor-replace-one" title="${_t('replaceOne')}">${_t('replaceOne')}</button>
                <button type="button" class="mublo-editor-btn mublo-editor-replace-all" title="${_t('replaceAll')}">${_t('replaceAll')}</button>
                <button type="button" class="mublo-editor-btn mublo-editor-find-close" title="${_t('findClose')}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            `;

            // 이벤트 바인딩
            const findInput = this.findReplaceBar.querySelector('.mublo-editor-find-input');
            const replaceInput = this.findReplaceBar.querySelector('.mublo-editor-replace-input');

            findInput.addEventListener('input', () => this._doFind(findInput.value));
            findInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this._findNext();
                }
                if (e.key === 'Escape') {
                    this._closeFindReplace();
                }
            });

            replaceInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this._closeFindReplace();
                }
            });

            this.findReplaceBar.querySelector('.mublo-editor-find-prev').addEventListener('click', () => this._findPrev());
            this.findReplaceBar.querySelector('.mublo-editor-find-next').addEventListener('click', () => this._findNext());
            this.findReplaceBar.querySelector('.mublo-editor-replace-one').addEventListener('click', () => this._replaceOne());
            this.findReplaceBar.querySelector('.mublo-editor-replace-all').addEventListener('click', () => this._replaceAll());
            this.findReplaceBar.querySelector('.mublo-editor-find-close').addEventListener('click', () => this._closeFindReplace());

            this.toolbar.parentNode.insertBefore(this.findReplaceBar, this.toolbar.nextSibling);
            this._findMatches = [];
            this._currentMatchIndex = -1;
        }

        _collectMatches(query) {
            this._findMatches = [];
            if (!query) return;

            const walker = document.createTreeWalker(this.contentArea, NodeFilter.SHOW_TEXT, null, false);
            const textNodes = [];
            while (walker.nextNode()) textNodes.push(walker.currentNode);

            const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            textNodes.forEach(node => {
                let m;
                while ((m = regex.exec(node.textContent)) !== null) {
                    this._findMatches.push({ node, index: m.index, length: m[0].length, text: m[0] });
                }
            });
        }

        _doFind(query) {
            this._clearHighlights();
            this._currentMatchIndex = -1;

            const countEl = this.findReplaceBar.querySelector('.mublo-editor-find-count');
            if (!query || query.length < 1) {
                this._findMatches = [];
                countEl.textContent = '';
                return;
            }

            this._collectMatches(query);
            countEl.textContent = this._findMatches.length > 0 ? _t('foundCount', { count: this._findMatches.length }) : _t('noResult');

            if (this._findMatches.length > 0) {
                this._currentMatchIndex = 0;
                this._highlightMatch(0);
            }
        }

        _highlightMatch(index) {
            this._clearHighlights();
            if (index < 0 || index >= this._findMatches.length) return;

            const match = this._findMatches[index];
            const range = document.createRange();
            range.setStart(match.node, match.index);
            range.setEnd(match.node, match.index + match.length);

            const highlight = document.createElement('span');
            highlight.className = 'mublo-editor-highlight';
            range.surroundContents(highlight);
            highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });

            const countEl = this.findReplaceBar.querySelector('.mublo-editor-find-count');
            countEl.textContent = `${index + 1} / ${this._findMatches.length}`;
        }

        _clearHighlights() {
            this.contentArea.querySelectorAll('.mublo-editor-highlight').forEach(el => {
                const parent = el.parentNode;
                while (el.firstChild) parent.insertBefore(el.firstChild, el);
                parent.removeChild(el);
            });
            this.contentArea.normalize();
        }

        _findNext() {
            if (this._findMatches.length === 0) return;
            const query = this.findReplaceBar.querySelector('.mublo-editor-find-input').value;
            this._clearHighlights();
            this._collectMatches(query);
            this._currentMatchIndex = (this._currentMatchIndex + 1) % this._findMatches.length;
            this._highlightMatch(this._currentMatchIndex);
        }

        _findPrev() {
            if (this._findMatches.length === 0) return;
            const query = this.findReplaceBar.querySelector('.mublo-editor-find-input').value;
            this._clearHighlights();
            this._collectMatches(query);
            this._currentMatchIndex = (this._currentMatchIndex - 1 + this._findMatches.length) % this._findMatches.length;
            this._highlightMatch(this._currentMatchIndex);
        }

        _replaceOne() {
            const findInput = this.findReplaceBar.querySelector('.mublo-editor-find-input');
            const replaceInput = this.findReplaceBar.querySelector('.mublo-editor-replace-input');
            const query = findInput.value;
            const replacement = replaceInput.value;

            if (!query || this._findMatches.length === 0) return;

            this._clearHighlights();
            this._collectMatches(query);

            if (this._currentMatchIndex >= 0 && this._currentMatchIndex < this._findMatches.length) {
                const match = this._findMatches[this._currentMatchIndex];
                const range = document.createRange();
                range.setStart(match.node, match.index);
                range.setEnd(match.node, match.index + match.length);
                range.deleteContents();
                range.insertNode(document.createTextNode(replacement));
                this.contentArea.normalize();
                this._onChange();
            }

            this._doFind(query);
        }

        _replaceAll() {
            const findInput = this.findReplaceBar.querySelector('.mublo-editor-find-input');
            const replaceInput = this.findReplaceBar.querySelector('.mublo-editor-replace-input');
            const query = findInput.value;
            const replacement = replaceInput.value;

            if (!query) return;

            this._clearHighlights();

            // innerHTML에서 직접 치환 (텍스트만)
            const walker = document.createTreeWalker(this.contentArea, NodeFilter.SHOW_TEXT, null, false);
            const textNodes = [];
            while (walker.nextNode()) {
                textNodes.push(walker.currentNode);
            }

            const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            let count = 0;

            textNodes.forEach(node => {
                const original = node.textContent;
                const replaced = original.replace(regex, () => {
                    count++;
                    return replacement;
                });
                if (original !== replaced) {
                    node.textContent = replaced;
                }
            });

            this._onChange();
            this._doFind(query);

            const countEl = this.findReplaceBar.querySelector('.mublo-editor-find-count');
            countEl.textContent = _t('replacedCount', { count });
        }

        _bindEvents() {
            // 한국어 IME 조합 상태 추적
            this._isComposing = false;
            this.contentArea.addEventListener('compositionstart', () => {
                this._isComposing = true;
            });
            this.contentArea.addEventListener('compositionend', () => {
                this._isComposing = false;
                this._enforceMaxLength();
                this._onChange(); // 조합 완료 후 반영
                this._maybeScheduleHighlight();
            });

            this.contentArea.addEventListener('input', () => {
                if (this._isComposing) return; // IME 조합 중에는 무시
                this._enforceMaxLength();
                this._onChange();
                this._maybeScheduleHighlight();
                this._updateSlashMenu();
            });
            this.contentArea.addEventListener('focus', () => {
                this.wrapper.classList.add('focused');
                this._ensureParagraphSeparator();
                this.options.onFocus?.(this);
                this.fire('focus');
            });
            this.contentArea.addEventListener('blur', () => {
                this.wrapper.classList.remove('focused');
                this.sync();
                // 메뉴 클릭(mousedown preventDefault)이 아닌 실제 포커스 이탈 시 슬래시 메뉴 닫기
                setTimeout(() => { if (document.activeElement !== this.contentArea) this._hideSlashMenu(); }, 150);
                this.options.onBlur?.(this);
                this.fire('blur');
            });
            this.contentArea.addEventListener('keydown', e => this._onKeydown(e));
            this.contentArea.addEventListener('keyup', e => {
                // Backspace/Delete 후 빈 상태 보정 — keyup에서 처리해야 삭제가 완료된 후 체크
                if (e.key === 'Backspace' || e.key === 'Delete') {
                    this._ensureNotEmpty();
                }
                this._saveSelection();
            });
            this.contentArea.addEventListener('mouseup', () => this._saveSelection());
            this.contentArea.addEventListener('paste', e => this._onPaste(e));
            this.contentArea.addEventListener('drop', e => this._onDrop(e));
            this.contentArea.addEventListener('dragover', e => e.preventDefault());
            
            // 전역 클릭 핸들러 (드롭다운 닫기)
            this._handlers.docClick = (e) => {
                if (this.toolbar && !this.toolbar.contains(e.target)) this._closeAllDropdowns();
            };
            document.addEventListener('click', this._handlers.docClick);

            this._bindResponsiveToolbar();

            if (this.options.autofocus) setTimeout(() => this.focus(), 100);
            this._updateWordCount();
            this._initAutosave();
            this._initImageResizer();
            this._initTableEditing();
            this._initCodeBlockEditing();
            this._initChecklistToggle();
            this.options.onReady?.(this);
        }

        // =========================================================
        // 자동 저장
        // =========================================================
        _getAutosaveKey() {
            return this.options.autosaveKey || `mublo-editor-autosave-${this.id}`;
        }

        _initAutosave() {
            if (!this.options.autosave) return;

            // 저장된 내용 복원 — confirm 대신 이벤트 + 배너 UI
            if (this.options.autosaveRestore) {
                const saved = this.getAutosavedContent();
                if (saved && saved.content && !this.originalElement.value) {
                    const eventData = { saved, editor: this, handled: false };
                    this.fire('autosaveRestoreAvailable', eventData);
                    if (!eventData.handled) {
                        this._showAutosaveRestoreBanner(saved);
                    }
                }
            }

            // 주기적 자동 저장 시작
            this._startAutosave();
        }

        _showAutosaveRestoreBanner(saved) {
            const dateStr = new Date(saved.timestamp).toLocaleString();
            const banner = document.createElement('div');
            banner.className = 'mublo-editor-autosave-banner';
            banner.innerHTML = `
                <span>${_t('autosaveRestore', { date: dateStr }).replace('\n', ' ')}</span>
                <button type="button" class="mublo-editor-modal-btn mublo-editor-modal-btn-primary mublo-editor-autosave-restore">${_t('autosaveRestoreBtn')}</button>
                <button type="button" class="mublo-editor-modal-btn mublo-editor-modal-btn-secondary mublo-editor-autosave-ignore">${_t('autosaveIgnoreBtn')}</button>
            `;
            this.wrapper.insertBefore(banner, this.contentArea);

            banner.querySelector('.mublo-editor-autosave-restore').addEventListener('click', () => {
                this.setHTML(saved.content);
                banner.remove();
            });
            banner.querySelector('.mublo-editor-autosave-ignore').addEventListener('click', () => {
                banner.remove();
            });
        }

        _startAutosave() {
            if (!this.options.autosave || this._autosaveTimer) return;

            this._autosaveTimer = setInterval(() => {
                this._doAutosave();
            }, this.options.autosaveInterval);
        }

        _stopAutosave() {
            if (this._autosaveTimer) {
                clearInterval(this._autosaveTimer);
                this._autosaveTimer = null;
            }
        }

        _doAutosave() {
            if (this.isEmpty()) return;

            const key = this._getAutosaveKey();
            const data = {
                content: this.getHTML(),
                timestamp: Date.now(),
                id: this.id
            };

            try {
                localStorage.setItem(key, JSON.stringify(data));
                this.fire('autosave', data);
            } catch (e) {
                console.error('[MubloEditor] Autosave failed:', e);
                this.fire('autosaveError', { error: e.message });
            }
        }

        getAutosavedContent() {
            const key = this._getAutosaveKey();
            try {
                const data = localStorage.getItem(key);
                return data ? JSON.parse(data) : null;
            } catch (e) {
                return null;
            }
        }

        clearAutosave() {
            const key = this._getAutosaveKey();
            localStorage.removeItem(key);
            this.fire('autosaveClear');
            return this;
        }

        saveNow() {
            this._doAutosave();
            return this;
        }

        _onKeydown(e) {
            // IME 조합 중에는 단축키 처리 안 함
            if (this._isComposing || e.isComposing) return;

            // 슬래시 메뉴가 열려 있으면 방향키/Enter/Escape 우선 처리 (v1.7)
            if (this._handleSlashKeydown(e)) return;

            // 이미지 선택 상태에서 Delete/Backspace → 이미지 삭제
            if (this._selectedImage && (e.key === 'Delete' || e.key === 'Backspace')) {
                e.preventDefault();
                this._selectedImage.remove();
                this._hideResizer();
                this.fire('change');
                return;
            }

            // 마크다운 단축키 (Space / Enter 시점 검사)
            if (e.key === ' ' || e.key === 'Enter') {
                if (this._handleMarkdownKeydown(e)) {
                    this.fire('keydown', { originalEvent: e });
                    return;
                }
            }

            const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
            const mod = isMac ? e.metaKey : e.ctrlKey;
            if (mod) {
                const key = e.key.toLowerCase();
                if (key === 'b') { e.preventDefault(); this._exec('bold'); }
                if (key === 'i') { e.preventDefault(); this._exec('italic'); }
                if (key === 'u') { e.preventDefault(); this._exec('underline'); }
                if (key === 'k') { e.preventDefault(); this._insertLink(); }
                if (key === 'f') { e.preventDefault(); this._openFindReplace(); }
                if (key === 'h') { e.preventDefault(); this._openFindReplace(); }
                if (key === 'z') { e.preventDefault(); this._exec(e.shiftKey ? 'redo' : 'undo'); }
                if (key === 'y') { e.preventDefault(); this._exec('redo'); }
            }
            if (e.key === 'Tab') {
                // 표 안: 셀 이동 (마지막 셀 Tab → 행 추가) (v1.7)
                if (this._handleTableTab(e)) {
                    this.fire('keydown', { originalEvent: e });
                    return;
                }
                e.preventDefault();
                // 코드 블록 내부에서는 2스페이스 들여쓰기 / 내어쓰기
                if (this._getClosestCodeBlock()) {
                    if (e.shiftKey) this._codeOutdent();
                    else this._codeIndent();
                } else {
                    this._exec(e.shiftKey ? 'outdent' : 'indent');
                }
            }
            this.fire('keydown', { originalEvent: e });
        }

