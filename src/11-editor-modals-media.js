        // =========================================================
        // 모달 시스템
        // =========================================================
        _createModal(title, bodyHtml, primaryBtnText = null, onPrimaryClick = null) {
            if (primaryBtnText === null) primaryBtnText = _t('confirm');
            const existingModal = document.getElementById('mublo-editor-modal');
            if (existingModal) existingModal.remove();

            const modal = document.createElement('div');
            modal.id = 'mublo-editor-modal';
            modal.className = 'mublo-editor-modal';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-label', String(title).replace(/<[^>]*>/g, ''));
            modal.innerHTML = `
                <div class="mublo-editor-modal-backdrop"></div>
                <div class="mublo-editor-modal-dialog">
                    <div class="mublo-editor-modal-header">
                        <h5>${title}</h5>
                        <button type="button" class="mublo-editor-modal-close">&times;</button>
                    </div>
                    <div class="mublo-editor-modal-body">${bodyHtml}</div>
                    <div class="mublo-editor-modal-footer">
                        <div></div>
                        <div>
                            <button type="button" class="mublo-editor-modal-btn mublo-editor-modal-btn-secondary" id="mublo-editor-modal-cancel">${_t('cancel')}</button>
                            <button type="button" class="mublo-editor-modal-btn mublo-editor-modal-btn-primary" id="mublo-editor-modal-confirm">${primaryBtnText}</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const closeBtn = modal.querySelector('.mublo-editor-modal-close');
            const cancelBtn = modal.querySelector('#mublo-editor-modal-cancel');
            const confirmBtn = modal.querySelector('#mublo-editor-modal-confirm');
            const backdrop = modal.querySelector('.mublo-editor-modal-backdrop');

            const closeModal = () => {
                modal.classList.add('mublo-editor-modal-closing');
                setTimeout(() => modal.remove(), 200);
                this._restoreSelection();
            };

            closeBtn.addEventListener('click', closeModal);
            cancelBtn.addEventListener('click', closeModal);
            backdrop.addEventListener('click', closeModal);

            if (onPrimaryClick) {
                confirmBtn.addEventListener('click', () => {
                    if (onPrimaryClick(modal) !== false) {
                        closeModal();
                    }
                });
            }

            // ESC 닫기 + Tab 포커스 트랩 (v1.7 a11y)
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    closeModal();
                    document.removeEventListener('keydown', escHandler);
                    return;
                }
                if (e.key === 'Tab' && document.body.contains(modal)) {
                    const focusables = Array.from(modal.querySelectorAll(
                        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                    )).filter(el => !el.disabled && el.offsetParent !== null);
                    if (!focusables.length) return;
                    const first = focusables[0];
                    const last = focusables[focusables.length - 1];
                    if (e.shiftKey && document.activeElement === first) {
                        e.preventDefault(); last.focus();
                    } else if (!e.shiftKey && document.activeElement === last) {
                        e.preventDefault(); first.focus();
                    } else if (!modal.contains(document.activeElement)) {
                        e.preventDefault(); first.focus();
                    }
                }
            };
            document.addEventListener('keydown', escHandler);

            // 첫 번째 입력창 포커스
            const firstInput = modal.querySelector('input, select, textarea');
            if (firstInput) setTimeout(() => firstInput.focus(), 50);

            return modal;
        }

        _insertLink() {
            this._saveSelection();
            const sel = window.getSelection();
            const text = sel.toString();
            
            const body = `
                <div class="mublo-editor-modal-form-group">
                    <label class="mublo-editor-modal-label">${_t('linkUrl')}</label>
                    <input type="text" class="mublo-editor-modal-input" id="mublo-editor-link-url" value="https://" placeholder="https://example.com">
                </div>
                <div class="mublo-editor-modal-form-group">
                    <label class="mublo-editor-modal-label">${_t('linkText')}</label>
                    <input type="text" class="mublo-editor-modal-input" id="mublo-editor-link-text" value="${escapeHtml(text)}">
                </div>
                <div class="mublo-editor-modal-check">
                    <input type="checkbox" id="mublo-editor-link-target" checked>
                    <label for="mublo-editor-link-target">${_t('linkNewTab')}</label>
                </div>
            `;

            this._createModal(_t('linkInsert'), body, _t('insert'), (modal) => {
                const url = modal.querySelector('#mublo-editor-link-url').value.trim();
                const label = modal.querySelector('#mublo-editor-link-text').value.trim();
                const target = modal.querySelector('#mublo-editor-link-target').checked ? '_blank' : '_self';

                if (!url || url === 'https://') return false;

                const rel = target === '_blank' ? ' rel="noopener noreferrer"' : '';
                const html = `<a href="${escapeHtml(url)}" target="${target}"${rel}>${escapeHtml(label || url)}</a>`;
                this._exec('insertHTML', html);
            });
        }

        _openImageDialog() {
            // 현재 커서 위치 저장 (모달이 열리면 포커스 소실)
            this._saveSelection();
            this._openImageModal();
        }

        _openImageModal() {
            // 기존 모달이 있으면 제거
            const existingModal = document.getElementById('mublo-editor-modal');
            if (existingModal) existingModal.remove();

            // 모달 생성
            const modal = document.createElement('div');
            modal.id = 'mublo-editor-modal';
            modal.className = 'mublo-editor-modal';
            modal.innerHTML = `
                <div class="mublo-editor-modal-backdrop"></div>
                <div class="mublo-editor-modal-dialog">
                    <div class="mublo-editor-modal-header">
                        <h5>${_t('imageAdd')}</h5>
                        <button type="button" class="mublo-editor-modal-close">&times;</button>
                    </div>
                    <div class="mublo-editor-modal-body">
                        <div class="mublo-editor-image-upload-zone" id="mublo-editor-upload-zone">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <rect x="3" y="3" width="18" height="18" rx="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5"/>
                                <path d="M21 15l-5-5L5 21"/>
                            </svg>
                            <p>${_t('imageDragOrClick')}</p>
                            <p class="mublo-editor-image-upload-hint">${_t('imageHint')}</p>
                            <input type="file" id="mublo-editor-image-input" accept="image/*" multiple hidden>
                        </div>
                        <div class="mublo-editor-image-url-input">
                            <input type="text" id="mublo-editor-image-url" placeholder="${_t('imageUrlPlaceholder')}">
                            <button type="button" id="mublo-editor-image-url-add">${_t('imageUrlAdd')}</button>
                        </div>
                        <div class="mublo-editor-image-preview-list" id="mublo-editor-preview-list">
                        </div>
                        <div class="mublo-editor-image-meta" id="mublo-editor-image-meta" style="display:none;">
                            <div class="mublo-editor-modal-form-group">
                                <label class="mublo-editor-modal-label">${_t('imageAlt')}</label>
                                <input type="text" class="mublo-editor-modal-input" id="mublo-editor-image-alt" placeholder="${_t('imageAltPlaceholder')}">
                            </div>
                            <div class="mublo-editor-modal-form-group">
                                <label class="mublo-editor-modal-label">${_t('imageCaption')}</label>
                                <input type="text" class="mublo-editor-modal-input" id="mublo-editor-image-caption" placeholder="${_t('imageCaptionPlaceholder')}">
                            </div>
                        </div>
                        <p class="mublo-editor-image-drag-hint" id="mublo-editor-drag-hint" style="display:none;">
                            ${_t('imageDragHint')}
                        </p>
                    </div>
                    <div class="mublo-editor-modal-footer">
                        <span class="mublo-editor-image-count">${_t('imageSelected')} <strong id="mublo-editor-image-count">0</strong>${_t('imageCount')}</span>
                        <div>
                            <button type="button" class="mublo-editor-modal-btn mublo-editor-modal-btn-secondary" id="mublo-editor-image-cancel">${_t('cancel')}</button>
                            <button type="button" class="mublo-editor-modal-btn mublo-editor-modal-btn-primary" id="mublo-editor-image-insert" disabled>${_t('insert')}</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            this._pendingImages = [];

            // 교체 모드일 때 UI 조정
            if (this._replacingImage) {
                modal.querySelector('.mublo-editor-modal-header h5').textContent = _t('imageReplace');
                modal.querySelector('#mublo-editor-image-insert').textContent = _t('imageUpdate');
                modal.querySelector('#mublo-editor-image-insert').disabled = false;
                modal.querySelector('#mublo-editor-image-input').removeAttribute('multiple');
                modal.querySelector('#mublo-editor-image-meta').style.display = 'block';
                modal.querySelector('#mublo-editor-image-alt').value = this._replacingImage.getAttribute('alt') || '';
                modal.querySelector('#mublo-editor-image-caption').value = this._getImageCaption(this._replacingImage);
            }

            // 외부 미디어 피커 확장 지점 (플러그인/패키지에서 탭 추가 가능)
            // 사용: editor.on('imageModalReady', function(e) { /* 탭 추가 */ })
            this.fire('imageModalReady', { modal: modal });

            this._setupImageModal(modal);
        }

        _setupImageModal(modal) {
            const uploadZone = modal.querySelector('#mublo-editor-upload-zone');
            const fileInput = modal.querySelector('#mublo-editor-image-input');
            const urlInput = modal.querySelector('#mublo-editor-image-url');
            const urlAddBtn = modal.querySelector('#mublo-editor-image-url-add');
            const previewList = modal.querySelector('#mublo-editor-preview-list');
            const insertBtn = modal.querySelector('#mublo-editor-image-insert');
            const cancelBtn = modal.querySelector('#mublo-editor-image-cancel');
            const closeBtn = modal.querySelector('.mublo-editor-modal-close');
            const backdrop = modal.querySelector('.mublo-editor-modal-backdrop');
            const countEl = modal.querySelector('#mublo-editor-image-count');
            const dragHint = modal.querySelector('#mublo-editor-drag-hint');

            // 파일 선택
            uploadZone.addEventListener('click', () => fileInput.click());

            fileInput.addEventListener('change', () => {
                this._addFilesToPreview(Array.from(fileInput.files), previewList, countEl, insertBtn, dragHint);
                fileInput.value = '';
            });

            // 드래그 앤 드롭
            uploadZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadZone.classList.add('mublo-editor-image-upload-zone-active');
            });
            uploadZone.addEventListener('dragleave', () => {
                uploadZone.classList.remove('mublo-editor-image-upload-zone-active');
            });
            uploadZone.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadZone.classList.remove('mublo-editor-image-upload-zone-active');
                const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                this._addFilesToPreview(files, previewList, countEl, insertBtn, dragHint);
            });

            // URL로 추가
            urlAddBtn.addEventListener('click', () => {
                const url = urlInput.value.trim();
                if (url) {
                    this._addUrlToPreview(url, previewList, countEl, insertBtn, dragHint);
                    urlInput.value = '';
                }
            });
            urlInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    urlAddBtn.click();
                }
            });

            // 닫기
            const closeModal = () => {
                modal.classList.add('mublo-editor-modal-closing');
                setTimeout(() => modal.remove(), 200);
                this._pendingImages = [];
                this._replacingImage = null;
            };
            closeBtn.addEventListener('click', closeModal);
            cancelBtn.addEventListener('click', closeModal);
            backdrop.addEventListener('click', closeModal);

            // 삽입
            insertBtn.addEventListener('click', async () => {
                insertBtn.disabled = true;
                insertBtn.textContent = _t('uploading');
                const replaceMode = !!this._replacingImage;
                const targetImage = this._replacingImage;
                const altInput = modal.querySelector('#mublo-editor-image-alt');
                const captionInput = modal.querySelector('#mublo-editor-image-caption');
                const altText = altInput ? altInput.value.trim() : '';
                const captionText = captionInput ? captionInput.value.trim() : '';

                for (const item of this._pendingImages) {
                    if (item.type === 'file') {
                        await this._handleImageUpload(item.file);
                    } else if (item.type === 'url') {
                        this.insertImage(item.url, altText);
                    }
                    if (replaceMode) {
                        break;
                    }
                }

                if (replaceMode && targetImage) {
                    this._applyImageMetadata(targetImage, altText, captionText);
                    this._onChange();
                }

                closeModal();
            });

            // ESC로 닫기
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    closeModal();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);

            // 드래그로 순서 변경
            this._setupPreviewDragSort(previewList);
        }

        _addFilesToPreview(files, previewList, countEl, insertBtn, dragHint) {
            if (this._replacingImage) {
                files = files.slice(0, 1);
                this._pendingImages = [];
                previewList.innerHTML = '';
            }
            files.forEach(file => {
                if (!file.type.startsWith('image/')) return;

                const reader = new FileReader();
                reader.onload = (e) => {
                    const id = 'img-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);
                    this._pendingImages.push({ id, type: 'file', file, preview: e.target.result });
                    this._renderPreviewItem(id, e.target.result, file.name, previewList, countEl, insertBtn, dragHint);
                };
                reader.readAsDataURL(file);
            });
        }

        _addUrlToPreview(url, previewList, countEl, insertBtn, dragHint) {
            if (this._replacingImage) {
                this._pendingImages = [];
                previewList.innerHTML = '';
            }
            const id = 'img-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);
            this._pendingImages.push({ id, type: 'url', url });
            this._renderPreviewItem(id, url, url.split('/').pop() || _t('urlImage'), previewList, countEl, insertBtn, dragHint);
        }

        _renderPreviewItem(id, src, name, previewList, countEl, insertBtn, dragHint) {
            const item = document.createElement('div');
            item.className = 'mublo-editor-image-preview-item';
            item.dataset.id = id;
            item.draggable = true;
            item.innerHTML = `
                <img src="${escapeHtml(src)}" alt="${escapeHtml(name)}">
                <span class="mublo-editor-image-preview-name" title="${escapeHtml(name)}">${escapeHtml(name.length > 20 ? name.substring(0, 17) + '...' : name)}</span>
                <button type="button" class="mublo-editor-image-preview-remove" title="${_t('imageRemove')}">&times;</button>
                <span class="mublo-editor-image-preview-order">${this._pendingImages.length}</span>
            `;

            // 제거 버튼
            item.querySelector('.mublo-editor-image-preview-remove').addEventListener('click', (e) => {
                e.stopPropagation();
                this._pendingImages = this._pendingImages.filter(img => img.id !== id);
                item.remove();
                this._updatePreviewOrder(previewList);
                this._updateImageCount(countEl, insertBtn, dragHint);
            });

            previewList.appendChild(item);
            this._updateImageCount(countEl, insertBtn, dragHint);
        }

        _updateImageCount(countEl, insertBtn, dragHint) {
            const count = this._pendingImages.length;
            countEl.textContent = count;
            insertBtn.disabled = count === 0;
            dragHint.style.display = count > 1 ? 'block' : 'none';
        }

        _updatePreviewOrder(previewList) {
            const items = previewList.querySelectorAll('.mublo-editor-image-preview-item');
            items.forEach((item, index) => {
                item.querySelector('.mublo-editor-image-preview-order').textContent = index + 1;
            });
        }

        _setupPreviewDragSort(previewList) {
            let draggedItem = null;

            previewList.addEventListener('dragstart', (e) => {
                if (e.target.classList.contains('mublo-editor-image-preview-item')) {
                    draggedItem = e.target;
                    e.target.classList.add('mublo-editor-image-preview-dragging');
                    e.dataTransfer.effectAllowed = 'move';
                }
            });

            previewList.addEventListener('dragend', (e) => {
                if (e.target.classList.contains('mublo-editor-image-preview-item')) {
                    e.target.classList.remove('mublo-editor-image-preview-dragging');
                    draggedItem = null;
                }
            });

            previewList.addEventListener('dragover', (e) => {
                e.preventDefault();
                const afterElement = this._getDragAfterElement(previewList, e.clientY);
                if (draggedItem) {
                    if (afterElement == null) {
                        previewList.appendChild(draggedItem);
                    } else {
                        previewList.insertBefore(draggedItem, afterElement);
                    }
                }
            });

            previewList.addEventListener('drop', (e) => {
                e.preventDefault();
                // 순서 재정렬
                const newOrder = [];
                previewList.querySelectorAll('.mublo-editor-image-preview-item').forEach(item => {
                    const id = item.dataset.id;
                    const img = this._pendingImages.find(i => i.id === id);
                    if (img) newOrder.push(img);
                });
                this._pendingImages = newOrder;
                this._updatePreviewOrder(previewList);
            });
        }

        _getDragAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll('.mublo-editor-image-preview-item:not(.mublo-editor-image-preview-dragging)')];

            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }

        // =========================================================
        // 이미지 업로드 처리 (플러그인 지원)
        // =========================================================
        async _handleImageUpload(file) {
            _activeInstanceLocale = this._locale;
            // 파일 타입 체크
            if (!this.options.allowedImageTypes.includes(file.type)) {
                this.fire('uploadError', { error: _t('invalidImageType'), file });
                this._showToast(_t('invalidImageType'), 'error');
                return;
            }

            // 파일 크기는 검사하지 않는다. 허용 크기는 업로드 엔드포인트와 php.ini 가 정하고
            // 에디터는 그 값을 모른다. 초과 시 서버가 실제 한도를 담은 메시지로 응답한다.

            // BlobInfo 생성
            const base64 = await fileToBase64(file);
            const blobInfo = new BlobInfo(file, base64);

            // 진행률 콜백
            const progress = (percent) => {
                this._showProgress(percent);
                this.fire('uploadProgress', { percent, blobInfo });
            };

            // 업로드 시작 이벤트
            this.fire('uploadStart', { blobInfo });

            try {
                let imageUrl;

                // 1. 플러그인에서 설정한 핸들러 (최우선)
                if (this._imageUploadHandler) {
                    imageUrl = await this._imageUploadHandler(blobInfo, progress);
                }
                // 2. 옵션으로 전달된 레거시 스타일 핸들러
                else if (this.options.images_upload_handler) {
                    imageUrl = await new Promise((resolve, reject) => {
                        this.options.images_upload_handler(blobInfo, resolve, reject, progress);
                    });
                }
                // 3. 옵션으로 전달된 콜백 (하위 호환성)
                else if (this.options.onImageUpload) {
                    const result = await this.options.onImageUpload(file, this);
                    imageUrl = result?.url;
                }
                // 4. uploadUrl 설정된 경우 기본 업로드
                else if (this.options.uploadUrl) {
                    imageUrl = await this._defaultUpload(blobInfo, progress);
                }
                // 5. 폴백: Base64 인라인 (권장하지 않음)
                else {
                    console.warn('[MubloEditor] No uploadUrl configured. Using Base64 inline embedding. This may cause storage issues. Set the uploadUrl option.');
                    imageUrl = `data:${file.type};base64,${base64}`;
                    this.fire('uploadWarning', {
                        message: 'Base64 fallback used. Consider setting uploadUrl option.',
                        blobInfo
                    });
                }

                if (imageUrl) {
                    this.insertImage(imageUrl, file.name);
                    this.fire('uploadSuccess', { url: imageUrl, blobInfo });
                }

            } catch (error) {
                console.error('[MubloEditor] Image upload failed:', error);
                this.fire('uploadError', { error: error.message || error, blobInfo });
                this._showToast(_t('uploadFailed'), 'error');
            } finally {
                this._hideProgress();
            }
        }

        async _defaultUpload(blobInfo, progress) {
            const formData = new FormData();
            formData.append('file', blobInfo.blob(), blobInfo.filename());

            const xhr = new XMLHttpRequest();
            
            return new Promise((resolve, reject) => {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        progress(Math.round((e.loaded / e.total) * 100));
                    }
                });

                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            resolve(response.url || response.location || response.data?.url);
                        } catch (e) {
                            reject(new Error('Invalid server response'));
                        }
                    } else {
                        reject(new Error(`Upload failed: ${xhr.status}`));
                    }
                });

                xhr.addEventListener('error', () => reject(new Error('Upload failed')));
                xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

                xhr.open('POST', this.options.uploadUrl);

                // 프레임워크 CSRF 토큰 전송 (있으면)
                if (this.options.uploadCsrfToken) {
                    xhr.setRequestHeader('X-CSRF-Token', this.options.uploadCsrfToken);
                }

                // CSRF 토큰이 있으면 세션 쿠키를 함께 보내야 프레임워크에서 검증 가능
                if (this.options.images_upload_credentials || this.options.uploadCsrfToken) {
                    xhr.withCredentials = true;
                }

                xhr.send(formData);
            });
        }

        _showProgress(percent) {
            this.progressBar.style.display = 'block';
            this.progressBar.querySelector('.mublo-editor-progress-bar').style.width = percent + '%';
        }

        _hideProgress() {
            this.progressBar.style.display = 'none';
            this.progressBar.querySelector('.mublo-editor-progress-bar').style.width = '0%';
        }

        _insertVideo() {
            this._saveSelection();
            const body = `
                <div class="mublo-editor-modal-form-group">
                    <label class="mublo-editor-modal-label">${_t('videoUrl')}</label>
                    <input type="text" class="mublo-editor-modal-input" id="mublo-editor-video-url" placeholder="${_t('videoUrlPlaceholder')}">
                </div>
            `;

            this._createModal(_t('videoInsert'), body, _t('insert'), (modal) => {
                const url = modal.querySelector('#mublo-editor-video-url').value.trim();
                const embedUrl = this._parseVideoUrl(url);
                if (!embedUrl) {
                    this._showToast(_t('unsupportedUrl'), 'error');
                    return false;
                }
                this.insertVideo(url);
            });
        }

        _parseVideoUrl(url) {
            let parsed;
            try {
                parsed = new URL(url);
            } catch (e) {
                return null;
            }

            const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
            const path = parsed.pathname;

            if (host === 'youtu.be') {
                const id = path.split('/').filter(Boolean)[0];
                return /^[a-zA-Z0-9_-]{11}$/.test(id || '')
                    ? `https://www.youtube.com/embed/${id}`
                    : null;
            }

            if (host === 'youtube.com' || host === 'm.youtube.com') {
                let id = parsed.searchParams.get('v');

                const embedMatch = path.match(/^\/embed\/([a-zA-Z0-9_-]{11})$/);
                if (!id && embedMatch) {
                    id = embedMatch[1];
                }

                const shortsMatch = path.match(/^\/shorts\/([a-zA-Z0-9_-]{11})$/);
                if (!id && shortsMatch) {
                    id = shortsMatch[1];
                }

                return /^[a-zA-Z0-9_-]{11}$/.test(id || '')
                    ? `https://www.youtube.com/embed/${id}`
                    : null;
            }

            if (host === 'youtube-nocookie.com') {
                const match = path.match(/^\/embed\/([a-zA-Z0-9_-]{11})$/);
                return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
            }

            if (host === 'vimeo.com') {
                const id = path.split('/').filter(Boolean)[0];
                return /^\d+$/.test(id || '')
                    ? `https://player.vimeo.com/video/${id}`
                    : null;
            }

            if (host === 'player.vimeo.com') {
                const match = path.match(/^\/video\/(\d+)$/);
                return match ? `https://player.vimeo.com/video/${match[1]}` : null;
            }

            return null;
        }

