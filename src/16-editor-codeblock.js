        // =========================================================
        // 코드 블록 보강 (언어 선택 · Tab 들여쓰기 · 다크 스타일)
        // =========================================================
        _initCodeBlockEditing() {
            const update = () => this._updateCodeBlockUI();
            this.contentArea.addEventListener('keyup', update);
            this.contentArea.addEventListener('mouseup', update);
            this.contentArea.addEventListener('click', update);
            this.contentArea.addEventListener('focus', update);
            this.contentArea.addEventListener('scroll', update);
            this.contentArea.addEventListener('blur', () => {
                setTimeout(() => {
                    if (!this._codeLangBar.contains(document.activeElement)) this._hideCodeLangBar();
                }, 150);
            });
        }

        _createCodeElement(language) {
            const pre = document.createElement('pre');
            pre.className = 'mublo-code-block';
            pre.setAttribute('data-language', language);
            const code = document.createElement('code');
            code.appendChild(document.createElement('br'));
            pre.appendChild(code);
            return pre;
        }

        _insertCodeBlock(lang) {
            this.contentArea.focus();
            this._restoreSelection();
            const language = (lang || 'text').toLowerCase();
            const block = this._getCurrentBlock();
            const pre = this._createCodeElement(language);

            if (block && this.contentArea.contains(block) && block.tagName !== 'PRE') {
                if (block.textContent.trim() === '') block.replaceWith(pre);
                else block.after(pre);
            } else {
                this.contentArea.appendChild(pre);
            }
            if (!pre.nextSibling) pre.after(this._makeEmptyParagraph());

            const code = pre.querySelector('code');
            this._placeCaretIn(code || pre);
            this._updateCodeBlockUI();
            this._onChange();
        }

        _convertBlockToCode(block, language) {
            const pre = this._createCodeElement(language);
            block.replaceWith(pre);
            if (!pre.nextSibling) pre.after(this._makeEmptyParagraph());
            const code = pre.querySelector('code');
            this._placeCaretIn(code || pre);
            this._updateCodeBlockUI();
            this._onChange();
        }

        _codeIndent() {
            document.execCommand('insertText', false, '  ');
            this._onChange();
            this._maybeScheduleHighlight();
        }

        _codeOutdent() {
            const sel = window.getSelection();
            if (!sel.rangeCount) return;
            const range = sel.getRangeAt(0);
            const node = range.startContainer;
            if (node.nodeType !== 3) return;
            const text = node.textContent;
            const off = range.startOffset;
            const lineStart = text.lastIndexOf('\n', off - 1) + 1;
            let remove = 0;
            while (remove < 2 && text[lineStart + remove] === ' ') remove++;
            if (remove > 0) {
                node.textContent = text.slice(0, lineStart) + text.slice(lineStart + remove);
                const newOff = Math.max(lineStart, off - remove);
                const r = document.createRange();
                r.setStart(node, Math.min(newOff, node.textContent.length));
                r.collapse(true);
                sel.removeAllRanges();
                sel.addRange(r);
                this._onChange();
                this._maybeScheduleHighlight();
            }
        }

        _updateCodeBlockUI() {
            if (!this._codeLangBar) return;
            if (this.isSourceMode) { this._hideCodeLangBar(); return; }
            const pre = this._getClosestCodeBlock();
            if (!pre) { this._hideCodeLangBar(); return; }

            this._activeCodeBlock = pre;
            const select = this._codeLangBar.querySelector('.mublo-editor-code-lang-select');
            const lang = (pre.getAttribute('data-language') || 'text').toLowerCase();
            if (select) select.value = CODE_LANGUAGES.includes(lang) ? lang : 'text';

            // pre 위 우측 모서리에 위치
            this._codeLangBar.style.display = 'flex';
            const preRect = pre.getBoundingClientRect();
            const wrapperRect = this.wrapper.getBoundingClientRect();
            const barRect = this._codeLangBar.getBoundingClientRect();
            const top = preRect.top - wrapperRect.top + 4;
            let left = preRect.right - wrapperRect.left - barRect.width - 4;
            if (left < 4) left = 4;
            this._codeLangBar.style.top = top + 'px';
            this._codeLangBar.style.left = left + 'px';
        }

        _hideCodeLangBar() {
            this._activeCodeBlock = null;
            if (this._codeLangBar) this._codeLangBar.style.display = 'none';
        }

        // =========================================================
        // 코드 구문 강조 적용 (커서 위치 보존)
        // =========================================================
        /**
         * 코드 요소의 텍스트를 문자 오프셋이 그대로 유지되도록 직렬화한다.
         * (텍스트 노드는 그대로, <br>·블록요소 경계는 '\n' 1글자로 카운트)
         * 전체 텍스트 추출과 커서 오프셋 계산이 같은 함수를 쓰므로 오프셋이 정확히 일치한다.
         */
        _serializeCodeText(node) {
            let out = '';
            node.childNodes.forEach(child => {
                if (child.nodeType === 3) {
                    out += child.data;
                } else if (child.nodeName === 'BR') {
                    out += '\n';
                } else if (child.nodeType === 1) {
                    if (/^(DIV|P)$/.test(child.nodeName) && out && !out.endsWith('\n')) out += '\n';
                    out += this._serializeCodeText(child);
                }
            });
            return out;
        }

        /** 코드 요소 시작부터 현재 커서까지의 문자 오프셋 (<br>=1) */
        _getCodeCaretOffset(code) {
            const sel = window.getSelection();
            if (!sel.rangeCount) return null;
            const range = sel.getRangeAt(0);
            if (range.startContainer !== code && !code.contains(range.startContainer)) return null;
            try {
                const pre = document.createRange();
                pre.setStart(code, 0);
                pre.setEnd(range.startContainer, range.startOffset);
                return this._serializeCodeText(pre.cloneContents()).length;
            } catch (e) {
                return null;
            }
        }

        /** 오프셋 위치에 커서 복원 (강조 후 결과에는 <br> 없이 '\n' 텍스트만 존재) */
        _setCodeCaretOffset(code, offset) {
            if (offset == null) return;
            let remaining = offset;
            const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT, null, false);
            let node, target = null, targetOffset = 0;
            while ((node = walker.nextNode())) {
                const len = node.data.length;
                if (remaining <= len) { target = node; targetOffset = remaining; break; }
                remaining -= len;
            }
            const sel = window.getSelection();
            const range = document.createRange();
            if (target) {
                range.setStart(target, targetOffset);
                range.collapse(true);
            } else {
                range.selectNodeContents(code);
                range.collapse(false);
            }
            sel.removeAllRanges();
            sel.addRange(range);
        }

        /** 입력/언어변경 시 활성 코드 블록 강조를 300ms 디바운스로 예약 */
        _maybeScheduleHighlight() {
            const pre = this._getClosestCodeBlock();
            if (pre) this._scheduleCodeHighlight(pre);
        }

        _scheduleCodeHighlight(pre) {
            clearTimeout(this._highlightTimer);
            this._highlightTimer = setTimeout(() => {
                this._highlightCodeBlock(pre, true);
            }, 300);
        }

        /** 단일 코드 블록에 구문 강조 적용 */
        _highlightCodeBlock(pre, preserveCaret) {
            if (!pre || !pre.isConnected) return;
            const code = pre.querySelector('code') || pre;
            const text = this._serializeCodeText(code);
            if (text.trim() === '') return; // 빈 블록/공백만 → 손대지 않음

            const lang = (pre.getAttribute('data-language') || 'text').toLowerCase();
            let caretOffset = null;
            if (preserveCaret && this._getClosestCodeBlock() === pre) {
                caretOffset = this._getCodeCaretOffset(code);
            }

            const html = highlightCodeToHtml(text, lang);
            if (code.innerHTML === html) return; // 변화 없으면 DOM 갱신 생략 (idle 시 무한 재계산 방지)

            code.innerHTML = html;
            if (caretOffset != null) this._setCodeCaretOffset(code, caretOffset);
            this._syncLight();
        }

        /** 콘텐츠 로드 시 모든 향상된 코드 블록 강조 (커서 없음) */
        _highlightAllCodeBlocks() {
            this.contentArea.querySelectorAll('pre.mublo-code-block').forEach(pre => {
                this._highlightCodeBlock(pre, false);
            });
        }

        _onPaste(e) {
            const items = e.clipboardData?.items;
            if (items && this.options.automatic_uploads) {
                for (const item of items) {
                    if (item.type.startsWith('image/')) {
                        e.preventDefault();
                        this._handleImageUpload(item.getAsFile());
                        return;
                    }
                }
            }
            // 스마트 붙여넣기: 클립보드가 단일 URL 이면 삽입 방식 선택 (v1.5)
            if (this.options.smartPaste && this._trySmartPaste(e)) return;
            if (this.options.sanitize) {
                const html = e.clipboardData?.getData('text/html');
                if (html) {
                    e.preventDefault();
                    this._exec('insertHTML', sanitizeHtml(html));
                }
            }
            this.fire('paste', { originalEvent: e });
        }

        _onDrop(e) {
            const files = e.dataTransfer?.files;
            if (files && this.options.automatic_uploads) {
                for (const file of files) {
                    if (file.type.startsWith('image/')) {
                        e.preventDefault();
                        this._handleImageUpload(file);
                    }
                }
            }
            this.fire('drop', { originalEvent: e });
        }

        _enforceMaxLength() {
            const max = this.options.maxLength;
            if (!max || max <= 0) return;
            const text = this.getText();
            if (text.length > max) {
                // Selection API로 초과분 truncate — IME 완료 후에만 동작
                const sel = window.getSelection();
                const range = document.createRange();
                const walker = document.createTreeWalker(this.contentArea, NodeFilter.SHOW_TEXT, null, false);
                let charCount = 0;
                while (walker.nextNode()) {
                    const node = walker.currentNode;
                    const remaining = max - charCount;
                    if (charCount + node.textContent.length > max) {
                        node.textContent = node.textContent.substring(0, remaining);
                        // 이후 노드 제거
                        while (walker.nextNode()) walker.currentNode.textContent = '';
                        // 커서를 truncate 지점에 배치
                        range.setStart(node, node.textContent.length);
                        range.collapse(true);
                        sel.removeAllRanges();
                        sel.addRange(range);
                        break;
                    }
                    charCount += node.textContent.length;
                }
                this.contentArea.normalize();
                this.fire('maxLengthExceeded', { max, length: text.length });
            }
        }

        _onChange() {
            // 입력 중에는 DOM을 건드리지 않는 경량 동기화만 수행
            // (getHTML()은 _normalizeFormattingMarkup()으로 DOM을 수정해서 커서가 날아감)
            this._syncLight();
            this._updateWordCount();
            this._historyScheduleCapture();
            // 콜백은 debounce로 지연 실행 (입력 중 커서 보호)
            clearTimeout(this._changeDebounce);
            this._changeDebounce = setTimeout(() => {
                this.options.onChange?.(this.getHTML(), this);
                this.fire('change', { content: this.getHTML() });
            }, 300);
        }

        /** 경량 동기화 — DOM 수정 없이 innerHTML만 textarea에 반영 */
        _syncLight() {
            if (this.isSourceMode) {
                this.originalElement.value = this.sourceArea.value;
            } else {
                this.originalElement.value = this.contentArea.innerHTML;
            }
        }

        _updateWordCount() {
            if (!this.options.showWordCount || !this.statusBar) return;

            const text = this.getText();
            const chars = text.length;
            const charsNoSpace = text.replace(/\s/g, '').length;
            const words = text.trim() ? text.trim().split(/\s+/).length : 0;

            let html = `${_t('chars')}: ${chars}`;
            if (this.options.maxLength > 0) {
                html += ` / ${this.options.maxLength}`;
                if (chars > this.options.maxLength) {
                    html = `<span class="mublo-editor-over-limit">${html}</span>`;
                }
            }
            html += ` | ${_t('charsNoSpace')}: ${charsNoSpace} | ${_t('words')}: ${words}`;

            this.statusBar.querySelector('.mublo-editor-wordcount').innerHTML = html;
            this.fire('wordcount', { chars, charsNoSpace, words, maxLength: this.options.maxLength });
        }

        _initPlugins() {
            plugins.forEach((fn, name) => {
                try { fn(this); } catch (e) { console.error(`Plugin ${name} error:`, e); }
            });
        }

