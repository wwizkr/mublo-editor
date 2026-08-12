        // =========================================================
        // 마크다운 단축키 (Space / Enter 시점 검사)
        // =========================================================
        /** @returns {boolean} 처리 여부 (true면 호출부에서 기본 동작 취소됨) */
        _handleMarkdownKeydown(e) {
            if (this._isComposing || e.isComposing || this.isSourceMode) return false;

            const sel = window.getSelection();
            if (!sel.isCollapsed || !sel.rangeCount) return false;

            // 코드 블록 내부에서는 마크다운 변환하지 않음
            if (this._getClosestCodeBlock()) return false;

            const range = sel.getRangeAt(0);
            const node = range.startContainer;
            const offset = range.startOffset;

            if (e.key === ' ') {
                // 1) 블록 레벨 변환 — 토큰이 블록 맨 앞에 있을 때
                if (this._handleBlockMarkdown(e, node, offset)) return true;
                // 2) 인라인 변환 (**굵게** 등)
                if (this._handleInlineMarkdown(e, node, offset)) return true;
                return false;
            }

            if (e.key === 'Enter') {
                // --- → 수평선, ``` → 코드 블록
                if (this._handleEnterMarkdown(e)) return true;
                return false;
            }
            return false;
        }

        _handleBlockMarkdown(e, node, offset) {
            if (node.nodeType !== 3) return false;
            const block = this._getCurrentBlock();
            if (!block) return false;
            // 리스트 항목 안에서는 재변환하지 않음
            if (block.tagName === 'LI') return false;

            const before = this._textBeforeCaret(block, node, offset);
            const MAP = {
                '#': ['formatBlock', 'h1'],
                '##': ['formatBlock', 'h2'],
                '###': ['formatBlock', 'h3'],
                '-': ['insertUnorderedList', null],
                '*': ['insertUnorderedList', null],
                '1.': ['insertOrderedList', null],
                '>': ['formatBlock', 'blockquote'],
                '[]': ['checklist', null],
            };
            const rule = MAP[before];
            if (!rule) return false;

            // 체크리스트는 별도 삽입 경로 (v1.7)
            if (rule[0] === 'checklist') {
                e.preventDefault();
                const del = document.createRange();
                del.setStart(block, 0);
                del.setEnd(node, offset);
                del.deleteContents();
                this._saveSelection();
                this._insertChecklist();
                this._flashMarkdown();
                return true;
            }

            e.preventDefault();
            // 토큰 텍스트 제거
            const del = document.createRange();
            del.setStart(block, 0);
            del.setEnd(node, offset);
            del.deleteContents();

            // 커서를 블록 앞으로 이동
            const sel = window.getSelection();
            const caret = document.createRange();
            caret.setStart(block, 0);
            caret.collapse(true);
            sel.removeAllRanges();
            sel.addRange(caret);

            this.contentArea.focus();
            document.execCommand(rule[0], false, rule[1]);
            this._normalizeFormattingMarkup();
            this._saveSelection();
            this._flashMarkdown();
            this._onChange();
            return true;
        }

        _handleInlineMarkdown(e, node, offset) {
            if (node.nodeType !== 3) return false;
            const before = node.textContent.slice(0, offset);
            const RULES = [
                { re: /\*\*([^*\s](?:[^*]*[^*\s])?)\*\*$/, tag: 'strong' },
                { re: /__([^_\s](?:[^_]*[^_\s])?)__$/, tag: 'strong' },
                { re: /\*([^*\s](?:[^*]*[^*\s])?)\*$/, tag: 'em' },
                { re: /`([^`\s](?:[^`]*[^`\s])?)`$/, tag: 'code' },
            ];
            for (const rule of RULES) {
                const m = before.match(rule.re);
                if (!m) continue;

                e.preventDefault();
                const start = offset - m[0].length;
                const range = document.createRange();
                range.setStart(node, start);
                range.setEnd(node, offset);
                range.deleteContents();

                const el = document.createElement(rule.tag);
                el.textContent = m[1];
                range.insertNode(el);

                // 서식 밖으로 커서를 빼내기 위해 공백 텍스트 노드 삽입
                const spacer = document.createTextNode(' ');
                if (el.nextSibling) {
                    el.parentNode.insertBefore(spacer, el.nextSibling);
                } else {
                    el.parentNode.appendChild(spacer);
                }
                const sel = window.getSelection();
                const caret = document.createRange();
                caret.setStart(spacer, 1);
                caret.collapse(true);
                sel.removeAllRanges();
                sel.addRange(caret);

                this._saveSelection();
                this._flashMarkdown();
                this._onChange();
                return true;
            }
            return false;
        }

        _handleEnterMarkdown(e) {
            const block = this._getCurrentBlock();
            if (!block || block.tagName === 'PRE' || block.tagName === 'LI') return false;

            const text = block.textContent.trim();

            // 수평선: ---, ***, ___ (3개 이상)
            if (/^(-{3,}|\*{3,}|_{3,})$/.test(text)) {
                e.preventDefault();
                const hr = document.createElement('hr');
                const p = this._makeEmptyParagraph();
                block.replaceWith(hr);
                hr.after(p);
                this._placeCaretIn(p);
                this._flashMarkdown();
                this._onChange();
                return true;
            }

            // 코드 블록: ``` 또는 ```언어
            const codeMatch = text.match(/^```([a-z0-9]*)$/i);
            if (codeMatch) {
                e.preventDefault();
                const lang = (codeMatch[1] || 'text').toLowerCase();
                this._convertBlockToCode(block, lang);
                this._flashMarkdown();
                return true;
            }
            return false;
        }

        _makeEmptyParagraph() {
            const p = document.createElement('p');
            p.appendChild(document.createElement('br'));
            return p;
        }

        _placeCaretIn(el) {
            const sel = window.getSelection();
            const range = document.createRange();
            range.setStart(el, 0);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            this.contentArea.focus();
        }

        // =========================================================
        // 토스트 메시지
        // =========================================================
        _showToast(message, type = 'info') {
            const toast = document.createElement('div');
            toast.className = `mublo-editor-toast mublo-editor-toast-${type}`;
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; }, 2500);
            setTimeout(() => toast.remove(), 3000);
        }

        // =========================================================
        // 이미지 hover 교체 안내 툴팁
        // =========================================================
        _showImageTooltip(img) {
            this._hideImageTooltip();
            const rect = img.getBoundingClientRect();

            const tip = document.createElement('div');
            tip.className = 'mublo-editor-img-tooltip';
            tip.innerHTML = _t('imageTooltip');
            document.body.appendChild(tip);
            this._imgTooltip = tip;

            const tipRect = tip.getBoundingClientRect();
            let top = rect.top + window.scrollY - tipRect.height - 8;
            let left = rect.left + window.scrollX + (rect.width / 2) - (tipRect.width / 2);

            if (left < 8) left = 8;
            if (left + tipRect.width > window.innerWidth - 8) left = window.innerWidth - tipRect.width - 8;
            if (top < window.scrollY + 8) top = rect.bottom + window.scrollY + 8;

            tip.style.top = top + 'px';
            tip.style.left = left + 'px';

            tip.addEventListener('mouseover', () => clearTimeout(this._imgTooltipTimer));
            tip.addEventListener('mouseout', () => {
                this._imgTooltipTimer = setTimeout(() => this._hideImageTooltip(), 1500);
            });
        }

        _hideImageTooltip() {
            if (this._imgTooltip) {
                this._imgTooltip.remove();
                this._imgTooltip = null;
            }
        }

        _getImageFigure(img) {
            const figure = img.closest('figure');
            return figure && this.contentArea.contains(figure) ? figure : null;
        }

        _ensureImageFigure(img) {
            let figure = this._getImageFigure(img);
            if (figure) return figure;

            figure = document.createElement('figure');
            figure.className = 'mublo-image';
            figure.style.margin = '1em 0';
            figure.style.textAlign = 'center';
            img.parentNode.insertBefore(figure, img);
            figure.appendChild(img);
            return figure;
        }

        _getImageCaption(img) {
            const figure = this._getImageFigure(img);
            const caption = figure?.querySelector('figcaption');
            return caption ? caption.textContent.trim() : '';
        }

        _applyImageMetadata(img, alt, caption) {
            img.setAttribute('alt', alt);

            const currentFigure = this._getImageFigure(img);
            const currentCaption = currentFigure?.querySelector('figcaption');

            if (!caption) {
                currentCaption?.remove();
                return;
            }

            const figure = currentFigure || this._ensureImageFigure(img);
            const figcaption = currentCaption || document.createElement('figcaption');
            figcaption.className = 'mublo-image-caption';
            figcaption.textContent = caption;

            if (!currentCaption) {
                figure.appendChild(figcaption);
            }
        }

        // =========================================================
        // 이미지 리사이저
        // =========================================================
        _initImageResizer() {
            // 이미지 클릭 시 리사이저 표시
            this.contentArea.addEventListener('click', (e) => {
                if (e.target.tagName === 'IMG') {
                    this._selectImage(e.target);
                } else {
                    this._hideResizer();
                }
            });

            // 이미지 hover 시 교체 안내 툴팁
            this._imgTooltip = null;
            this._imgTooltipTimer = null;

            this.contentArea.addEventListener('mouseover', (e) => {
                if (e.target.tagName !== 'IMG') return;
                clearTimeout(this._imgTooltipTimer);
                this._showImageTooltip(e.target);
            }, true);

            this.contentArea.addEventListener('mouseout', (e) => {
                if (e.target.tagName !== 'IMG') return;
                this._imgTooltipTimer = setTimeout(() => this._hideImageTooltip(), 1500);
            }, true);

            // 이미지 더블클릭 시 교체 다이얼로그 열기
            this.contentArea.addEventListener('dblclick', (e) => {
                if (e.target.tagName === 'IMG') {
                    e.preventDefault();
                    e.stopPropagation();
                    this._replacingImage = e.target;
                    // 모달 열기 전 잠깐 지연 — click 이벤트 처리 완료 후 실행
                    setTimeout(() => this._openImageModal(), 0);
                }
            });

            // 스크롤 시 리사이저 위치 업데이트
            this.contentArea.addEventListener('scroll', () => this._updateResizerPosition());
            
            // 윈도우 리사이즈 핸들러
            this._handlers.winResize = () => this._updateResizerPosition();
            window.addEventListener('resize', this._handlers.winResize);

            // 핸들 드래그 — 8방향 (모서리 4=비율 유지, 가운데 4=자유 크기)
            const MIN_SIZE = 50;
            const CORNERS = ['nw', 'ne', 'se', 'sw'];
            let startX, startY, startWidth, startHeight, activeDir, aspect;

            const onMouseMove = (e) => {
                if (!activeDir || !this._selectedImage) return;
                e.preventDefault();

                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                const isCorner = CORNERS.includes(activeDir);

                let newWidth = startWidth;
                let newHeight = startHeight;

                // 가로 변화량 (방향에 따라 부호 결정)
                if (activeDir.includes('e')) newWidth = startWidth + dx;
                else if (activeDir.includes('w')) newWidth = startWidth - dx;

                // 세로 변화량
                if (activeDir.includes('s')) newHeight = startHeight + dy;
                else if (activeDir.includes('n')) newHeight = startHeight - dy;

                if (isCorner) {
                    // 비율 유지 — 가로 기준으로 세로 계산
                    newWidth = Math.max(MIN_SIZE, newWidth);
                    newHeight = Math.round(newWidth / aspect);
                    if (newHeight < MIN_SIZE) {
                        newHeight = MIN_SIZE;
                        newWidth = Math.round(newHeight * aspect);
                    }
                    this._selectedImage.style.width = newWidth + 'px';
                    this._selectedImage.style.height = newHeight + 'px';
                } else if (activeDir === 'e' || activeDir === 'w') {
                    // 자유 — 가로만
                    newWidth = Math.max(MIN_SIZE, newWidth);
                    this._selectedImage.style.width = newWidth + 'px';
                } else {
                    // 자유 — 세로만 (n / s)
                    newHeight = Math.max(MIN_SIZE, newHeight);
                    this._selectedImage.style.height = newHeight + 'px';
                }

                this._updateResizerPosition();
                this._updateResizeSizeLabel();
            };

            const onMouseUp = () => {
                if (activeDir && this._selectedImage) {
                    // 최종 크기를 width/height 속성에 반영
                    const w = Math.round(this._selectedImage.offsetWidth);
                    const h = Math.round(this._selectedImage.offsetHeight);
                    this._selectedImage.setAttribute('width', w);
                    this._selectedImage.setAttribute('height', h);
                    this._onChange();
                }
                activeDir = null;
                this._resizer.classList.remove('mublo-editor-resizer-dragging');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            this._resizer.addEventListener('mousedown', (e) => {
                const handle = e.target.closest('.mublo-editor-resizer-handle');
                if (handle && this._selectedImage) {
                    e.preventDefault();
                    activeDir = handle.dataset.dir;
                    startX = e.clientX;
                    startY = e.clientY;
                    startWidth = this._selectedImage.offsetWidth;
                    startHeight = this._selectedImage.offsetHeight;
                    aspect = startHeight > 0 ? startWidth / startHeight : 1;
                    this._resizer.classList.add('mublo-editor-resizer-dragging');
                    this._updateResizeSizeLabel();
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                }
            });
        }

        _updateResizeSizeLabel() {
            if (!this._selectedImage) return;
            const label = this._resizer.querySelector('.mublo-editor-resizer-size');
            if (label) {
                label.textContent = `${Math.round(this._selectedImage.offsetWidth)} × ${Math.round(this._selectedImage.offsetHeight)}`;
            }
        }

        _selectImage(img) {
            this._selectedImage = img;
            this._resizer.classList.add('active');
            this._updateResizerPosition();
            this._updateResizeSizeLabel();

            // contentArea에 포커스 확보 후 커서를 이미지 직후에 위치
            // selectNode 대신 setStartAfter 사용 — 브라우저 파란 selection 하이라이트 방지
            this.contentArea.focus();
            try {
                const range = document.createRange();
                range.setStartAfter(img);
                range.collapse(true);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            } catch (e) {
                // 범위 설정 실패 시 포커스만 유지
            }
        }

        _hideResizer() {
            this._selectedImage = null;
            this._resizer.classList.remove('active');
        }

        _updateResizerPosition() {
            if (!this._selectedImage) return;

            const imgRect = this._selectedImage.getBoundingClientRect();
            const wrapperRect = this.wrapper.getBoundingClientRect();

            // wrapper 기준 상대 좌표 계산
            const top = imgRect.top - wrapperRect.top;
            const left = imgRect.left - wrapperRect.left;

            this._resizer.style.top = top + 'px';
            this._resizer.style.left = left + 'px';
            this._resizer.style.width = imgRect.width + 'px';
            this._resizer.style.height = imgRect.height + 'px';
        }

