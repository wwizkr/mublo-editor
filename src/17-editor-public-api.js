        // =========================================================
        // Public API
        // =========================================================
        getHTML() {
            let html = this.isSourceMode ? this.sourceArea.value : this.contentArea.innerHTML;
            if (!this.isSourceMode) {
                // 클론에서 normalize 수행 — 라이브 DOM을 건드리지 않아 커서 보호
                const clone = this.contentArea.cloneNode(true);
                this._normalizeFormattingMarkupOn(clone);
                // 서식 예약용 빈 span 과 인접 중복은 저장본에 남기지 않는다.
                // 클론이라 편집 중인 캐럿에는 영향이 없다.
                this._cleanupInlineSpans(clone);
                // 편집용 임시 상태 클래스 제거 (셀 선택 하이라이트)
                clone.querySelectorAll('.mublo-editor-cell-selected')
                    .forEach(el => el.classList.remove('mublo-editor-cell-selected'));
                clone.querySelectorAll('[class=""]').forEach(el => el.removeAttribute('class'));
                html = clone.innerHTML;
            }
            html = this._formatHTML(convertCodeShortcodesToHtml(html));
            // 앞뒤 빈 <p> 태그 제거 (<p><br></p>, <p>&nbsp;</p>, <p></p> 등)
            html = html.replace(/^(\s*<p[^>]*>\s*(<br\s*\/?>|&nbsp;)?\s*<\/p>\s*)+/i, '');
            html = html.replace(/(\s*<p[^>]*>\s*(<br\s*\/?>|&nbsp;)?\s*<\/p>\s*)+$/i, '');
            return html;
        }
        
        setHTML(html) {
            let safe = this.options.sanitize ? sanitizeHtml(html) : html;
            safe = convertCodeShortcodesToHtml(safe);
            
            // 1. 내용이 없으면 기본 P 태그 삽입 (첫 줄 div 방지)
            if (!safe && !this.options.readonly) {
                safe = '<p><br></p>';
            } else if (!this.options.readonly) {
                // 2. 내용이 블록 태그로 시작하지 않으면 <p>로 감싸기 (평문 초기화 대응)
                const trimmed = safe.trim();
                const blockTags = ['<p', '<div', '<h1', '<h2', '<h3', '<h4', '<h5', '<h6', '<ul', '<ol', '<table', '<blockquote', '<pre', '<hr', '<style', '<section', '<article', '<header', '<footer', '<nav', '<aside'];
                const startsWithBlock = blockTags.some(tag => trimmed.toLowerCase().startsWith(tag));
                
                if (!startsWithBlock) {
                    safe = `<p>${safe}</p>`;
                }
            }
            this.contentArea.innerHTML = safe;
            // 로드된 향상된 코드 블록에 구문 강조 적용 (텍스트 기반이라 저장된 span 유무와 무관하게 정규화)
            this._highlightAllCodeBlocks();
            this.sourceArea.value = this.contentArea.innerHTML;
            this.sync();
            // 히스토리 기준점 (v1.7)
            this._historyCapture();
            return this;
        }
        
        getText() { return this.contentArea.textContent || ''; }
        isEmpty() { return !this.getText().trim(); }

        getWordCount() {
            const text = this.getText();
            return {
                chars: text.length,
                charsNoSpace: text.replace(/\s/g, '').length,
                words: text.trim() ? text.trim().split(/\s+/).length : 0
            };
        }
        focus() { (this.isSourceMode ? this.sourceArea : this.contentArea).focus(); return this; }
        blur() { (this.isSourceMode ? this.sourceArea : this.contentArea).blur(); return this; }
        sync() { this.originalElement.value = this.getHTML(); return this; }

        setReadonly(readonly) {
            this.options.readonly = readonly;
            this.contentArea.contentEditable = !readonly;
            this.sourceArea.readOnly = readonly;
            this.wrapper.classList.toggle('mublo-editor-readonly', readonly);

            // 툴바 버튼 비활성화
            this.toolbar.querySelectorAll('.mublo-editor-btn').forEach(btn => {
                btn.disabled = readonly;
            });

            this.fire('readonlyStateChanged', { state: readonly });
            return this;
        }

        isReadonly() {
            return this.options.readonly;
        }

        enable() { return this.setReadonly(false); }
        disable() { return this.setReadonly(true); }
        
        insertContent(html) {
            this._restoreSelection();
            const safe = this.options.sanitize ? sanitizeHtml(html) : html;
            this._exec('insertHTML', safe);
            return this;
        }

        insertTrustedContent(html) {
            this._restoreSelection();
            this._exec('insertHTML', html);
            return this;
        }

        insertImage(url, alt = '') {
            // 교체 모드: 기존 이미지의 src를 교체
            if (this._replacingImage) {
                this._replacingImage.src = url;
                if (alt) this._replacingImage.alt = alt;
                if (!this._replacingImage.hasAttribute('loading')) {
                    this._replacingImage.setAttribute('loading', 'lazy');
                }
                this._hideResizer();
                this._replacingImage = null;
                this.fire('change');
                return this;
            }
            const html = `<figure class="mublo-image" style="margin:1em 0; text-align:center;"><img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy" style="max-width:100%; height:auto; border-radius:4px;"></figure>`;
            return this.insertContent(html);
        }

        insertVideo(url) {
            const embedUrl = this._parseVideoUrl(url);
            if (!embedUrl) {
                console.error('[MubloEditor] Invalid video URL:', url);
                return this;
            }
            const html = `<div class="mublo-editor-video-wrapper" contenteditable="false">
                <iframe src="${escapeHtml(embedUrl)}" frameborder="0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
            </div>`;
            return this.insertContent(html);
        }

        destroy() {
            this.fire('destroy');
            this._stopAutosave();
            clearTimeout(this._highlightTimer);
            clearTimeout(this._mdFlashTimer);
            this.originalElement.style.display = '';
            
            // 전역 리스너 제거
            if (this._handlers.docClick) document.removeEventListener('click', this._handlers.docClick);
            if (this._handlers.winResize) window.removeEventListener('resize', this._handlers.winResize);
            if (this._handlers.docMouseup) document.removeEventListener('mouseup', this._handlers.docMouseup);
            if (this._handlers.docCloseTableMenu) document.removeEventListener('mousedown', this._handlers.docCloseTableMenu);
            if (this._handlers.docScrollCloseMenu) document.removeEventListener('scroll', this._handlers.docScrollCloseMenu, true);
            if (this._toolbarMedia && this._handlers.toolbarMediaChange) {
                if (typeof this._toolbarMedia.removeEventListener === 'function') {
                    this._toolbarMedia.removeEventListener('change', this._handlers.toolbarMediaChange);
                } else if (typeof this._toolbarMedia.removeListener === 'function') {
                    this._toolbarMedia.removeListener(this._handlers.toolbarMediaChange);
                }
            }

            // 부유 UI 정리
            this._hideTableContextMenu();
            this._hideImageTooltip();
            this._hideSlashMenu();

            this.wrapper.remove();
            instances.delete(this.id);
            if (this.isFullscreen) document.body.classList.remove('mublo-editor-noscroll');
            this._eventListeners.clear();
        }
        
        getElement() { return this.contentArea; }
        getWrapper() { return this.wrapper; }
        getToolbar() { return this.toolbar; }
    }

