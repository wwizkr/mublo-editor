    // =========================================================
    // i18n 시스템
    // =========================================================
    const LOCALE = {
        ko: {
            // 툴바
            bold: '굵게 (Ctrl+B)', italic: '기울임 (Ctrl+I)', underline: '밑줄 (Ctrl+U)',
            strikethrough: '취소선', heading: '제목',
            heading1: '제목 1', heading2: '제목 2', heading3: '제목 3', paragraph: '본문',
            fontname: '글꼴', defaultFont: '기본 서체',
            fontsize: '글자 크기', sizeSmall: '작게', sizeNormal: '보통', sizeLarge: '크게', sizeHuge: '아주 크게',
            subscript: '아래 첨자', superscript: '위 첨자',
            forecolor: '글자 색상', backcolor: '배경 색상',
            alignleft: '왼쪽 정렬', aligncenter: '가운데 정렬', alignright: '오른쪽 정렬',
            orderedlist: '번호 목록', unorderedlist: '글머리 목록',
            indent: '들여쓰기', outdent: '내어쓰기',
            link: '링크 (Ctrl+K)', unlink: '링크 제거',
            image: '이미지', table: '테이블', hr: '수평선', video: '동영상',
            blockquote: '인용구', code: '코드 블록',
            removeformat: '서식 제거', selectall: '전체 선택 (Ctrl+A)',
            print: '인쇄', undo: '실행 취소 (Ctrl+Z)', redo: '다시 실행 (Ctrl+Y)',
            fullscreen: '전체화면', source: 'HTML 소스', findreplace: '찾기/바꾸기 (Ctrl+F)',
            // 폰트 (로케일별)
            localFonts: [
                { label: '맑은 고딕', value: 'Malgun Gothic' },
                { label: '굴림', value: 'Gulim' },
                { label: '바탕', value: 'Batang' }
            ],
            // 모달
            cancel: '취소', confirm: '확인', insert: '삽입', replace: '교체',
            // 링크 모달
            linkInsert: '링크 삽입', linkUrl: 'URL', linkText: '표시할 텍스트', linkNewTab: '새 탭에서 열기',
            // 이미지 모달
            imageAdd: '이미지 추가', imageReplace: '이미지 교체',
            imageDragOrClick: '이미지를 드래그하거나 클릭하여 선택',
            imageHint: '여러 파일 선택 가능 (JPG, PNG, GIF, WebP)',
            imageUrlPlaceholder: '또는 이미지 URL 입력...',
            imageUrlAdd: '추가', imageRemove: '제거',
            imageAlt: '대체 텍스트', imageCaption: '캡션',
            imageAltPlaceholder: '이미지를 설명하는 문구',
            imageCaptionPlaceholder: '이미지 아래에 표시할 캡션',
            imageUpdate: '적용',
            imageDragHint: '드래그하여 순서를 변경할 수 있습니다',
            imageSelected: '선택된 이미지:', imageCount: '개',
            uploading: '업로드 중...',
            imageTooltip: '&#x1F4F7; 더블클릭하여 이미지를 편집하세요',
            urlImage: 'URL 이미지',
            // 동영상 모달
            videoInsert: '동영상 삽입', videoUrl: '동영상 URL (YouTube, Vimeo)',
            videoUrlPlaceholder: 'https://www.youtube.com/watch?v=...',
            // 테이블 모달
            tableInsert: '테이블 삽입',
            // 찾기/바꾸기
            findPlaceholder: '찾기...', replacePlaceholder: '바꾸기...',
            findPrev: '이전', findNext: '다음',
            replaceOne: '바꾸기', replaceAll: '모두', findClose: '닫기',
            foundCount: '{count}개 발견', noResult: '결과 없음', replacedCount: '{count}개 바꿈',
            // 글자 수 카운터
            chars: '글자', charsNoSpace: '공백 제외', words: '단어',
            // 에러/경고
            invalidImageType: '허용되지 않는 이미지 형식입니다.',
            uploadFailed: '이미지 업로드에 실패했습니다. 다시 시도해주세요.',
            unsupportedUrl: '지원하지 않는 URL입니다.',
            // autosave
            autosaveRestore: '저장된 내용이 있습니다. ({date})\n복원하시겠습니까?',
            autosaveRestoreBtn: '복원', autosaveIgnoreBtn: '무시',
            // 테이블 셀 편집 컨텍스트 메뉴
            tableRowAbove: '위에 행 추가', tableRowBelow: '아래에 행 추가',
            tableColLeft: '왼쪽에 열 추가', tableColRight: '오른쪽에 열 추가',
            tableRowDelete: '행 삭제', tableColDelete: '열 삭제',
            tableMerge: '셀 병합', tableSplit: '셀 분할', tableDelete: '테이블 삭제',
            // 코드 블록
            codeLanguage: '언어', codeBlockInsert: '코드 블록',
            // 인용구 갤러리
            quoteGallery: '인용구 스타일', quoteSample: '인용문 텍스트',
            quoteTabBasic: '기본', quoteTabColor: '컬러', quoteTabIcon: '아이콘',
            quoteTabAlert: '알림박스', quoteTabSpecial: '특수',
            quoteGalleryHint: '스타일 클릭 시 즉시 삽입 · 선택된 텍스트가 있으면 감쌉니다',
            // 테이블 스타일
            tableStyle: '테이블 스타일', tableStyleSpacing: '테이블 간격',
            tableCellPadding: '셀 패딩', tableCellSpacing: '셀 간격', tableWidth: '테이블 너비',
            tableBorderSection: '테두리 스타일', tableBorderWidth: '테두리 굵기',
            tableBorderColor: '테두리 색상', tableBorderStyle: '테두리 스타일',
            borderSolid: '실선', borderDashed: '파선', borderDotted: '점선',
            borderDouble: '이중선', borderNone: '없음',
            tableCellBg: '셀 배경색', tableBgClear: '지우기', tableRecentColors: '최근 사용',
            tableStyleHint: '간격/테두리는 테이블 전체, 배경색은 선택한 셀에 적용됩니다.',
            apply: '적용',
            // 스마트 붙여넣기 (v1.5)
            pasteVideoTitle: '동영상 링크 붙여넣기', pasteLinkTitle: '링크 붙여넣기',
            pasteThumbCard: '썸네일 카드', pasteThumbCardDesc: '이미지 카드로 삽입, 클릭 시 이동',
            pasteEmbed: '플레이어 임베드', pasteEmbedDesc: '에디터에 동영상 플레이어 직접 삽입',
            pastePlainLink: '단순 링크', pastePlainLinkDesc: 'URL 텍스트 링크로 삽입',
            pasteOgCard: 'OG 카드로 삽입', pasteOgCardDesc: '링크 미리보기 카드로 삽입',
            pasteRemember: '이번 세션 동안 이 선택 기억',
            pasteFetching: '링크 정보를 가져오는 중...',
            // v1.7
            checklist: '체크리스트',
            toc: '목차 삽입', tocTitle: '목차', tocEmpty: '목차로 만들 제목(H1~H3)이 없습니다',
            slashHint: '입력하여 검색, ↑↓ 이동, Enter 선택',
            slashParagraph: '본문', slashH1: '제목 1', slashH2: '제목 2', slashH3: '제목 3',
            slashBullet: '글머리 목록', slashNumber: '번호 목록', slashChecklist: '체크리스트',
            slashQuote: '인용구', slashCode: '코드 블록', slashTable: '테이블',
            slashImage: '이미지', slashVideo: '동영상', slashHr: '수평선', slashToc: '목차',
        },
        en: {
            bold: 'Bold (Ctrl+B)', italic: 'Italic (Ctrl+I)', underline: 'Underline (Ctrl+U)',
            strikethrough: 'Strikethrough', heading: 'Heading',
            heading1: 'Heading 1', heading2: 'Heading 2', heading3: 'Heading 3', paragraph: 'Paragraph',
            fontname: 'Font', defaultFont: 'Default',
            fontsize: 'Font Size', sizeSmall: 'Small', sizeNormal: 'Normal', sizeLarge: 'Large', sizeHuge: 'Huge',
            subscript: 'Subscript', superscript: 'Superscript',
            forecolor: 'Text Color', backcolor: 'Background Color',
            alignleft: 'Align Left', aligncenter: 'Align Center', alignright: 'Align Right',
            orderedlist: 'Ordered List', unorderedlist: 'Unordered List',
            indent: 'Indent', outdent: 'Outdent',
            link: 'Link (Ctrl+K)', unlink: 'Remove Link',
            image: 'Image', table: 'Table', hr: 'Horizontal Rule', video: 'Video',
            blockquote: 'Blockquote', code: 'Code Block',
            removeformat: 'Remove Format', selectall: 'Select All (Ctrl+A)',
            print: 'Print', undo: 'Undo (Ctrl+Z)', redo: 'Redo (Ctrl+Y)',
            fullscreen: 'Fullscreen', source: 'HTML Source', findreplace: 'Find & Replace (Ctrl+F)',
            localFonts: [
                { label: 'Georgia', value: 'Georgia' },
                { label: 'Trebuchet MS', value: 'Trebuchet MS' },
                { label: 'Palatino', value: 'Palatino Linotype' }
            ],
            cancel: 'Cancel', confirm: 'OK', insert: 'Insert', replace: 'Replace',
            linkInsert: 'Insert Link', linkUrl: 'URL', linkText: 'Display Text', linkNewTab: 'Open in new tab',
            imageAdd: 'Add Image', imageReplace: 'Replace Image',
            imageDragOrClick: 'Drag or click to select images',
            imageHint: 'Multiple files supported (JPG, PNG, GIF, WebP)',
            imageUrlPlaceholder: 'Or enter image URL...',
            imageUrlAdd: 'Add', imageRemove: 'Remove',
            imageAlt: 'Alternative text', imageCaption: 'Caption',
            imageAltPlaceholder: 'Describe the image',
            imageCaptionPlaceholder: 'Caption shown below the image',
            imageUpdate: 'Apply',
            imageDragHint: 'Drag to reorder',
            imageSelected: 'Selected:', imageCount: '',
            uploading: 'Uploading...',
            imageTooltip: '&#x1F4F7; Double-click to edit image',
            urlImage: 'URL image',
            videoInsert: 'Insert Video', videoUrl: 'Video URL (YouTube, Vimeo)',
            videoUrlPlaceholder: 'https://www.youtube.com/watch?v=...',
            tableInsert: 'Insert Table',
            findPlaceholder: 'Find...', replacePlaceholder: 'Replace...',
            findPrev: 'Previous', findNext: 'Next',
            replaceOne: 'Replace', replaceAll: 'All', findClose: 'Close',
            foundCount: '{count} found', noResult: 'No results', replacedCount: '{count} replaced',
            chars: 'Characters', charsNoSpace: 'No spaces', words: 'Words',
            invalidImageType: 'Image type not allowed.',
            uploadFailed: 'Image upload failed. Please try again.',
            unsupportedUrl: 'Unsupported URL.',
            autosaveRestore: 'Saved content found. ({date})\nRestore?',
            autosaveRestoreBtn: 'Restore', autosaveIgnoreBtn: 'Ignore',
            // Table cell editing context menu
            tableRowAbove: 'Insert row above', tableRowBelow: 'Insert row below',
            tableColLeft: 'Insert column left', tableColRight: 'Insert column right',
            tableRowDelete: 'Delete row', tableColDelete: 'Delete column',
            tableMerge: 'Merge cells', tableSplit: 'Split cell', tableDelete: 'Delete table',
            // Code block
            codeLanguage: 'Language', codeBlockInsert: 'Code block',
            // Quote gallery
            quoteGallery: 'Quote Styles', quoteSample: 'Quotation text',
            quoteTabBasic: 'Basic', quoteTabColor: 'Color', quoteTabIcon: 'Icon',
            quoteTabAlert: 'Alert Box', quoteTabSpecial: 'Special',
            quoteGalleryHint: 'Click a style to insert · wraps selected text if any',
            // Table style
            tableStyle: 'Table Style', tableStyleSpacing: 'Table Spacing',
            tableCellPadding: 'Cell padding', tableCellSpacing: 'Cell spacing', tableWidth: 'Table width',
            tableBorderSection: 'Border Style', tableBorderWidth: 'Border width',
            tableBorderColor: 'Border color', tableBorderStyle: 'Border style',
            borderSolid: 'Solid', borderDashed: 'Dashed', borderDotted: 'Dotted',
            borderDouble: 'Double', borderNone: 'None',
            tableCellBg: 'Cell Background', tableBgClear: 'Clear', tableRecentColors: 'Recent',
            tableStyleHint: 'Spacing/border apply to the whole table, background to selected cells.',
            apply: 'Apply',
            // Smart paste (v1.5)
            pasteVideoTitle: 'Paste Video Link', pasteLinkTitle: 'Paste Link',
            pasteThumbCard: 'Thumbnail card', pasteThumbCardDesc: 'Insert as image card, opens on click',
            pasteEmbed: 'Player embed', pasteEmbedDesc: 'Insert playable video player',
            pastePlainLink: 'Plain link', pastePlainLinkDesc: 'Insert as text link',
            pasteOgCard: 'OG card', pasteOgCardDesc: 'Insert as link preview card',
            pasteRemember: 'Remember for this session',
            pasteFetching: 'Fetching link info...',
            // v1.7
            checklist: 'Checklist',
            toc: 'Insert TOC', tocTitle: 'Table of Contents', tocEmpty: 'No headings (H1-H3) found',
            slashHint: 'Type to search, ↑↓ to move, Enter to select',
            slashParagraph: 'Paragraph', slashH1: 'Heading 1', slashH2: 'Heading 2', slashH3: 'Heading 3',
            slashBullet: 'Bullet list', slashNumber: 'Numbered list', slashChecklist: 'Checklist',
            slashQuote: 'Quote', slashCode: 'Code block', slashTable: 'Table',
            slashImage: 'Image', slashVideo: 'Video', slashHr: 'Horizontal rule', slashToc: 'TOC',
        }
    };

    let _globalLocale = 'ko';
    // 인스턴스별 locale — _buildToolbar 등에서 참조할 현재 활성 인스턴스 locale
    let _activeInstanceLocale = null;

    function _t(key, params = {}) {
        if (typeof key !== 'string') return key;
        const loc = _activeInstanceLocale || _globalLocale;
        const str = LOCALE[loc]?.[key] ?? LOCALE.ko[key] ?? key;
        if (typeof str !== 'string') return str;
        return str.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
    }

