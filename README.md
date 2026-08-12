# MubloEditor

외부 의존성 없이 동작하는 Mublo 전용 WYSIWYG 에디터다.

## 데모 실행 (로컬 개발)

이미지 업로드는 PHP(`plugins/upload/upload.php`)가 실행되어야 하므로
정적 서버나 `file://`로 열면 업로드가 404로 실패한다. PHP 내장 서버를 사용한다.

```bash
php -S 127.0.0.1:8641
# → http://127.0.0.1:8641/demo.html
```

업로드 핸들러는 보안상(무인증) 기본 차단이다. 로컬 데모에서만
`config.local.php`(git 추적 제외)를 만들어 허용한다.

```php
<?php
return [
    'storage_path' => __DIR__ . '/storage',
    'storage_url'  => '/storage',
    'allow_standalone_handler' => true, // 로컬 개발 전용
];
```

운영 환경에서는 standalone 핸들러 대신 프레임워크 라우트
`POST /api/v1/editor/upload`를 사용한다.

## 기본 사용법

CSS와 JavaScript를 로드한 뒤 `mublo-editor` 클래스를 붙이면 자동으로 초기화된다.

```html
<link rel="stylesheet" href="MubloEditor.css">

<textarea class="mublo-editor"
          id="content"
          data-toolbar="basic"
          data-height="300"
          data-placeholder="내용을 입력하세요"></textarea>

<script src="MubloEditor.js"></script>
```

JavaScript로 직접 생성할 때는 같은 옵션을 camelCase로 넘긴다.

```javascript
MubloEditor.create('#content', {
    toolbar: 'basic',
    height: 300
});
```

## 툴바

`data-toolbar`는 아래 프리셋을 받는다. 항목을 직접 선택하려면
`data-toolbar-items`에 쉼표로 구분해 지정한다.

| 프리셋 | 버튼 | 용도 |
|---|---|---|
| `minimal` | 3 | 한 줄 입력칸 |
| `compact` | 7 | 좁은 화면·좁은 칸(댓글 폼·사이드바). 320px 폭에서 한 줄 |
| `basic` | 20 | 일반 작성 |
| `full` | 35 | 전체 (기본값) |

```html
<textarea class="mublo-editor"
          data-toolbar-items="undo,redo,separator,bold,italic,link,image"></textarea>
```

`separator`는 버튼이 아니라 항목 그룹 사이의 구분선이다.

## 반응형 툴바

모바일 툴바는 데스크톱 설정과 독립적으로 지정할 수 있다. 프리셋을 쓰는 것이
기본이며, 버튼 이름을 알 필요가 없다.

```html
<textarea class="mublo-editor"
          data-toolbar="full"
          data-toolbar-mobile="compact"></textarea>
```

프리셋으로 표현할 수 없을 때만 `data-toolbar-items-mobile`로 항목을 직접
나열한다.

```html
<textarea class="mublo-editor"
          data-toolbar="full"
          data-toolbar-items-mobile="undo,redo,bold,italic,underline,link,image"
          data-toolbar-breakpoint="640"></textarea>
```

적용 우선순위는 다음과 같다.

1. `data-toolbar-items-mobile`
2. `data-toolbar-mobile`
3. `data-toolbar-items` 또는 `data-toolbar`

`data-toolbar-breakpoint`의 기본값은 768px이다. 화면 너비가 기준을 넘나들면
편집 본문을 유지한 채 툴바만 다시 구성한다.

JavaScript 옵션으로는 각각 `toolbarMobile`, `toolbarItemsMobile`,
`toolbarBreakpoint`를 사용한다.

## 인용구 스타일 갤러리 (v1.4)

툴바의 인용구 버튼은 스타일 갤러리를 연다. 기본·컬러·아이콘·알림박스·특수
5개 탭에서 30여 종의 스타일을 고를 수 있으며, 클릭 즉시 삽입된다.

