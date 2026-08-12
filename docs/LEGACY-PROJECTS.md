# 1.2.0 계열 구버전 프로젝트 조사 리포트

조사일: 2026-08-12 | 기준: mublo-editor 저장소 v1.7.0

대상: 배포 프로젝트 10개 중 구버전(1.2.0 계열) 3개 — **mublo-biz, mublo-mshop-crm, mublo-rental-saas**

## 요약

| 프로젝트 | 코어 JS | 커스터마이징 | 업그레이드 난이도 |
|---|---|---|---|
| mublo-mshop-crm | 2,713줄 (순정 1.2.0) | 없음 | **낮음 — 그대로 sync 가능** |
| mublo-rental-saas | 2,713줄 (순정 1.2.0) | 코어엔 없음. MubloMedia 연동 문서/백업만 존재 | **낮음** |
| mublo-biz | 3,075줄 (1.2.0 + 커스텀) | **[LandPlatform] 이미지 저장소 탭** 이 코어에 직접 패치됨 | **높음 — 포팅 선행 필요** |

## 프로젝트별 상세

### mublo-mshop-crm — 순정 구버전

- MubloEditor.js 2,713줄, config.php 는 저장소 기본값과 동일.
- editor.lib.php / upload.php 차이는 버전 진화분(구버전)일 뿐 프로젝트 고유 수정 없음.
- **조치**: `npm run sync -- mublo-mshop-crm` 으로 바로 업그레이드 가능.

### mublo-rental-saas — 순정 + 문서/백업

- 코어 JS 는 mshop-crm 과 동일한 순정 1.2.0. 현재 코어에 MubloMedia 코드 없음.
- `MubloMedia-integration.md` (이미지 저장소 연동 가이드), 백업 파일 2세트
  (`MubloEditor.backup-20260218-*.js`, `*.backup-20260623-*`) 존재.
- **조치**: sync 로 업그레이드 가능. 단 sync 는 파일을 덮어쓸 뿐 지우지 않으므로
  백업 파일과 MD 문서는 그대로 남는다 (정리 여부는 프로젝트 판단).

### mublo-biz — LandPlatform 커스터마이징 (주의)

- MubloEditor.js 에 **이미지 저장소 탭** 커스터마이징이 직접 패치되어 있다
  (약 360줄 규모, `[LandPlatform]` 주석 표기):
  - 이미지 삽입/교체 모달에 [이미지 저장소]/[내 컴퓨터] 탭 2개 표시
  - `window.MubloMedia` 전역 존재 여부로 자동 감지 (없으면 기본 모달)
  - rental-saas 의 `MubloMedia-integration.md` 가 이 구조의 설명서
- config.php 는 내용상 저장소 기본값과 동일 (주석/개행 차이 수준).
  다만 sync 기본 설정상 config.php 는 어차피 배포 제외.
- **그대로 sync 하면 이미지 저장소 탭 기능이 사라진다.**

**조치 (택 1):**

1. **(권장) 코어에 MubloMedia 탭 포팅** — 설계 자체가 "전역 감지 시에만 탭 노출"이라
   코어에 넣어도 다른 9개 프로젝트에는 영향이 없다. 포팅 후 전 프로젝트 동일 코어 유지.
   v1.4 에서 이미지 모달이 재작성되었으므로 원본 코드 이식이 아니라 재구현이 필요
   (biz 의 1356~1500행 부근 + `MubloMedia-integration.md` 참고).
2. biz 만 업그레이드 보류하고 1.2.0 커스텀 버전 유지 (신기능 미적용).

## 공통 참고

- 1.2.0 → 1.7.0 은 콘텐츠 HTML 하위호환에 문제 없음 (신기능은 전부 추가형이고,
  기존 태그 구조는 유지됨). 기존 게시글 렌더링 영향 없음.
- upload.php 는 1.4 이후 standalone 직접 실행이 기본 차단으로 바뀌었다.
  세 프로젝트 모두 프레임워크 라우트(`/api/v1/editor/upload`)를 쓰고 있다면 영향 없지만,
  **standalone upload.php 를 직접 호출하는 곳이 있는지 배포 전 확인** 필요.
- 신기능 중 서버 연동(OG 카드 `og-proxy.php`, DOCX 변환 `convert.php`)은
  프레임워크 라우트 연결 전까지는 자동 비활성(옵션 숨김)이라 배포 자체는 안전하다.
