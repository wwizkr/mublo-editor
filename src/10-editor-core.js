    // =========================================================
    // Editor 클래스
    // =========================================================
    class Editor {
        constructor(element, options = {}) {
            this.originalElement = element;
            this.id = element.id || generateId();
            this.options = this._mergeOptions(options);
            // 인스턴스별 locale (전역 fallback)
            this._locale = (this.options.locale && LOCALE[this.options.locale])
                ? this.options.locale : null;
            this.isFullscreen = false;
            this.isSourceMode = false;
            this.savedRange = null;
            
            // 이벤트 시스템
            this._eventListeners = new Map();
            
            // 이미지 업로드 핸들러 (플러그인에서 교체 가능)
            this._imageUploadHandler = null;

            // 자동 저장 타이머
            this._autosaveTimer = null;

            // 이미지 리사이저
            this._selectedImage = null;
            this._resizer = null;

            // 전역 이벤트 핸들러 참조 (제거용)
            this._handlers = {};

            // data-toolbar-*-mobile 옵션이 있을 때만 생성하는 반응형 툴바 쿼리
            this._toolbarMedia = null;

            // 인스턴스 전용 커스텀 툴바 항목 (registerToolbarButton)
            this._customToolbarItems = new Map();
            // 테이블 스타일 다이얼로그 최근 사용 색상
            this._recentTableColors = [];

            // 자체 실행취소 히스토리 (v1.7) — execCommand undo 대체
            this._history = { stack: [], idx: -1, restoring: false, timer: null };

            // 슬래시 커맨드 메뉴 (v1.7)
            this._slashMenu = null;
            this._slashIndex = 0;
            this._slashBlock = null;

            // 스마트 붙여넣기 (v1.5)
            this._ogFetchHandler = null;
            this._smartPasteChoice = { video: null, link: null }; // 세션 기억
            if (this.options.ogProxyUrl) {
                // 기본 핸들러: og 프록시 엔드포인트 (JSON {title, description, image, host})
                const proxy = this.options.ogProxyUrl;
                this._ogFetchHandler = async (url) => {
                    const res = await fetch(proxy + (proxy.includes('?') ? '&' : '?') + 'url=' + encodeURIComponent(url));
                    if (!res.ok) throw new Error('og fetch failed: ' + res.status);
                    const data = await res.json();
                    if (data.success === false) throw new Error(data.message || 'og fetch failed');
                    return data;
                };
            }

            this._withLocale(() => this._build());
            this._withLocale(() => this._bindEvents());
            this._initPlugins();
            this.setHTML(element.value || '');
            instances.set(this.id, this);
            
            // ready 이벤트 발생
            this.fire('ready', { editor: this });
        }

        _mergeOptions(options) {
            const dataOptions = {};
            const el = this.originalElement;
            if (el.dataset.toolbar) dataOptions.toolbar = el.dataset.toolbar;
            if (el.dataset.height) dataOptions.height = parseInt(el.dataset.height, 10);
            if (el.dataset.placeholder) dataOptions.placeholder = el.dataset.placeholder;
            if (el.dataset.uploadUrl) dataOptions.uploadUrl = el.dataset.uploadUrl;
            if (el.dataset.uploadCsrf) dataOptions.uploadCsrfToken = el.dataset.uploadCsrf;
            if (el.dataset.toolbarItems) dataOptions.toolbarItems = el.dataset.toolbarItems.split(',').map(s => s.trim());
            // 반응형 툴바: 모바일 개별 항목 > 모바일 프리셋 > 데스크톱 설정 순으로 적용한다.
            if (el.dataset.toolbarMobile) dataOptions.toolbarMobile = el.dataset.toolbarMobile;
            if (el.dataset.toolbarItemsMobile) dataOptions.toolbarItemsMobile = el.dataset.toolbarItemsMobile.split(',').map(s => s.trim());
            if (el.dataset.toolbarBreakpoint) dataOptions.toolbarBreakpoint = parseInt(el.dataset.toolbarBreakpoint, 10);
            if (el.dataset.showWordCount !== undefined) dataOptions.showWordCount = el.dataset.showWordCount === 'true';
            if (el.dataset.maxLength) dataOptions.maxLength = parseInt(el.dataset.maxLength, 10);
            if (el.dataset.autosave !== undefined) dataOptions.autosave = el.dataset.autosave === 'true';
            if (el.dataset.autosaveInterval) dataOptions.autosaveInterval = parseInt(el.dataset.autosaveInterval, 10);
            if (el.dataset.autosaveKey) dataOptions.autosaveKey = el.dataset.autosaveKey;
            if (el.dataset.locale) dataOptions.locale = el.dataset.locale;
            if (el.dataset.ogProxy) dataOptions.ogProxyUrl = el.dataset.ogProxy;
            if (el.dataset.smartPaste !== undefined) dataOptions.smartPaste = el.dataset.smartPaste === 'true';

            return {
                toolbar: 'full',
                toolbarMobile: null,
                toolbarItemsMobile: null,
                toolbarBreakpoint: 768,
                height: 300,
                minHeight: 150,
                placeholder: '',
                autofocus: false,
                readonly: false,
                colors: DEFAULT_COLORS,
                uploadUrl: null,
                uploadCsrfToken: null,
                allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
                sanitize: true,
                automatic_uploads: true,
                images_upload_credentials: false,
                // 스마트 붙여넣기: OG 메타 수집 프록시 URL (null 이면 OG 카드 옵션 숨김)
                ogProxyUrl: null,
                // URL 붙여넣기 선택 팝업 사용 여부
                smartPaste: true,
                // 콜백 (하위 호환성)
                onChange: null,
                onFocus: null,
                onBlur: null,
                onImageUpload: null,
                onReady: null,
                // 스타일 핸들러
                images_upload_handler: null,
                // 글자 수 카운터
                showWordCount: false,
                maxLength: 0,  // 0 = 제한 없음
                // 자동 저장
                autosave: false,
                autosaveInterval: 30000,  // 30초
                autosaveKey: null,  // localStorage 키 (null이면 에디터 ID 사용)
                autosaveRestore: true,  // 페이지 로드 시 자동 복원
                ...dataOptions,
                ...options
            };
        }

        // =========================================================
        // locale 컨텍스트 헬퍼
        // =========================================================
        _withLocale(fn) {
            const prev = _activeInstanceLocale;
            _activeInstanceLocale = this._locale;
            try { return fn(); } finally { _activeInstanceLocale = prev; }
        }

        // =========================================================
        // 이벤트 시스템
        // =========================================================
        on(event, callback) {
            if (!this._eventListeners.has(event)) {
                this._eventListeners.set(event, []);
            }
            this._eventListeners.get(event).push(callback);
            return this;
        }

        off(event, callback) {
            if (!this._eventListeners.has(event)) return this;
            if (!callback) {
                this._eventListeners.delete(event);
            } else {
                const listeners = this._eventListeners.get(event);
                const index = listeners.indexOf(callback);
                if (index > -1) listeners.splice(index, 1);
            }
            return this;
        }

        fire(event, data = {}) {
            const listeners = this._eventListeners.get(event) || [];
            listeners.forEach(callback => {
                try {
                    callback({ ...data, type: event, target: this });
                } catch (e) {
                    console.error(`[MubloEditor] Event "${event}" handler error:`, e);
                }
            });
            return this;
        }

        // =========================================================
        // 이미지 업로드 핸들러 설정 (플러그인용)
        // =========================================================
        setImageUploadHandler(handler) {
            if (typeof handler !== 'function') {
                console.error('[MubloEditor] Image upload handler must be a function');
                return this;
            }
            this._imageUploadHandler = handler;
            return this;
        }

        getImageUploadHandler() {
            return this._imageUploadHandler;
        }

        // =========================================================
        // 플러그인 확장 API (v1.4+)
        // =========================================================

        /**
         * 이 인스턴스에만 커스텀 툴바 버튼 등록.
         * def: { icon: '<svg…>', title: '툴팁', onClick: (editor) => {} }
         * 버튼 노출은 toolbarItems(data-toolbar-items)에 name을 포함해야 한다.
         */
        registerToolbarButton(name, def) {
            if (!name || typeof def?.onClick !== 'function') {
                console.error('[MubloEditor] registerToolbarButton: name과 onClick이 필요합니다');
                return this;
            }
            this._customToolbarItems.set(name, def);
            // 이미 툴바에 노출 대상이면 다시 그린다
            if (this._resolveToolbarItems().includes(name)) this._renderResponsiveToolbar();
            return this;
        }

        /**
         * 에디터 표준 모달 열기 (플러그인용 공개 래핑).
         * onPrimary(modal)가 false를 반환하면 닫히지 않는다.
         */
        openModal(title, bodyHtml, primaryText = null, onPrimary = null) {
            return this._withLocale(() => this._createModal(title, bodyHtml, primaryText, onPrimary));
        }

        /** 커서 위치에 HTML 삽입. 기본 sanitize 적용, { sanitize:false }로 해제(신뢰 소스 전용). */
        insertHTML(html, { sanitize = true } = {}) {
            return sanitize ? this.insertContent(html) : this.insertTrustedContent(html);
        }

        /** 현재(또는 저장된) 선택 영역의 텍스트 */
        getSelectedText() {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0 && this.contentArea.contains(sel.getRangeAt(0).commonAncestorContainer)) {
                return sel.toString();
            }
            return this.savedRange ? this.savedRange.toString() : '';
        }

        /** 선택 영역을 HTML로 교체 (sanitize 적용) */
        replaceSelection(html) {
            return this.insertContent(html);
        }

        /** 선택 영역 저장/복원 — 모달을 띄우기 전/후에 사용 */
        saveSelection() { this._saveSelection(); return this; }
        restoreSelection() { this._restoreSelection(); return this; }

        /**
         * OG 메타 수집 핸들러 설정 (v1.5 스마트 붙여넣기).
         * handler: (url) => Promise<{title, description, image, host}>
         * 설정 시 일반 URL 붙여넣기에 "OG 카드" 옵션이 나타난다.
         */
        setOgFetchHandler(handler) {
            if (typeof handler !== 'function') {
                console.error('[MubloEditor] OG fetch handler must be a function');
                return this;
            }
            this._ogFetchHandler = handler;
            return this;
        }

        getOgFetchHandler() {
            return this._ogFetchHandler;
        }

        // =========================================================
        // 빌드
        // =========================================================
        _build() {
            this.wrapper = document.createElement('div');
            this.wrapper.className = EDITOR_WRAPPER_CLASS;
            this.wrapper.id = this.id + '-wrapper';

            this.toolbar = this._buildToolbar();
            this.wrapper.appendChild(this.toolbar);

            this.contentArea = document.createElement('div');
            this.contentArea.className = EDITOR_CONTENT_CLASS;
            this.contentArea.contentEditable = !this.options.readonly;
            this.contentArea.style.minHeight = this.options.minHeight + 'px';
            this.contentArea.style.height = this.options.height + 'px';
            if (this.options.placeholder) {
                this.contentArea.dataset.placeholder = this.options.placeholder;
            }
            this.wrapper.appendChild(this.contentArea);

            this.sourceArea = document.createElement('textarea');
            this.sourceArea.className = 'mublo-editor-source';
            this.sourceArea.style.display = 'none';
            this.sourceArea.style.height = this.options.height + 'px';
            this.wrapper.appendChild(this.sourceArea);

            // 업로드 진행률 표시 영역
            this.progressBar = document.createElement('div');
            this.progressBar.className = 'mublo-editor-progress';
            this.progressBar.style.display = 'none';
            this.progressBar.innerHTML = '<div class="mublo-editor-progress-bar"></div>';
            this.wrapper.appendChild(this.progressBar);

            // 이미지 리사이저 요소 생성 — 8방향 핸들(모서리 4 + 가운데 4) + 크기 표시 라벨
            this._resizer = document.createElement('div');
            this._resizer.className = 'mublo-editor-resizer';
            this._resizer.innerHTML = [
                'nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'
            ].map(dir => `<div class="mublo-editor-resizer-handle mublo-editor-resizer-${dir}" data-dir="${dir}"></div>`).join('')
                + '<div class="mublo-editor-resizer-size"></div>';
            this.wrapper.appendChild(this._resizer);

            // 코드 블록 언어 선택 바 (커서가 코드 블록 안에 있을 때 표시)
            this._codeLangBar = document.createElement('div');
            this._codeLangBar.className = 'mublo-editor-code-langbar';
            this._codeLangBar.style.display = 'none';
            const langSelect = document.createElement('select');
            langSelect.className = 'mublo-editor-code-lang-select';
            CODE_LANGUAGES.forEach(lang => {
                const opt = document.createElement('option');
                opt.value = lang;
                opt.textContent = lang;
                langSelect.appendChild(opt);
            });
            langSelect.addEventListener('change', () => {
                if (this._activeCodeBlock) {
                    this._activeCodeBlock.setAttribute('data-language', langSelect.value);
                    this._highlightCodeBlock(this._activeCodeBlock, true);
                    this._onChange();
                }
            });
            langSelect.addEventListener('mousedown', e => e.stopPropagation());
            this._codeLangBar.appendChild(langSelect);
            this.wrapper.appendChild(this._codeLangBar);

            // 글자 수 카운터
            if (this.options.showWordCount) {
                this.statusBar = document.createElement('div');
                this.statusBar.className = 'mublo-editor-statusbar';
                this.statusBar.innerHTML = '<span class="mublo-editor-wordcount"></span>';
                this.wrapper.appendChild(this.statusBar);
            }

            this.originalElement.style.display = 'none';
            this.originalElement.parentNode.insertBefore(this.wrapper, this.originalElement.nextSibling);

            // 엔터 키 입력 시 <div> 대신 <p> 태그가 생성되도록 설정
            this._ensureParagraphSeparator();
        }

        _buildToolbar() {
            const toolbar = document.createElement('div');
            toolbar.className = EDITOR_TOOLBAR_CLASS;
            toolbar.setAttribute('role', 'toolbar');
            const items = this._resolveToolbarItems();

            items.forEach(name => {
                if (name === 'separator') {
                    const sep = document.createElement('span');
                    sep.className = 'mublo-editor-separator';
                    toolbar.appendChild(sep);
                    return;
                }
                // 조회 우선순위: 인스턴스 커스텀 → 전역 커스텀(플러그인) → 내장
                const def = this._customToolbarItems.get(name)
                    || customToolbarItems.get(name)
                    || _getToolbarItems()[name];
                if (!def) return;
                const btn = this._createButton(name, def);
                if (btn) toolbar.appendChild(btn);
            });
            return toolbar;
        }

        _hasResponsiveToolbar() {
            return this.options.toolbarMobile !== null
                || Array.isArray(this.options.toolbarItemsMobile);
        }

        _getToolbarMedia() {
            if (!this._hasResponsiveToolbar() || typeof window.matchMedia !== 'function') return null;
            if (this._toolbarMedia) return this._toolbarMedia;

            const configuredBreakpoint = Number(this.options.toolbarBreakpoint);
            const breakpoint = Number.isFinite(configuredBreakpoint) && configuredBreakpoint > 0
                ? configuredBreakpoint
                : 768;
            this._toolbarMedia = window.matchMedia(`(max-width: ${breakpoint}px)`);
            return this._toolbarMedia;
        }

        _resolveToolbarItems() {
            // data-toolbar-items 가 있으면 data-toolbar 프리셋보다 우선한다.
            const desktopItems = Array.isArray(this.options.toolbarItems)
                ? this.options.toolbarItems
                : (TOOLBAR_PRESETS[this.options.toolbar] || TOOLBAR_PRESETS.full);
            const media = this._getToolbarMedia();
            let items = desktopItems;

            if (media?.matches) {
                if (Array.isArray(this.options.toolbarItemsMobile)) {
                    items = this.options.toolbarItemsMobile;
                } else if (TOOLBAR_PRESETS[this.options.toolbarMobile]) {
                    items = TOOLBAR_PRESETS[this.options.toolbarMobile];
                }
            }

            // 화면 크기가 바뀌어도 활성 모드에서 빠져나올 버튼은 유지한다.
            items = [...items];
            if (this.isSourceMode && !items.includes('source')) items.push('source');
            if (this.isFullscreen && !items.includes('fullscreen')) items.push('fullscreen');
            return items;
        }

        _renderResponsiveToolbar() {
            if (!this.toolbar) return;

            const nextToolbar = this._buildToolbar();
            this.toolbar.replaceWith(nextToolbar);
            this.toolbar = nextToolbar;

            if (this.findReplaceBar
                && this.findReplaceBar.style.display !== 'none'
                && !this.toolbar.querySelector('[data-cmd="findreplace"]')) {
                this._closeFindReplace();
            }

            this._syncToolbarState();
        }

        _syncToolbarState() {
            this.toolbar.querySelectorAll('.mublo-editor-btn').forEach(btn => {
                const cmd = btn.dataset.cmd;
                btn.disabled = this.options.readonly
                    || (this.isSourceMode && cmd !== 'source' && cmd !== 'fullscreen');
            });

            const sourceBtn = this.toolbar.querySelector('[data-cmd="source"]');
            if (sourceBtn) sourceBtn.classList.toggle('active', this.isSourceMode);

            const fullscreenBtn = this.toolbar.querySelector('[data-cmd="fullscreen"]');
            if (fullscreenBtn) {
                fullscreenBtn.innerHTML = this.isFullscreen
                    ? TOOLBAR_ICONS.fullscreenExit
                    : TOOLBAR_ICONS.fullscreen;
            }
        }

        _bindResponsiveToolbar() {
            const media = this._getToolbarMedia();
            if (!media) return;

            this._handlers.toolbarMediaChange = () => this._renderResponsiveToolbar();
            if (typeof media.addEventListener === 'function') {
                media.addEventListener('change', this._handlers.toolbarMediaChange);
            } else if (typeof media.addListener === 'function') {
                media.addListener(this._handlers.toolbarMediaChange);
            }
        }

        _ensureParagraphSeparator() {
            try {
                document.execCommand('defaultParagraphSeparator', false, 'p');
            } catch (e) {
                // 브라우저 호환성 예외 처리
            }

            try {
                document.execCommand('styleWithCSS', false, true);
            } catch (e) {
                try {
                    document.execCommand('useCSS', false, false);
                } catch (ignored) {
                    // 브라우저 호환성 예외 처리
                }
            }
        }

        /**
         * Backspace로 전부 지웠을 때 빈 contentEditable 보정
         * 빈 상태에서 타이핑하면 브라우저마다 커서가 불안정 → <p><br></p> 삽입 + 커서 배치
         */
        _ensureNotEmpty() {
            const root = this.contentArea;
            if (!root || this.isSourceMode) return;

            // 내용이 비었거나 <br> 하나만 남은 상태
            const html = root.innerHTML;
            if (html === '' || html === '<br>' || html === '<br/>' || html.trim() === '') {
                root.innerHTML = '<p><br></p>';
                // 커서를 <p> 안에 배치
                const p = root.querySelector('p');
                if (p) {
                    const sel = window.getSelection();
                    const range = document.createRange();
                    range.setStart(p, 0);
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            }
        }

        _createButton(name, def) {
            if (def.type === 'dropdown') return this._createDropdown(name, def);
            if (def.type === 'color') return this._createColorPicker(name, def);

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'mublo-editor-btn';
            btn.title = def.title;
            btn.setAttribute('aria-label', def.title || name);
            btn.innerHTML = def.icon;
            btn.dataset.cmd = name;
            btn.addEventListener('click', e => {
                e.preventDefault();
                this._handleCommand(name, def);
            });
            return btn;
        }

        _createDropdown(name, def) {
            const wrap = document.createElement('div');
            wrap.className = 'mublo-editor-dropdown';

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'mublo-editor-btn mublo-editor-dropdown-btn';
            btn.title = def.title;
            btn.innerHTML = def.icon + '<svg class="mublo-editor-caret" width="10" height="10" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

            const menu = document.createElement('div');
            menu.className = 'mublo-editor-dropdown-menu';
            def.items.forEach(item => {
                const mi = document.createElement('button');
                mi.type = 'button';
                mi.className = 'mublo-editor-dropdown-item';
                mi.textContent = item.label;
                mi.addEventListener('click', e => {
                    e.preventDefault();
                    this._exec(item.command, item.value);
                    menu.classList.remove('show');
                });
                menu.appendChild(mi);
            });

            btn.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                this._closeAllDropdowns();
                menu.classList.toggle('show');
            });

            wrap.appendChild(btn);
            wrap.appendChild(menu);
            return wrap;
        }

        _createColorPicker(name, def) {
            const wrap = document.createElement('div');
            wrap.className = 'mublo-editor-dropdown mublo-editor-colorpicker';

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'mublo-editor-btn';
            btn.title = def.title;
            btn.innerHTML = def.icon;

            const menu = document.createElement('div');
            menu.className = 'mublo-editor-dropdown-menu mublo-editor-color-menu';

            const palette = document.createElement('div');
            palette.className = 'mublo-editor-color-palette';
            this.options.colors.forEach(color => {
                const c = document.createElement('button');
                c.type = 'button';
                c.className = 'mublo-editor-color-btn';
                c.style.backgroundColor = color;
                c.title = color;
                c.addEventListener('click', e => {
                    e.preventDefault();
                    this._exec(def.command, color);
                    menu.classList.remove('show');
                });
                palette.appendChild(c);
            });
            menu.appendChild(palette);

            const custom = document.createElement('input');
            custom.type = 'color';
            custom.className = 'mublo-editor-color-custom';
            custom.title = def.title;
            custom.addEventListener('input', e => {
                this._exec(def.command, e.target.value);
            });
            custom.addEventListener('click', e => e.stopPropagation());
            menu.appendChild(custom);

            btn.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                this._closeAllDropdowns();
                menu.classList.toggle('show');
            });

            wrap.appendChild(btn);
            wrap.appendChild(menu);
            return wrap;
        }

        _closeAllDropdowns() {
            this.toolbar.querySelectorAll('.mublo-editor-dropdown-menu.show').forEach(m => m.classList.remove('show'));
        }

        _saveSelection() {
            const sel = window.getSelection();
            if (sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                if (this.contentArea.contains(range.commonAncestorContainer)) {
                    this.savedRange = range.cloneRange();
                }
            }
        }

        _restoreSelection() {
            this.contentArea.focus();
            if (this.savedRange) {
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(this.savedRange);
            }
        }

        _handleCommand(name, def) {
            this.contentArea.focus();
            // 플러그인 버튼: onClick(editor) 형태
            if (typeof def.onClick === 'function') {
                this._saveSelection();
                this._withLocale(() => def.onClick(this));
                return;
            }
            this._withLocale(() => { switch (def.type) {
                case 'quotegallery': this._openQuoteGallery(); break;
                case 'checklist': this._insertChecklist(); break;
                case 'toc': this._insertToc(); break;
                case 'link': this._insertLink(); break;
                case 'image': this._openImageDialog(); break;
                case 'video': this._insertVideo(); break;
                case 'table': this._insertTable(); break;
                case 'codeblock': this._insertCodeBlock(); break;
                case 'fullscreen': this._toggleFullscreen(); break;
                case 'source': this._toggleSource(); break;
                case 'print': this._print(); break;
                case 'findreplace': this._toggleFindReplace(); break;
                default: this._exec(def.command, def.value);
            } });
        }

        _exec(cmd, val = null) {
            // 실행취소/다시실행은 자체 히스토리 사용 (v1.7)
            if (cmd === 'undo') { this._historyUndo(); return; }
            if (cmd === 'redo') { this._historyRedo(); return; }

            this._restoreSelection();

            if (cmd === 'fontSize') {
                this._applyInlineStyle('fontSize', val);
                return;
            }

            if (cmd === 'foreColor') {
                this._applyInlineStyle('color', val);
                return;
            }

            if (cmd === 'hiliteColor') {
                this._applyInlineStyle('backgroundColor', val);
                return;
            }

            document.execCommand(cmd, false, val);
            this._normalizeFormattingMarkup();
            this._saveSelection();
            this._onChange();
        }

        /**
         * \uc120\ud0dd \uc601\uc5ed\uc5d0 \uc778\ub77c\uc778 \uc2a4\ud0c0\uc77c \uc801\uc6a9.
         *
         * \uc0c8 span \uc73c\ub85c \uac10\uc2f8\uae30\ub9cc \ud558\uba74 \uc138 \uac00\uc9c0\uac00 \ud55c\uaebc\ubc88\uc5d0 \uc5b4\uae0b\ub09c\ub2e4.
         * - \uc774\ubbf8 \uc0c9\uc774 \uc788\ub294 \uae00\uc790\ub97c \ub2e4\uc2dc \uce60\ud558\uba74 \uc0c8 span \uc774 \ubc14\uae65\uc744 \uac10\uc2f8\ub294\ub370,
         *   CSS \ub294 \uc548\ucabd\uc774 \uc774\uae30\ubbc0\ub85c \ud654\uba74\uc774 \ubc14\ub00c\uc9c0 \uc54a\ub294\ub2e4
         * - \uac10\uc2f8\uae30\ub9cc \ud558\ub2c8 \uc911\ucca9\uc774 \uacc4\uc18d \uc313\uc778\ub2e4
         * - \uc801\uc6a9 \ud6c4 \uce90\ub7ff\uc774 span \ub05d\uc73c\ub85c \ubaa8\uc774\uace0, \uadf8 \uc0c1\ud0dc\uc5d0\uc11c \ub2e4\uc2dc \uace0\ub974\uba74
         *   \uc81c\ub85c\ud3ed \ubb38\uc790\ub9cc \ub4e0 \ube48 span \uc774 \uc0c8\ub85c \uc0dd\uae34\ub2e4
         *
         * \uadf8\ub798\uc11c \uc785\ud788\uae30 \uc804\uc5d0 \uc120\ud0dd \uc548\uc758 \uac19\uc740 \uc18d\uc131 \uc120\uc5b8\uc744 \uba3c\uc800 \uac77\uc5b4\ub0b4\uace0,
         * \ub05d\ub09c \ub4a4 \ube48 span\u00b7\uc778\uc811 \uc911\ubcf5\uc744 \uc815\ub9ac\ud55c\ub2e4.
         */
        _applyInlineStyle(property, value) {
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0 || !value) {
                return;
            }

            const range = sel.getRangeAt(0);
            if (!this.contentArea.contains(range.commonAncestorContainer)) {
                return;
            }

            if (range.collapsed) {
                // \uc774\uc5b4\uc11c \uc785\ub825\ud560 \uc0c9\uc744 \uc608\uc57d\ud558\ub294 \uc790\ub9ac. \uc9c1\uc804\uc5d0 \ub9cc\ub4e4\uc5b4 \ub454 \ube48 span \uc548\uc5d0
                // \uce90\ub7ff\uc774 \uc788\uc73c\uba74 \uadf8\uac83\uc744 \ub2e4\uc2dc \uc4f4\ub2e4 \u2014 \uace0\ub97c \ub54c\ub9c8\ub2e4 \uc0c8\ub85c \ub9cc\ub4e4\uba74 \uc313\uc778\ub2e4.
                const pending = this._findPendingStyleSpan(range.startContainer);
                const span = pending || document.createElement('span');

                span.style[property] = value;

                if (!pending) {
                    span.appendChild(document.createTextNode(ZERO_WIDTH));
                    range.insertNode(span);
                }

                const textNode = span.firstChild;
                range.setStart(textNode, textNode.length);
                range.collapse(true);
            } else {
                const fragment = range.extractContents();
                this._stripInlineProperty(fragment, property);

                const span = document.createElement('span');
                span.style[property] = value;
                span.appendChild(fragment);
                range.insertNode(span);

                // 선택이 기존 span 의 내용 전체였다면 그 span 은 껍데기만 남고
                // 새 span 이 그 안에 들어간다. 바깥 선언이 살아 있으면 안쪽이 이겨
                // 화면은 바뀌지만 중첩이 계속 쌓인다 — 조상에서도 같은 속성을 걷어낸다.
                this._stripRedundantAncestors(span, property);

                const parent = span.parentNode;
                this._cleanupInlineSpans(parent);

                // \uc815\ub9ac \uacfc\uc815\uc5d0\uc11c \ubcd1\ud569\ub3fc \uc0ac\ub77c\uc84c\uc744 \uc218 \uc788\ub2e4
                if (span.isConnected) {
                    range.selectNodeContents(span);
                } else {
                    range.selectNodeContents(parent);
                }
                range.collapse(false);
            }

            sel.removeAllRanges();
            sel.addRange(range);
            this._saveSelection();
            this._onChange();
        }

        /**
         * \uce90\ub7ff\uc774 "\uc544\uc9c1 \uc785\ub825\ub418\uc9c0 \uc54a\uc740" \uc2a4\ud0c0\uc77c \uc608\uc57d span \uc548\uc5d0 \uc788\uc73c\uba74 \uadf8 span \uc744 \uc900\ub2e4.
         * \uc81c\ub85c\ud3ed \ubb38\uc790\ub9cc \ub4e4\uc5b4 \uc788\ub294 span \uc774 \uadf8 \ud45c\uc2dd\uc774\ub2e4.
         */
        _findPendingStyleSpan(node) {
            const el = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
            if (!el || el.tagName !== 'SPAN' || !this.contentArea.contains(el)) {
                return null;
            }

            return el.childNodes.length === 1
                && el.firstChild.nodeType === Node.TEXT_NODE
                && el.firstChild.data === ZERO_WIDTH
                ? el
                : null;
        }

        /**
         * \uc870\uac01 \uc548\uc758 \ud574\ub2f9 CSS \uc18d\uc131 \uc120\uc5b8\uc744 \ubaa8\ub450 \uc81c\uac70\ud55c\ub2e4.
         * \uc120\uc5b8\uc774 \uc0ac\ub77c\uc838 \uc544\ubb34 \uc5ed\ud560\uc774 \uc5c6\uc5b4\uc9c4 span \uc740 \uaecd\ub370\uae30\ub97c \ubc97\uae34\ub2e4.
         */
        _stripInlineProperty(root, property) {
            Array.from(root.querySelectorAll('*')).forEach(el => {
                if (!el.style || !el.style[property]) {
                    return;
                }

                el.style[property] = '';

                if (el.tagName !== 'SPAN') {
                    return;
                }
                if (el.getAttribute('style') === '') {
                    el.removeAttribute('style');
                }
                if (el.attributes.length === 0) {
                    el.replaceWith(...el.childNodes);
                }
            });
        }

        /**
         * \uc0c8\ub85c \ub9cc\ub4e0 span \uc744 \uac10\uc2f8\uace0 \uc788\ub294 \uc870\uc0c1 span \ub4e4\uc5d0\uc11c \uac19\uc740 \uc18d\uc131 \uc120\uc5b8\uc744 \uac77\uc5b4\ub0b8\ub2e4.
         * \uadf8 span \uc774 \uc774 \uc790\uc2dd \ub9d0\uace0 \uc2e4\uc9c8\uc801\uc778 \ub0b4\uc6a9\uc744 \ub354 \uac00\uc9c0\uace0 \uc788\uc73c\uba74 \uac74\ub4dc\ub9ac\uc9c0 \uc54a\ub294\ub2e4 \u2014
         * \uc120\ud0dd\ud558\uc9c0 \uc54a\uc740 \uae00\uc790\uc758 \uc11c\uc2dd\uae4c\uc9c0 \ubc14\uafb8\uac8c \ub41c\ub2e4.
         */
        _stripRedundantAncestors(span, property) {
            let parent = span.parentNode;

            while (parent
                && parent.nodeType === Node.ELEMENT_NODE
                && parent.tagName === 'SPAN'
                && parent !== this.contentArea
                && this.contentArea.contains(parent)
            ) {
                const onlyWrapsThis = parent.textContent === span.textContent;
                if (!onlyWrapsThis || !parent.style[property]) {
                    break;
                }

                parent.style[property] = '';
                if (parent.getAttribute('style') === '') {
                    parent.removeAttribute('style');
                }

                const next = parent.parentNode;
                if (parent.attributes.length === 0) {
                    parent.replaceWith(...parent.childNodes);
                }
                parent = next;
            }
        }

        /**
         * \ube48 span \uc81c\uac70 + \uc2a4\ud0c0\uc77c\uc774 \uac19\uc740 \uc778\uc811 span \ubcd1\ud569.
         * \ud3b8\uc9d1\uc744 \ubc18\ubcf5\ud560\uc218\ub85d \uc313\uc774\ub294 \uaecd\ub370\uae30\ub97c \uadf8\ub54c\uadf8\ub54c \uac77\uc5b4\ub0b8\ub2e4.
         *
         * getHTML() \uc740 \ub77c\uc774\ube0c DOM \uc774 \uc544\ub2c8\ub77c \ud074\ub860\uc5d0\uc11c \ubd80\ub974\ubbc0\ub85c, \ubb38\uc11c \uc5f0\uacb0 \uc5ec\ubd80\uac00 \uc544\ub2c8\ub77c
         * \uc804\ub2ec\ubc1b\uc740 root \uae30\uc900\uc73c\ub85c \ud310\ub2e8\ud574\uc57c \ud55c\ub2e4.
         */
        _cleanupInlineSpans(root) {
            if (!root || root.nodeType !== Node.ELEMENT_NODE) {
                return;
            }

            Array.from(root.querySelectorAll('span')).forEach(el => {
                if (!root.contains(el)) {
                    return;
                }
                // \ub0b4\uc6a9\uc774 \uc544\uc608 \uc5c6\uac70\ub098 \uc81c\ub85c\ud3ed \ubb38\uc790\ub9cc \ub0a8\uc740 \uaecd\ub370\uae30.
                // \uce90\ub7ff\uc774 \ub4e4\uc5b4 \uc788\ub294 \uc608\uc57d span \uc740 \ud3b8\uc9d1 \uc911\uc774\ubbc0\ub85c \ub0a8\uae34\ub2e4.
                const text = el.textContent;
                if (el.children.length === 0 && (text === '' || (text === ZERO_WIDTH && !this._containsSelection(el)))) {
                    el.remove();
                    return;
                }
                // \uc2a4\ud0c0\uc77c\uc774 \uc5c6\uc5b4\uc9c4 span \uc740 \uaecd\ub370\uae30\ub2e4
                if (el.attributes.length === 0) {
                    el.replaceWith(...el.childNodes);
                }
            });

            Array.from(root.querySelectorAll('span')).forEach(el => {
                const next = el.nextSibling;
                if (!root.contains(el) || !next || next.nodeType !== Node.ELEMENT_NODE) {
                    return;
                }
                if (next.tagName !== 'SPAN' || next.getAttribute('style') !== el.getAttribute('style')) {
                    return;
                }
                while (next.firstChild) {
                    el.appendChild(next.firstChild);
                }
                next.remove();
            });
        }

        _containsSelection(el) {
            const sel = window.getSelection();
            return sel && sel.rangeCount > 0 && el.contains(sel.getRangeAt(0).startContainer);
        }

        _normalizeFormattingMarkup() {
            this._normalizeFormattingMarkupOn(this.contentArea);
        }

        /**
         * font 태그 → span 변환 (지정된 root 요소에서 수행)
         * getHTML()에서는 클론에서 호출 → 라이브 DOM 보호
         */
        _normalizeFormattingMarkupOn(root) {
            if (!root) return;

            const fontNodes = Array.from(root.querySelectorAll('font'));
            fontNodes.forEach(node => {
                const span = document.createElement('span');
                const color = node.getAttribute('color');
                const face = node.getAttribute('face');
                const size = node.getAttribute('size');
                const inlineStyle = node.getAttribute('style');

                if (color) span.style.color = color;
                if (face) span.style.fontFamily = face;
                if (size) {
                    const mappedSize = this._mapLegacyFontSize(size);
                    if (mappedSize) span.style.fontSize = mappedSize;
                }
                if (inlineStyle) {
                    const currentStyle = span.getAttribute('style');
                    span.setAttribute('style', currentStyle ? `${currentStyle}; ${inlineStyle}` : inlineStyle);
                }

                Array.from(node.attributes).forEach(attr => {
                    const name = attr.name.toLowerCase();
                    if (name !== 'color' && name !== 'face' && name !== 'size' && name !== 'style') {
                        span.setAttribute(attr.name, attr.value);
                    }
                });

                while (node.firstChild) {
                    span.appendChild(node.firstChild);
                }
                node.replaceWith(span);
            });
        }

        _mapLegacyFontSize(size) {
            const sizeMap = {
                '1': '10px',
                '2': '13px',
                '3': '16px',
                '4': '18px',
                '5': '24px',
                '6': '32px',
                '7': '48px'
            };

            return sizeMap[String(size).trim()] || '';
        }

