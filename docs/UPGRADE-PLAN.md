# MubloEditor 고도화 계획서

작성일: 2026-08-12 | 대상 버전: v1.4.0 ~ v1.6.0 | 현재 버전: v1.3.0

## 1. 배경과 목표

DesignOneX의 "CK에디터4 프로" 플러그인(상용, CKEditor4 기반) 기능을 벤치마킹하여
MubloEditor를 고도화한다. 기능 아이디어와 UX만 참고하며 코드·에셋은 사용하지 않는다.

목표:

1. 관리자/작성자 체감 기능 강화 (인용구, 테이블 스타일, 붙여넣기 UX)
2. 확장 기능은 **플러그인으로 분리**하여 코어 경량성(무의존성 vanilla JS) 유지
3. 10개 mublo 프로젝트에 안전하게 배포 가능한 구조 유지

## 2. 아키텍처 방침

### 2.1 코어 vs 플러그인 판단 기준

| 기준 | 코어 | 플러그인 |
|---|---|---|
| 기존 기능의 확장·개선인가 | O (인용구, 테이블, 붙여넣기) | |
| 없어도 에디터 본연 기능에 지장 없는가 | | O (레이아웃, 가져오기, 내보내기, 스티커) |
| 외부 라이브러리/에셋/서버 API 의존 | 불가 | 허용 (선택적·지연 감지 방식) |

### 2.2 Phase 0 — 플러그인 확장 API (필수 선행 작업)

현재 `MubloEditor.registerPlugin(name, fn)` 은 존재하지만, 플러그인이 할 수 있는 일이
`setImageUploadHandler` / `on·off·fire` 수준에 그친다. 툴바 버튼·다이얼로그·콘텐츠 삽입을
플러그인이 수행할 수 있도록 공개 API를 추가한다.

추가할 인스턴스 API:

```javascript
editor.registerToolbarButton(name, { icon, title, onClick })  // 툴바 버튼 등록
editor.openModal(title, bodyHtml, primaryText, onPrimary)     // _createModal 공개 래핑
editor.insertHTML(html, { sanitize: true })                   // 커서 위치 삽입 (기존 내부 로직 공개)
editor.getSelectedText() / editor.replaceSelection(html)      // 선택 영역 접근
editor.getContent() / editor.setContent(html)                 // (이미 있으면 명세만 문서화)
```

정적 API:

```javascript
MubloEditor.addToolbarItem(name, def)   // 프리셋/data-toolbar-items 에서 쓸 수 있는 항목 등록
MubloEditor.addLocale(name, tr)         // 기존 존재 — 플러그인 문자열 병합 규칙만 정의
```

규칙:

- 플러그인 파일명: `plugins/MubloEditor<기능명>.js` (예: `MubloEditorStickers.js`)
- 플러그인 CSS가 필요하면 JS 내에서 `<style id="mublo-plugin-...">` 를 1회 주입 (파일 분리 없음)
- 플러그인 등록 버튼은 `data-toolbar-items` 에 이름을 추가해야 노출 (기본 프리셋 불변)
- i18n: 플러그인도 ko/en 병행, `MubloEditor.addLocale` 병합 사용

### 2.3 콘텐츠 출력 호환성 원칙 (중요)

에디터에서 작성한 HTML은 각 프로젝트의 **게시글 뷰 페이지에서 에디터 CSS 없이** 렌더링된다.
따라서 신규 기능이 만들어내는 HTML은 다음을 따른다.

1. **인라인 스타일 우선** — 인용구·테이블 스타일·레이아웃은 inline style로 완결
2. 재편집 인식용으로 `data-*` 속성 병기 (예: `data-quote-style="gradient-line"`)
3. 뷰 페이지에 추가 CSS 배포가 필요한 방식은 금지 (배포 대상 10개 프로젝트라 비용 큼)

### 2.4 공통 품질 기준

- 외부 런타임 의존성 0 유지 (코어). 플러그인은 "페이지에 이미 로드된 경우 감지" 방식만 허용
- 다크모드: 에디터 UI는 기존 CSS 변수 체계 준수. 콘텐츠 인라인 스타일은 라이트 기준 고정
- 모바일: 신규 다이얼로그는 320px 폭에서 사용 가능해야 함
- 보안: 삽입되는 모든 HTML은 기존 sanitize 경로를 통과시킨다 (`insertHTML` 기본 sanitize)
- 접근성: 다이얼로그 ESC 닫기·포커스 트랩은 기존 `_createModal` 동작 준수

## 3. 항목별 계획

### 3.1 인용구 스타일 갤러리 — 코어 (v1.4)