- 선택된 텍스트가 있으면 해당 텍스트를 감싼다.
- 커서가 이미 인용구 안이면 스타일만 교체한다.
- 출력 HTML은 인라인 스타일로 완결되므로 뷰 페이지에 별도 CSS가 필요 없다.
  재편집 인식용으로 `data-quote-style` 속성이 붙는다.

## 테이블 스타일 (v1.4)

테이블 셀에서 우클릭 → "테이블 스타일"로 다이얼로그를 연다.

- 셀 패딩 / 셀 간격 / 테이블 너비 슬라이더
- 테두리 굵기·색상·스타일(실선/파선/점선/이중선/없음)
- 셀 배경색: 팔레트 + HEX 입력 + 최근 사용 색. 드래그로 여러 셀을 선택한 뒤
  적용하면 선택한 셀 전체에 배경색이 적용된다.
- 간격/테두리는 테이블 전체에, 배경색은 선택한 셀에 적용된다.

열 경계를 드래그하면 열 너비를 조절할 수 있다. 첫 리사이즈 시 `colgroup`이
생성되고 너비는 % 단위로 저장된다.

## 스마트 붙여넣기 (v1.5)

단일 URL을 붙여넣으면 삽입 방식 선택 팝업이 뜬다.

- **유튜브/Vimeo URL**: 썸네일 카드(유튜브만) / 플레이어 임베드 / 단순 링크
- **일반 URL**: OG 카드 / 단순 링크 — OG 카드는 메타 수집 핸들러가 있을 때만 표시
- "이번 세션 동안 이 선택 기억"을 체크하면 같은 종류의 URL은 팝업 없이 삽입
- 카드 HTML은 인라인 스타일로 완결 (`data-mublo-card` 속성)
- `data-smart-paste="false"`(또는 `smartPaste: false`)로 기능 자체를 끌 수 있다

OG 메타 수집은 CORS 때문에 서버 프록시가 필요하다. 두 가지 방법:

```html
<!-- 1. 동봉된 프록시 사용 (PHP, config.local.php 의 allow_standalone_handler 필요) -->
<textarea class="mublo-editor" data-og-proxy="plugins/opengraph/og-proxy.php"></textarea>
```

```javascript
// 2. 커스텀 핸들러 주입 (프레임워크 라우트 등)
editor.setOgFetchHandler(async (url) => {
    const res = await fetch('/api/v1/editor/og?url=' + encodeURIComponent(url));
    return res.json();  // {title, description, image, host}
});
```

동봉 프록시(`plugins/opengraph/og-proxy.php`)는 SSRF 방어(사설/루프백 IP 차단,
80/443 포트 제한, 리다이렉트 재검증, 3초 타임아웃, 512KB 상한)와 24시간 파일
캐시를 포함한다. 운영 환경에서는 프레임워크 라우트에서
`MubloEditorOgProxy::fetch($url)`를 호출하는 방식을 권장한다.

## 플러그인 확장 API (v1.4)

플러그인이 툴바 버튼·모달·콘텐츠 삽입을 사용할 수 있다.

```javascript
MubloEditor.registerPlugin('myPlugin', (editor) => {
    editor.registerToolbarButton('mybutton', {
        icon: '<svg ...>...</svg>',
        title: '내 기능',
        onClick: (ed) => {
            ed.saveSelection();
            const modal = ed.openModal('제목', '<p>내용</p>', '삽입', (m) => {
                ed.insertHTML('<p>플러그인이 삽입한 내용</p>');
            });
        }
    });
});
```

- 버튼 노출: `data-toolbar-items`(또는 `toolbarItems` 옵션)에 버튼 이름을 포함해야 한다.
- `MubloEditor.addToolbarItem(name, def)`은 모든 인스턴스에서 쓸 수 있는 전역 항목을 등록한다.
- `insertHTML(html, { sanitize: false })`는 신뢰된 소스에만 사용한다.
