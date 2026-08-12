        // =========================================================
        // 인용구 스타일 갤러리
        // =========================================================
        _getClosestBlockquote() {
            const sel = window.getSelection();
            let node = (sel && sel.rangeCount > 0) ? sel.getRangeAt(0).commonAncestorContainer
                : this.savedRange?.commonAncestorContainer;
            while (node && node !== this.contentArea) {
                if (node.nodeType === 1 && node.tagName === 'BLOCKQUOTE') return node;
                node = node.parentNode;
            }
            return null;
        }

        _quoteIconHtml(def) {
            if (!def.icon) return '';
            const extra = def.iconStyle ? escapeHtml(def.iconStyle) : '';
            return `<span data-quote-icon contenteditable="false" style="margin-right:.5em;${extra}">${def.icon}</span>`;
        }

        _openQuoteGallery() {
            this._saveSelection();
            const tabs = [
                { key: 'basic', label: _t('quoteTabBasic') },
                { key: 'color', label: _t('quoteTabColor') },
                { key: 'icon', label: _t('quoteTabIcon') },
                { key: 'alert', label: _t('quoteTabAlert') },
                { key: 'special', label: _t('quoteTabSpecial') }
            ];
            const sample = escapeHtml(_t('quoteSample'));
            const loc = (this._locale || _globalLocale) === 'en' ? 'en' : 'ko';

            const tabsHtml = tabs.map((t, i) =>
                `<button type="button" class="mublo-editor-quote-tab${i === 0 ? ' active' : ''}" data-tab="${t.key}">${t.label}</button>`
            ).join('');

            const gridsHtml = tabs.map((t, i) => {
                const cards = QUOTE_STYLES[t.key].map(s =>
                    `<button type="button" class="mublo-editor-quote-card" data-cat="${t.key}" data-id="${s.id}">
                        <blockquote style="${escapeHtml(s.style)}">${this._quoteIconHtml(s)}${sample}</blockquote>
                        <span class="mublo-editor-quote-card-label">${escapeHtml(s.label[loc])}</span>
                    </button>`
                ).join('');
                return `<div class="mublo-editor-quote-grid" data-tab="${t.key}"${i === 0 ? '' : ' style="display:none"'}>${cards}</div>`;
            }).join('');

            const body = `
                <div class="mublo-editor-quote-tabs">${tabsHtml}</div>
                ${gridsHtml}
                <div class="mublo-editor-quote-hint">${_t('quoteGalleryHint')}</div>
            `;

            const modal = this._createModal(_t('quoteGallery'), body);
            modal.querySelector('.mublo-editor-modal-dialog').classList.add('mublo-editor-modal-wide');
            // 즉시 삽입 방식 — 확인 버튼 숨기고 취소는 닫기로
            modal.querySelector('#mublo-editor-modal-confirm').style.display = 'none';
            modal.querySelector('#mublo-editor-modal-cancel').textContent = _t('findClose');

            modal.querySelectorAll('.mublo-editor-quote-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    modal.querySelectorAll('.mublo-editor-quote-tab').forEach(t => t.classList.toggle('active', t === tab));
                    modal.querySelectorAll('.mublo-editor-quote-grid').forEach(g => {
                        g.style.display = g.dataset.tab === tab.dataset.tab ? '' : 'none';
                    });
                });
            });

            modal.querySelectorAll('.mublo-editor-quote-card').forEach(card => {
                card.addEventListener('click', () => {
                    const def = (QUOTE_STYLES[card.dataset.cat] || []).find(s => s.id === card.dataset.id);
                    if (def) this._withLocale(() => this._applyQuoteStyle(def));
                    modal.querySelector('#mublo-editor-modal-cancel').click();
                });
            });
        }

        _applyQuoteStyle(def) {
            const existing = this._getClosestBlockquote();
            const iconHtml = this._quoteIconHtml(def);

            if (existing) {
                // 커서가 이미 인용구 안 → 스타일 교체
                existing.style.cssText = def.style;
                existing.setAttribute('data-quote-style', def.id);
                const oldIcon = existing.querySelector('[data-quote-icon]');
                if (oldIcon) oldIcon.remove();
                if (iconHtml) existing.insertAdjacentHTML('afterbegin', iconHtml);
                this._onChange();
                return;
            }

            this._restoreSelection();
            const sel = window.getSelection();
            let content = '';
            if (sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed
                && this.contentArea.contains(sel.getRangeAt(0).commonAncestorContainer)) {
                content = escapeHtml(sel.toString());
            }
            if (!content) content = escapeHtml(_t('quoteSample'));

            const html = `<blockquote data-quote-style="${def.id}" style="${escapeHtml(def.style)}">${iconHtml}${content}</blockquote><p><br></p>`;
            this._exec('insertHTML', html);
        }

        // =========================================================
        // 테이블 셀 편집 (컨텍스트 메뉴 · 행열 추가/삭제 · 병합/분할)
        // =========================================================
        _initTableEditing() {
            // 우클릭 → 셀 컨텍스트 메뉴
            this.contentArea.addEventListener('contextmenu', (e) => {
                const cell = e.target.closest && e.target.closest('td, th');
                if (cell && this.contentArea.contains(cell)) {
                    e.preventDefault();
                    this._showTableContextMenu(e.clientX, e.clientY, cell);
                }
            });

            // 셀 드래그로 다중 선택 (병합용)
            this._cellAnchor = null;
            this.contentArea.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                const cell = e.target.closest && e.target.closest('td, th');
                if (cell && this.contentArea.contains(cell)) {
                    this._cellAnchor = cell;
                    this._clearCellSelection();
                } else {
                    this._cellAnchor = null;
                    this._clearCellSelection();
                }
            });
            this.contentArea.addEventListener('mouseover', (e) => {
                if (!this._cellAnchor || !(e.buttons & 1)) return;
                const cell = e.target.closest && e.target.closest('td, th');
                if (cell && cell !== this._cellAnchor && this.contentArea.contains(cell)
                    && cell.closest('table') === this._cellAnchor.closest('table')) {
                    window.getSelection().removeAllRanges();
                    this._selectCellRange(this._cellAnchor, cell);
                }
            });

            // 전역 핸들러 등록 (destroy에서 제거)
            this._handlers.docMouseup = () => { this._cellAnchor = null; };
            this._handlers.docCloseTableMenu = (e) => {
                if (this._tableMenu && !this._tableMenu.contains(e.target)) {
                    this._hideTableContextMenu();
                }
            };
            this._handlers.docScrollCloseMenu = () => this._hideTableContextMenu();
            document.addEventListener('mouseup', this._handlers.docMouseup);
            document.addEventListener('mousedown', this._handlers.docCloseTableMenu);
            document.addEventListener('scroll', this._handlers.docScrollCloseMenu, true);

            // 열 경계 드래그 리사이즈
            this._initTableColumnResize();
        }

        /** 표를 그리드(2차원 셀 참조 맵)로 전개 — colspan/rowspan 반영 */
        _buildTableGrid(table) {
            const grid = [];
            Array.from(table.rows).forEach((tr, r) => {
                if (!grid[r]) grid[r] = [];
                let c = 0;
                Array.from(tr.cells).forEach(cell => {
                    while (grid[r][c]) c++;
                    const rsp = cell.rowSpan || 1;
                    const csp = cell.colSpan || 1;
                    for (let dr = 0; dr < rsp; dr++) {
                        for (let dc = 0; dc < csp; dc++) {
                            if (!grid[r + dr]) grid[r + dr] = [];
                            grid[r + dr][c + dc] = cell;
                        }
                    }
                    c += csp;
                });
            });
            return grid;
        }

        _getCellCoord(grid, cell) {
            for (let r = 0; r < grid.length; r++) {
                const row = grid[r] || [];
                for (let c = 0; c < row.length; c++) {
                    if (row[c] === cell) return { r, c };
                }
            }
            return null;
        }

        _tableColumnCount(grid) {
            let max = 0;
            grid.forEach(row => { if (row && row.length > max) max = row.length; });
            return max;
        }

        _makeTableCell() {
            const td = document.createElement('td');
            td.style.cssText = 'border:1px solid #dee2e6; padding:8px;';
            td.innerHTML = '<br>';
            return td;
        }

        _selectCellRange(a, b) {
            const table = a.closest('table');
            if (!table) return;
            const grid = this._buildTableGrid(table);
            const ca = this._getCellCoord(grid, a);
            const cb = this._getCellCoord(grid, b);
            if (!ca || !cb) return;
            const minR = Math.min(ca.r, cb.r), maxR = Math.max(ca.r, cb.r);
            const minC = Math.min(ca.c, cb.c), maxC = Math.max(ca.c, cb.c);
            this._clearCellSelection();
            const set = new Set();
            for (let r = minR; r <= maxR; r++) {
                for (let c = minC; c <= maxC; c++) {
                    const cc = grid[r] && grid[r][c];
                    if (cc) set.add(cc);
                }
            }
            set.forEach(cc => cc.classList.add('mublo-editor-cell-selected'));
        }

        _getSelectedCells() {
            return Array.from(this.contentArea.querySelectorAll('.mublo-editor-cell-selected'));
        }

        _clearCellSelection() {
            this.contentArea.querySelectorAll('.mublo-editor-cell-selected')
                .forEach(c => c.classList.remove('mublo-editor-cell-selected'));
        }

        _showTableContextMenu(x, y, cell) {
            this._hideTableContextMenu();
            const canMerge = this._getSelectedCells().length >= 2;
            const canSplit = (cell.colSpan || 1) > 1 || (cell.rowSpan || 1) > 1;

            const items = [
                { label: _t('tableRowAbove'), fn: () => this._insertTableRow(cell, false) },
                { label: _t('tableRowBelow'), fn: () => this._insertTableRow(cell, true) },
                { sep: true },
                { label: _t('tableColLeft'), fn: () => this._insertTableColumn(cell, false) },
                { label: _t('tableColRight'), fn: () => this._insertTableColumn(cell, true) },
                { sep: true },
                { label: _t('tableRowDelete'), fn: () => this._deleteTableRow(cell), danger: true },
                { label: _t('tableColDelete'), fn: () => this._deleteTableColumn(cell), danger: true },
                { sep: true },
                { label: _t('tableMerge'), fn: () => this._mergeCells(), disabled: !canMerge },
                { label: _t('tableSplit'), fn: () => this._splitCell(cell), disabled: !canSplit },
                { sep: true },
                { label: _t('tableStyle'), fn: () => this._withLocale(() => this._openTableStyleDialog(cell)) },
                { label: _t('tableDelete'), fn: () => this._deleteTable(cell), danger: true },
            ];

            const menu = document.createElement('div');
            menu.className = 'mublo-editor-table-menu';
            items.forEach(it => {
                if (it.sep) {
                    const s = document.createElement('div');
                    s.className = 'mublo-editor-table-menu-sep';
                    menu.appendChild(s);
                    return;
                }
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'mublo-editor-table-menu-item' + (it.danger ? ' danger' : '');
                btn.textContent = it.label;
                if (it.disabled) {
                    btn.disabled = true;
                } else {
                    btn.addEventListener('click', () => {
                        it.fn();
                        this._hideTableContextMenu();
                    });
                }
                menu.appendChild(btn);
            });

            document.body.appendChild(menu);
            this._tableMenu = menu;

            // 화면 밖으로 벗어나지 않게 위치 보정
            const rect = menu.getBoundingClientRect();
            let left = x, top = y;
            if (left + rect.width > window.innerWidth - 8) left = window.innerWidth - rect.width - 8;
            if (top + rect.height > window.innerHeight - 8) top = window.innerHeight - rect.height - 8;
            menu.style.left = Math.max(8, left) + 'px';
            menu.style.top = Math.max(8, top) + 'px';
        }

        _hideTableContextMenu() {
            if (this._tableMenu) {
                this._tableMenu.remove();
                this._tableMenu = null;
            }
        }

        _insertTableRow(cell, below) {
            const tr = cell.parentNode;
            const table = cell.closest('table');
            if (!tr || !table) return;
            const cols = this._tableColumnCount(this._buildTableGrid(table));
            const newTr = document.createElement('tr');
            for (let i = 0; i < cols; i++) newTr.appendChild(this._makeTableCell());
            if (below) tr.after(newTr); else tr.before(newTr);
            this._clearCellSelection();
            this._onChange();
        }

        _insertTableColumn(cell, right) {
            const table = cell.closest('table');
            if (!table) return;
            const grid = this._buildTableGrid(table);
            const coord = this._getCellCoord(grid, cell);
            if (!coord) return;
            const insertAt = right ? coord.c + (cell.colSpan || 1) : coord.c;

            Array.from(table.rows).forEach((tr, r) => {
                const rowGrid = grid[r] || [];
                const td = this._makeTableCell();
                const occupant = rowGrid[insertAt];
                if (occupant && occupant.parentNode === tr) {
                    tr.insertBefore(td, occupant);
                } else {
                    // 이 위치가 다른 행(rowspan)에서 내려온 셀이면, 같은 행의 다음 셀 앞에 삽입
                    let ref = null;
                    for (let c = insertAt; c < rowGrid.length; c++) {
                        if (rowGrid[c] && rowGrid[c].parentNode === tr) { ref = rowGrid[c]; break; }
                    }
                    if (ref) tr.insertBefore(td, ref); else tr.appendChild(td);
                }
            });
            this._clearCellSelection();
            this._onChange();
        }

        _deleteTableRow(cell) {
            const tr = cell.parentNode;
            const table = cell.closest('table');
            if (!tr || !table) return;
            if (table.rows.length <= 1) { this._deleteTable(cell); return; }
            tr.remove();
            this._clearCellSelection();
            this._onChange();
        }

        _deleteTableColumn(cell) {
            const table = cell.closest('table');
            if (!table) return;
            const grid = this._buildTableGrid(table);
            const coord = this._getCellCoord(grid, cell);
            if (!coord) return;
            if (this._tableColumnCount(grid) <= 1) { this._deleteTable(cell); return; }

            const removed = new Set();
            grid.forEach(row => {
                const cc = row && row[coord.c];
                if (cc && !removed.has(cc)) {
                    removed.add(cc);
                    if ((cc.colSpan || 1) > 1) {
                        cc.colSpan = cc.colSpan - 1;
                        if (cc.colSpan <= 1) cc.removeAttribute('colspan');
                    } else {
                        cc.remove();
                    }
                }
            });
            Array.from(table.rows).forEach(tr => { if (tr.cells.length === 0) tr.remove(); });
            this._clearCellSelection();
            this._onChange();
        }

        _deleteTable(cell) {
            const table = cell.closest('table');
            if (table) {
                const p = this._makeEmptyParagraph();
                table.replaceWith(p);
                this._placeCaretIn(p);
            }
            this._clearCellSelection();
            this._onChange();
        }

        _mergeCells() {
            const cells = this._getSelectedCells();
            if (cells.length < 2) return;
            const table = cells[0].closest('table');
            if (!table) return;
            const grid = this._buildTableGrid(table);
            const selected = new Set(cells);

            let minR = Infinity, maxR = -1, minC = Infinity, maxC = -1;
            for (let r = 0; r < grid.length; r++) {
                const row = grid[r] || [];
                for (let c = 0; c < row.length; c++) {
                    if (selected.has(row[c])) {
                        minR = Math.min(minR, r); maxR = Math.max(maxR, r);
                        minC = Math.min(minC, c); maxC = Math.max(maxC, c);
                    }
                }
            }
            if (maxR < 0) return;

            const inRect = new Set();
            for (let r = minR; r <= maxR; r++) {
                for (let c = minC; c <= maxC; c++) {
                    const cc = grid[r] && grid[r][c];
                    if (cc) inRect.add(cc);
                }
            }
            const topLeft = grid[minR][minC];
            if (!topLeft) return;

            const parts = [];
            inRect.forEach(cc => {
                if (cc === topLeft) return;
                const html = cc.innerHTML.trim();
                if (html && html !== '<br>' && html !== '&nbsp;') parts.push(html);
            });
            if (parts.length) {
                const base = topLeft.innerHTML.trim();
                topLeft.innerHTML = (base === '<br>' || base === '' ? '' : base + ' ') + parts.join(' ');
            }
            topLeft.colSpan = maxC - minC + 1;
            topLeft.rowSpan = maxR - minR + 1;
            if (topLeft.colSpan <= 1) topLeft.removeAttribute('colspan');
            if (topLeft.rowSpan <= 1) topLeft.removeAttribute('rowspan');
            inRect.forEach(cc => { if (cc !== topLeft) cc.remove(); });
            Array.from(table.rows).forEach(tr => { if (tr.cells.length === 0) tr.remove(); });
            this._clearCellSelection();
            this._onChange();
        }

        _splitCell(cell) {
            const table = cell.closest('table');
            if (!table) return;
            const cs = cell.colSpan || 1, rs = cell.rowSpan || 1;
            if (cs === 1 && rs === 1) return;
            const coord = this._getCellCoord(this._buildTableGrid(table), cell);
            if (!coord) return;

            cell.colSpan = 1; cell.rowSpan = 1;
            cell.removeAttribute('colspan'); cell.removeAttribute('rowspan');

            // 같은 행: cell 뒤에 (cs-1)개 추가
            let prev = cell;
            for (let i = 0; i < cs - 1; i++) {
                const td = this._makeTableCell();
                prev.after(td);
                prev = td;
            }
            // 아래 행들: 각 행의 원래 열 위치에 cs개씩 삽입
            const rows = Array.from(table.rows);
            for (let dr = 1; dr < rs; dr++) {
                const tr = rows[coord.r + dr];
                if (!tr) continue;
                const rowGrid = this._buildTableGrid(table)[coord.r + dr] || [];
                let ref = null;
                for (let c = coord.c; c < rowGrid.length; c++) {
                    if (rowGrid[c] && rowGrid[c].parentNode === tr) { ref = rowGrid[c]; break; }
                }
                for (let i = 0; i < cs; i++) {
                    const td = this._makeTableCell();
                    if (ref) tr.insertBefore(td, ref); else tr.appendChild(td);
                }
            }
            this._clearCellSelection();
            this._onChange();
        }

        // =========================================================
        // 테이블 스타일 다이얼로그 (v1.4)
        // =========================================================
        _openTableStyleDialog(cell) {
            const table = cell.closest('table');
            if (!table) return;
            this._saveSelection();

            // 배경색 적용 대상: 드래그로 선택한 셀들, 없으면 우클릭한 셀
            const targetCells = this._getSelectedCells();
            const bgCells = targetCells.length ? targetCells : [cell];

            // 현재 값 읽기
            const probe = table.querySelector('td, th') || cell;
            const pcs = getComputedStyle(probe);
            const curPadding = parseInt(pcs.paddingTop, 10) || 0;
            const curSpacing = parseInt(table.style.borderSpacing, 10) || 0;
            const widthMatch = /^(\d+(?:\.\d+)?)%$/.exec(table.style.width || '');
            const curWidth = widthMatch ? Math.round(parseFloat(widthMatch[1])) : 100;
            const bwParsed = parseInt(pcs.borderTopWidth, 10);
            const curBorderW = Number.isFinite(bwParsed) ? bwParsed : 1;
            const curBorderColor = rgbToHex(pcs.borderTopColor) || '#dee2e6';
            const knownStyles = ['solid', 'dashed', 'dotted', 'double', 'none'];
            const curBorderStyle = knownStyles.includes(pcs.borderTopStyle) ? pcs.borderTopStyle : 'solid';
            const curBg = rgbToHex(cell.style.backgroundColor) || '';

            const styleLabels = {
                solid: _t('borderSolid'), dashed: _t('borderDashed'), dotted: _t('borderDotted'),
                double: _t('borderDouble'), none: _t('borderNone')
            };
            const paletteHtml = (colors) => colors.map(c =>
                `<button type="button" class="mublo-editor-color-btn" data-color="${c}" style="background-color:${c}" title="${c}"></button>`
            ).join('');

            const body = `
                <div class="mublo-editor-tstyle-section">
                    <div class="mublo-editor-tstyle-section-title">${_t('tableStyleSpacing')}</div>
                    <div class="mublo-editor-tstyle-row">
                        <label>${_t('tableCellPadding')}</label>
                        <input type="range" id="mublo-ts-padding" min="0" max="24" value="${curPadding}">
                        <span class="mublo-editor-tstyle-val" id="mublo-ts-padding-val">${curPadding}px</span>
                    </div>
                    <div class="mublo-editor-tstyle-row">
                        <label>${_t('tableCellSpacing')}</label>
                        <input type="range" id="mublo-ts-spacing" min="0" max="12" value="${curSpacing}">
                        <span class="mublo-editor-tstyle-val" id="mublo-ts-spacing-val">${curSpacing}px</span>
                    </div>
                    <div class="mublo-editor-tstyle-row">
                        <label>${_t('tableWidth')}</label>
                        <input type="range" id="mublo-ts-width" min="30" max="100" value="${curWidth}">
                        <span class="mublo-editor-tstyle-val" id="mublo-ts-width-val">${curWidth}%</span>
                    </div>
                </div>
                <div class="mublo-editor-tstyle-section">
                    <div class="mublo-editor-tstyle-section-title">${_t('tableBorderSection')}</div>
                    <div class="mublo-editor-tstyle-row">
                        <label>${_t('tableBorderWidth')}</label>
                        <input type="range" id="mublo-ts-bwidth" min="0" max="5" value="${curBorderW}">
                        <span class="mublo-editor-tstyle-val" id="mublo-ts-bwidth-val">${curBorderW}px</span>
                    </div>
                    <div class="mublo-editor-tstyle-row">
                        <label>${_t('tableBorderColor')}</label>
                        <input type="color" class="mublo-editor-tstyle-color-swatch" id="mublo-ts-bcolor" value="${curBorderColor}">
                        <input type="text" id="mublo-ts-bcolor-hex" value="${curBorderColor}" size="9">
                    </div>
                    <div class="mublo-editor-tstyle-row">
                        <label>${_t('tableBorderStyle')}</label>
                        <select id="mublo-ts-bstyle">
                            ${knownStyles.map(s => `<option value="${s}"${s === curBorderStyle ? ' selected' : ''}>${styleLabels[s]}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="mublo-editor-tstyle-section">
                    <div class="mublo-editor-tstyle-section-title">${_t('tableCellBg')}</div>
                    <div class="mublo-editor-tstyle-row">
                        <input type="color" class="mublo-editor-tstyle-color-swatch" id="mublo-ts-bg" value="${curBg || '#ffffff'}">
                        <input type="text" id="mublo-ts-bg-hex" value="${curBg}" size="9" placeholder="#RRGGBB">
                        <button type="button" class="mublo-editor-modal-btn mublo-editor-modal-btn-secondary" id="mublo-ts-bg-clear">${_t('tableBgClear')}</button>
                    </div>
                    <div class="mublo-editor-tstyle-palette" id="mublo-ts-palette">${paletteHtml(this.options.colors)}</div>
                    ${this._recentTableColors.length ? `
                    <div class="mublo-editor-tstyle-section-title" style="margin-top:.625rem">${_t('tableRecentColors')}</div>
                    <div class="mublo-editor-tstyle-palette" id="mublo-ts-recent">${paletteHtml(this._recentTableColors)}</div>` : ''}
                </div>
                <div class="mublo-editor-tstyle-hint">${_t('tableStyleHint')}</div>
            `;

            const modal = this._createModal(_t('tableStyle'), body, _t('apply'), (m) => {
                const val = id => m.querySelector('#' + id).value;
                const padding = parseInt(val('mublo-ts-padding'), 10);
                const spacing = parseInt(val('mublo-ts-spacing'), 10);
                const width = parseInt(val('mublo-ts-width'), 10);
                const bw = parseInt(val('mublo-ts-bwidth'), 10);
                const bstyle = val('mublo-ts-bstyle');
                const bcolor = val('mublo-ts-bcolor-hex').trim() || val('mublo-ts-bcolor');
                const bg = val('mublo-ts-bg-hex').trim();

                table.style.width = width + '%';
                if (spacing > 0) {
                    table.style.borderCollapse = 'separate';
                    table.style.borderSpacing = spacing + 'px';
                } else {
                    table.style.borderCollapse = 'collapse';
                    table.style.removeProperty('border-spacing');
                }
                table.querySelectorAll('td, th').forEach(c => {
                    c.style.padding = padding + 'px';
                    c.style.border = (bstyle === 'none' || bw === 0) ? 'none' : `${bw}px ${bstyle} ${bcolor}`;
                });
                bgCells.forEach(c => {
                    if (bg) c.style.backgroundColor = bg;
                    else c.style.removeProperty('background-color');
                });
                if (bg) {
                    this._recentTableColors = [bg, ...this._recentTableColors.filter(c => c !== bg)].slice(0, 8);
                }
                this._clearCellSelection();
                this._onChange();
            });

            // 슬라이더 값 표시
            [['mublo-ts-padding', 'px'], ['mublo-ts-spacing', 'px'], ['mublo-ts-width', '%'], ['mublo-ts-bwidth', 'px']].forEach(([id, unit]) => {
                const input = modal.querySelector('#' + id);
                input.addEventListener('input', () => {
                    modal.querySelector(`#${id}-val`).textContent = input.value + unit;
                });
            });
            // 색상 피커 ↔ hex 입력 동기화
            [['mublo-ts-bcolor', 'mublo-ts-bcolor-hex'], ['mublo-ts-bg', 'mublo-ts-bg-hex']].forEach(([picker, hex]) => {
                const p = modal.querySelector('#' + picker);
                const h = modal.querySelector('#' + hex);
                p.addEventListener('input', () => { h.value = p.value; });
                h.addEventListener('input', () => { if (/^#[0-9a-fA-F]{6}$/.test(h.value.trim())) p.value = h.value.trim(); });
            });
            // 팔레트 클릭 → 셀 배경 hex 에 반영
            modal.querySelectorAll('#mublo-ts-palette .mublo-editor-color-btn, #mublo-ts-recent .mublo-editor-color-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    modal.querySelector('#mublo-ts-bg-hex').value = btn.dataset.color;
                    modal.querySelector('#mublo-ts-bg').value = btn.dataset.color;
                });
            });
            modal.querySelector('#mublo-ts-bg-clear').addEventListener('click', () => {
                modal.querySelector('#mublo-ts-bg-hex').value = '';
            });
        }

        // =========================================================
        // 테이블 열 리사이즈 (열 경계 드래그, v1.4)
        // =========================================================
        _initTableColumnResize() {
            const EDGE = 5; // 경계 감지 픽셀

            const edgeInfo = (e) => {
                const cell = e.target.closest && e.target.closest('td, th');
                if (!cell || !this.contentArea.contains(cell)) return null;
                const rect = cell.getBoundingClientRect();
                if (rect.right - e.clientX <= EDGE) return { cell, side: 'right' };
                if (e.clientX - rect.left <= EDGE) return { cell, side: 'left' };
                return null;
            };

            this.contentArea.addEventListener('mousemove', (e) => {
                if (this._colDrag) return;
                this.contentArea.style.cursor = edgeInfo(e) ? 'col-resize' : '';
            });

            // capture 단계에서 처리해 셀 다중선택(mousedown)보다 먼저 가로챈다
            this.contentArea.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                const info = edgeInfo(e);
                if (!info) return;

                const table = info.cell.closest('table');
                if (!table) return;
                const grid = this._buildTableGrid(table);
                const coord = this._getCellCoord(grid, info.cell);
                if (!coord) return;

                // 드래그 대상 경계의 왼쪽 열 인덱스
                let colIndex = info.side === 'right'
                    ? coord.c + (info.cell.colSpan || 1) - 1
                    : coord.c - 1;
                const colCount = this._tableColumnCount(grid);
                if (colIndex < 0 || colIndex >= colCount - 1) return; // 표의 양 끝 경계는 제외

                e.preventDefault();
                e.stopPropagation();

                const cg = this._ensureColgroup(table, grid, colCount);
                const cols = Array.from(cg.children);
                const tableWidth = table.getBoundingClientRect().width || 1;
                const startA = parseFloat(cols[colIndex].style.width) || (100 / colCount);
                const startB = parseFloat(cols[colIndex + 1].style.width) || (100 / colCount);
                const startX = e.clientX;
                this._colDrag = true;
                this.contentArea.classList.add('mublo-editor-col-resizing');

                const onMove = (ev) => {
                    const deltaPct = (ev.clientX - startX) / tableWidth * 100;
                    const MIN = 5;
                    let a = Math.min(Math.max(startA + deltaPct, MIN), startA + startB - MIN);
                    cols[colIndex].style.width = a.toFixed(2) + '%';
                    cols[colIndex + 1].style.width = (startA + startB - a).toFixed(2) + '%';
                };
                const onUp = () => {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                    this._colDrag = false;
                    this.contentArea.classList.remove('mublo-editor-col-resizing');
                    this.contentArea.style.cursor = '';
                    this._onChange();
                };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            }, true);
        }

        /** colgroup 이 없거나 열 수가 다르면 현재 렌더 폭 기준으로 생성 */
        _ensureColgroup(table, grid, colCount) {
            let cg = table.querySelector(':scope > colgroup');
            if (cg && cg.children.length === colCount) return cg;
            if (cg) cg.remove();

            cg = document.createElement('colgroup');
            const tableWidth = table.getBoundingClientRect().width || 1;
            for (let c = 0; c < colCount; c++) {
                // 해당 열을 단독 점유하는 셀을 찾아 실제 렌더 폭 사용
                let w = null;
                for (let r = 0; r < grid.length; r++) {
                    const gc = grid[r] && grid[r][c];
                    if (gc && (gc.colSpan || 1) === 1) { w = gc.getBoundingClientRect().width; break; }
                }
                if (w === null) w = tableWidth / colCount;
                const col = document.createElement('col');
                col.style.width = (w / tableWidth * 100).toFixed(2) + '%';
                cg.appendChild(col);
            }
            table.insertBefore(cg, table.firstChild);
            table.style.tableLayout = 'fixed';
            if (!table.style.width) table.style.width = '100%';
            return cg;
        }

