/**
 * ============================================================
 * MubloEditor.js
 * (c) 2025 Mublo
 * Author: Mublo
 * Licensed under the MIT License
 * https://opensource.org/licenses/MIT
 * ============================================================
 *
 * MubloEditor는 Mublo Framework 전용 경량 WYSIWYG 에디터이다.
 * 외부 의존성 없이 순수 JavaScript로 구현된 경량 WYSIWYG 에디터이다.
 *
 * ------------------------------------------------------------
 * 핵심 설계 철학
 * ------------------------------------------------------------
 *
 * 1. 선언적 사용 (Declarative)
 *    - data-* 속성으로 에디터 옵션 지정
 *    - JS 코드 없이 HTML만으로 에디터 생성 가능
 *
 * 2. MubloRequest 통합
 *    - syncAllEditors() 자동 지원
 *    - 폼 제출 시 자동 동기화
 *
 * 3. 확장 가능한 플러그인 시스템
 *    - 커스텀 툴바 버튼 추가 가능
 *    - 이미지 업로드 핸들러 교체 가능
 *    - 이벤트 훅 제공
 *
 * 4. 다크 모드 & Bootstrap 5 호환
 *    - CSS 변수 기반 테마
 *    - Bootstrap 클래스 활용
 *
 * ------------------------------------------------------------
 * 플러그인 시스템
 * ------------------------------------------------------------
 *
 * [이미지 업로드 플러그인 예시]
 *
 * MubloEditor.registerPlugin('myImageUploader', (editor) => {
 *     editor.setImageUploadHandler(async (blobInfo, progress) => {
 *         // blobInfo.blob()     - File/Blob 객체
 *         // blobInfo.filename() - 파일명
 *         // blobInfo.base64()   - Base64 문자열
 *         // progress(percent)   - 진행률 콜백 (0-100)
 *
 *         const formData = new FormData();
 *         formData.append('file', blobInfo.blob(), blobInfo.filename());
 *
 *         const res = await fetch('/api/upload', {
 *             method: 'POST',
 *             body: formData
 *         });
 *
 *         if (!res.ok) throw new Error('Upload failed');
 *
 *         const data = await res.json();
 *         return data.url;  // 이미지 URL 반환
 *     });
 * });
 *
 * ------------------------------------------------------------
 * API
 * ------------------------------------------------------------
 *
 * MubloEditor.create(selector, options)  - 에디터 생성
 * MubloEditor.get(id)                    - ID로 에디터 인스턴스 가져오기
 * MubloEditor.getAll()                   - 모든 에디터 인스턴스
 * MubloEditor.destroy(id)                - 에디터 제거
 * MubloEditor.registerPlugin(name, fn)   - 플러그인 등록
 * MubloEditor.addToolbarItem(name, def)  - 전역 커스텀 툴바 항목 등록 (v1.4)
 *
 * [인스턴스 메서드]
 * editor.getHTML()                      - HTML 콘텐츠 반환
 * editor.setHTML(html)                  - HTML 콘텐츠 설정
 * editor.getText()                      - 텍스트만 반환
 * editor.isEmpty()                      - 비어있는지 확인
 * editor.focus()                        - 에디터에 포커스
 * editor.blur()                         - 포커스 해제
 * editor.destroy()                      - 에디터 제거
 * editor.sync()                         - textarea와 동기화
 * editor.insertContent(html)            - HTML 삽입 (sanitize 적용)
 * editor.insertTrustedContent(html)     - 신뢰된 HTML 삽입
 * editor.insertImage(url, alt)          - 이미지 삽입
 * editor.setImageUploadHandler(fn)      - 이미지 업로드 핸들러 설정
 * editor.on(event, callback)            - 이벤트 리스너 등록
 * editor.off(event, callback)           - 이벤트 리스너 제거
 * editor.fire(event, data)              - 이벤트 발생
 *
 * [플러그인 확장 API (v1.4)]
 * editor.registerToolbarButton(name, {icon, title, onClick})
 *                                       - 인스턴스 커스텀 툴바 버튼 등록
 * editor.openModal(title, body, btnText, onPrimary)
 *                                       - 에디터 표준 모달 열기
 * editor.insertHTML(html, {sanitize})   - 커서 위치 HTML 삽입
 * editor.getSelectedText()              - 선택 영역 텍스트
 * editor.replaceSelection(html)         - 선택 영역 교체
 * editor.saveSelection() / restoreSelection()
 *                                       - 모달 전후 선택 영역 저장/복원
 *
 * ============================================================
 */

const MubloEditor = (() => {
    'use strict';

    const VERSION = '1.7.1';
    const EDITOR_CLASS = 'mublo-editor';
    const EDITOR_WRAPPER_CLASS = 'mublo-editor-wrapper';
    const EDITOR_TOOLBAR_CLASS = 'mublo-editor-toolbar';
    const EDITOR_CONTENT_CLASS = 'mublo-editor-content';
    // 캐럿 위치에 서식을 예약할 때 넣는 자리 문자. 이 문자만 든 span 은 껍데기로 본다.
    const ZERO_WIDTH = '​';