현재 1종(단순 blockquote) → 갤러리 다이얼로그로 확장.

- 툴바 `blockquote` 버튼 클릭 시 갤러리 다이얼로그 (기존 즉시 삽입 동작 대체)
- 탭: 기본 / 컬러 / 아이콘 / 알림박스 / 특수 — 1차 20종, 최종 50종
- 출력: `<blockquote data-quote-style="..." style="...인라인...">` (아이콘은 유니코드/인라인 SVG)
- 선택 텍스트가 있으면 감싸기, 없으면 플레이스홀더 삽입
- 커서가 이미 인용구 안이면 스타일 교체 모드
- 규모: 중 (다이얼로그 1 + 스타일 정의 데이터 + CSS 소량)

### 3.2 테이블 스타일 + 셀 리사이즈 — 코어 (v1.4)

- 테이블 컨텍스트 메뉴에 "테이블 스타일" 항목 추가 → 다이얼로그:
  - 셀 패딩(px) / 셀 간격(px) / 테이블 너비(%) 슬라이더
  - 테두리 굵기·색상·스타일(실선/점선/이중선)
  - 셀 배경색: 프리셋 팔레트(기존 `DEFAULT_COLORS` 재사용) + HEX 입력 + 최근 사용(인스턴스 메모리)
  - 적용 범위: 간격/테두리는 테이블 전체, 배경색은 현재 셀(다중 선택 셀 지원은 2차)
- 셀 경계 드래그 리사이즈: 열 경계 hover 시 리사이즈 커서, 드래그로 `<col>`/셀 width % 조정
- 출력: 전부 인라인 스타일
- 규모: 중상 (리사이즈 인터랙션이 난이도 핵심 — 기존 이미지 리사이저 패턴 재사용)

### 3.3 스마트 붙여넣기 (링크/유튜브 카드) — 코어 + PHP 보조 (v1.5)

- paste 이벤트에서 클립보드가 단일 URL인 경우 인터셉트:
  - YouTube/Vimeo URL → 선택 팝업: **썸네일 카드 / 플레이어 임베드 / 단순 링크**
  - 일반 URL → 선택 팝업: **OG 카드 / 단순 링크**
- 썸네일 카드: YouTube는 `img.youtube.com/vi/{id}/hqdefault.jpg` 로 서버 불필요
- OG 카드: 서버 프록시 필요 → `plugins/opengraph/og-proxy.php`
  - `editor.setOgFetchHandler(url => Promise<{title, desc, image, host}>)` 로 주입
  - 핸들러 미설정 시 OG 카드 옵션 자동 숨김 (코어는 서버 없이도 동작)
  - **SSRF 방어 필수**: http(s)만 허용, DNS 해석 후 사설/루프백 IP 차단, 리다이렉트 제한,
    타임아웃 3초, 응답 상한 512KB, 결과 파일 캐시(24h)
- 출력 카드 HTML: 인라인 스타일 `<a>` 카드 (뷰 페이지 CSS 불필요, 클릭 시 새 창)
- "붙여넣기마다 팝업이 귀찮다" 방지: 팝업에 "이번 세션 동안 기억" 체크
- 규모: 중 (URL 판별 + 팝업 + 카드 템플릿 / PHP 프록시는 소)

### 3.4 이미지+텍스트 레이아웃 — 플러그인 `MubloEditorLayouts.js` (v1.6)

- 툴바 버튼 `layout` → 다이얼로그:
  - 레이아웃 프리셋 10종: 이미지 좌/우, 이미지 위/아래, 2단(이미지|텍스트, 텍스트|이미지),
    이미지+캡션 좌/우, 3단, 전체 이미지+텍스트 오버레이
  - 이미지: URL 입력 + 업로드(기존 `getImageUploadHandler()` 재사용)
  - 이미지 너비 슬라이더(%), "선택한 텍스트 가져오기" 버튼
- 출력: `<figure data-mublo-layout="...">` + flex 인라인 스타일, `max-width:100%` 반응형
- 규모: 중 (템플릿 데이터 중심)

### 3.5 문서 파일 가져오기 — 플러그인 `MubloEditorFileImport.js` (v1.6)

- 툴바 버튼 `fileimport` → 드래그&드롭 다이얼로그 + 변환 미리보기 + 삽입 방식 3택
  (기존 내용 교체 / 뒤에 추가 / 커서 위치)
- 1단계 — 클라이언트 단독 (무의존): **TXT, HTML, MD, CSV**
  - MD: 경량 자체 파서 (heading/list/bold/italic/link/code/blockquote/table 만 지원)
  - CSV: 테이블로 변환 (구분자 자동 감지, 1행 헤더 옵션)
  - HTML: 기존 sanitize 통과 후 삽입
