# mublo-editor (독립 고도화 저장소)

경량 WYSIWYG 에디터(순수 JS, 무의존성)의 독립 개발 저장소.
원본은 `mublo-public/public/assets/lib/editor/mublo-editor` 이며, 이 저장소에서
고도화 작업 후 각 프로젝트로 배포한다.

## 구조

- `MubloEditor.js` — 에디터 본체 (단일 파일, ~4,100줄)
- `MubloEditor.css` — 스타일 (Bootstrap 톤, 다크모드 지원)
- `MubloEditor.d.ts` — 타입 정의
- `plugins/MubloEditorImageUpload.js` — 이미지 업로드 플러그인
- `plugins/upload/` — 서버측 업로드 엔드포인트 (PHP)
- `editor.lib.php` — PHP 헬퍼
- `config.php` — 기본 설정 (프로젝트별 커스터마이징 대상 — 아래 참조)
- `demo.html` — 데모/수동 테스트 페이지
- `tools/sync.mjs` — 배포 스크립트

## 배포 (sync)

```bash
npm run sync -- mublo-public      # 특정 프로젝트에 배포
npm run sync:all                  # 설치된 모든 프로젝트에 배포
node tools/sync.mjs --all --dry-run
```

- 배포 대상: `d:/project/mublo/*/public/assets/lib/editor/mublo-editor` 가 존재하는 프로젝트 (자동 탐색).
- **`config.php` 는 기본적으로 배포에서 제외**한다. 프로젝트별 설정 파일이며
  실제로 mublo-biz 는 자체 config.php 를 사용 중이다. 포함하려면 `--with-config`.
- 2026-08 기준 설치 프로젝트 10개: public/dev/biseo/mshop/paper/rental/homepage-saas (1.3.0),
  biz/mshop-crm/rental-saas (1.2.0 — 구버전, 배포 전 해당 프로젝트 담당자 확인 권장).

## 작업 규칙

- 버전 변경 시 `package.json` 의 `version` 을 갱신하고, 변경 내용을 README 에 반영.
- 무의존성(vanilla JS) 원칙 유지 — npm 런타임 의존성을 추가하지 않는다.
- 수동 테스트: `demo.html` 을 브라우저로 열어 확인.
