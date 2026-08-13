# mublo-editor (독립 고도화 저장소)

경량 WYSIWYG 에디터(순수 JS, 무의존성)의 독립 개발 저장소.
원본은 `mublo-public/public/assets/lib/editor/mublo-editor` 이며, 이 저장소에서
고도화 작업 후 각 프로젝트로 배포한다.

- 고도화 로드맵: `docs/UPGRADE-PLAN.md` (v1.4~v1.6 완료)
- 구버전 프로젝트 조사: `docs/LEGACY-PROJECTS.md` (biz 는 LandPlatform 커스텀 포팅 선행 필요)
- 브랜드 한글 표기는 **머블로** (무블로 아님)

## 구조 / 빌드

**코어 소스는 `src/NN-*.js` 파트들이고, `MubloEditor.js` 는 빌드 산출물이다.**
코어 수정 시 `src/` 를 편집하고 `npm run build` 로 재생성한다.
`MubloEditor.js` 를 직접 수정하지 말 것 (빌드가 덮어씀).
빌드는 파일명 순 단순 연결(concat)이라 파트 경계는 자유롭게 재조정 가능.

- `src/` — 코어 소스 파트 (01-head ~ 20-init-export)
- `MubloEditor.js` — 빌드 산출물 (~5,400줄, 배포 대상)
- `MubloEditor.css` — 스타일 (Bootstrap 톤, 다크모드 지원)
- `MubloEditor.d.ts` — 타입 정의
- `plugins/MubloEditor*.js` — 공식 플러그인 (Layouts/FileImport/Export/Stickers/ImageUpload)
- `plugins/stickers/` — 스티커 팩 (머블로봇 SVG + Twemoji CC-BY) + packs.js
- `plugins/upload/upload.php` · `plugins/opengraph/og-proxy.php` · `plugins/import/convert.php`
  — 서버 엔드포인트 3종. **standalone 직접 실행은 config.local.php 의
  `allow_standalone_handler` 필요** (로컬 개발 전용), 운영은 프레임워크 라우트 사용
- `editor.lib.php` — PHP 어댑터 / `config.php` — 기본 설정 (프로젝트별 커스터마이징 대상)
- `index.html` — 데모/수동 테스트 (php -S 로 실행해야 업로드/OG/변환 동작 — README 참조)
- `tools/` — build.mjs(빌드) · sync.mjs(배포) · make-mublobot-stickers.mjs(스티커 재생성)

## 테스트

```bash
npm test          # node --test + jsdom, 33개 (코어 회귀 + 플러그인 변환기 + v1.7)
```

코어/플러그인 수정 시 반드시 통과 확인. UI 인터랙션은 index.html 수동 확인 병행.

## 배포 (sync)

```bash
npm run build                     # src/ 수정했다면 먼저 빌드
npm run sync -- mublo-public      # 특정 프로젝트에 배포
npm run sync:all                  # 설치된 모든 프로젝트에 배포
npm run dist                      # 배포용 파일만 dist/ 에 모아서 생성 (git 제외)
node tools/sync.mjs mublo-dev --minimal --prune   # 런타임 필수만 배포 + 잔여 문서/데모 정리
node tools/sync.mjs --all --dry-run
```

- 배포 대상: `d:/project/mublo/*/public/assets/lib/editor/mublo-editor` 가 존재하는 프로젝트 (자동 탐색).
- **`config.php` 는 기본적으로 배포에서 제외** (`--with-config` 로 포함).
- 2026-08 기준 설치 프로젝트 10개: public/dev/biseo/mshop/paper/rental/homepage-saas (1.3.0),
  biz/mshop-crm/rental-saas (1.2.0 — `docs/LEGACY-PROJECTS.md` 참조. 특히 **biz 는
  이미지 저장소 탭 커스텀이 있어 그대로 sync 하면 기능이 사라진다**).

## 작업 규칙

- 버전 변경 시 `package.json` + `src/01-head.js` 의 VERSION 을 갱신하고 README 에 반영.
- 무의존성(vanilla JS) 원칙 유지 — 런타임 npm 의존성 금지 (devDependencies 는 허용).
- 콘텐츠 출력 HTML 은 인라인 스타일로 완결 + 재편집 인식용 `data-*` 속성 (뷰 페이지에 CSS 배포 금지).
- 신규 문자열은 ko/en 로케일 양쪽에 추가.