- 2단계 — 서버 변환 (선택): **DOCX, XLSX, PDF**
  - `editor.setFileConvertHandler(file => Promise<html>)` 주입 시에만 해당 확장자 활성화
  - 서버 구현은 별도 과제 (PhpOffice/PhpWord, PhpSpreadsheet, pdftotext 등) — 본 계획에서는
    인터페이스만 정의하고 구현은 프로젝트별 결정
- 규모: 중 (1단계 기준. MD 파서가 절반)

### 3.6 PDF / Word 내보내기 — 플러그인 `MubloEditorExport.js` (v1.6)

- 툴바 버튼 `export` → 다이얼로그 (파일명, PDF는 용지 A4/Letter + 방향)
- Word(.doc): HTML을 `application/msword` Blob으로 저장 — **무의존, 항상 제공**
- PDF: 페이지에 `window.html2pdf` 가 이미 로드된 경우에만 PDF 섹션 노출 (지연 감지)
  - 플러그인이 라이브러리를 번들하지 않음 → 무의존 원칙 유지
  - 한글 폰트 이슈는 html2pdf(캔버스 렌더) 방식이라 회피됨
- 규모: 소

### 3.7 이모티콘/스티커 — 플러그인 `MubloEditorStickers.js` (v1.6)

- 툴바 버튼 `sticker` → 팩 탭 + 그리드 팝오버
- 팩 주입 구조 (에셋은 각 프로젝트가 제공, 플러그인은 뷰어):

```javascript
MubloEditor.registerPlugin('stickers', ed => ed.setStickerPacks([
    { name: '팩이름', baseUrl: '/assets/stickers/pack1/', items: [{ file: 'a.png', label: '기분 최고!' }] }
]));
```

- 삽입: `<img data-mublo-sticker src=... alt="{label}" style="max-width:120px">`
- 최근 사용: `localStorage` (키: `mublo-editor-recent-stickers`)
- 에셋 제작은 별도 과제 (우선순위 최하 — 뷰어만 먼저 완성)
- 규모: 소

## 4. 마일스톤 / 버전 로드맵

| 버전 | 내용 | 산출물 |
|---|---|---|
| v1.4.0 | Phase 0 플러그인 API + 인용구 갤러리 + 테이블 스타일/셀 리사이즈 | 코어 |
| v1.5.0 | 스마트 붙여넣기 (링크/유튜브/OG 카드) | 코어 + `plugins/opengraph/og-proxy.php` |
| v1.6.0 | 공식 플러그인 4종 (Layouts, FileImport, Export, Stickers) | `plugins/*.js` |

각 버전 공통 체크리스트:

- [ ] `package.json` version 갱신, README 기능 문서 갱신, `MubloEditor.d.ts` 타입 갱신
- [ ] `index.html` 에 신규 기능 데모 추가 (수동 테스트 경로)
- [ ] ko/en 로케일 양쪽 추가
- [ ] 다크모드 + 320px 모바일 확인
- [ ] XSS: 신규 삽입 HTML 이 sanitize 경로를 통과하는지 확인

## 5. 배포 전략

- 개발·검증은 본 저장소(`index.html`)에서, 배포는 `tools/sync.mjs` 사용
- 1차 배포: v1.3.0 계열 7개 프로젝트 (public, dev, biseo, mshop, paper, rental, homepage-saas)
- 2차 배포: v1.2.0 계열 3개 (biz, mshop-crm, rental-saas) — 구버전과의 차이 검증 후 진행
- `config.php` 는 계속 배포 제외 (프로젝트별 설정)
- 플러그인은 각 프로젝트가 필요한 것만 `<script>` 로 선택 로드 — sync 는 파일만 복사하며
  로드 여부는 각 프로젝트 템플릿에서 결정

## 6. 리스크

| 리스크 | 대응 |
|---|---|
| OG 프록시 SSRF | 3.3 방어 목록 필수 구현, 보안 리뷰 후 배포 |
| 인라인 스타일 비대화 (인용구 50종) | 스타일 정의를 데이터 객체로 관리, 삽입 시 조립 |
| 셀 리사이즈와 기존 테이블 HTML 호환 | 기존 문서(colgroup 없는 테이블)에 lazy 하게 colgroup 생성 |
| 구버전(1.2.0) 프로젝트 배포 충돌 | 2차 배포로 분리, 배포 전 diff 검토 |
| 붙여넣기 인터셉트가 기존 습관 방해 | "단순 링크" 기본 포커스 + 세션 기억 옵션 |
