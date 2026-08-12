    // TOOLBAR_ITEMS — title은 _t()로 런타임 해석
    const TOOLBAR_ICONS = {
        bold: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>',
        italic: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>',
        underline: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>',
        strikethrough: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.3 4.9c-2.3-.6-4.4-1-6.2-.9-2.7 0-5.3.7-5.3 3.6 0 1.5 1.8 3.3 3.6 3.9h.2m8.2 3.7c.3.4.4.8.4 1.3 0 2.9-2.7 3.6-6.2 3.6-2.3 0-4.4-.3-6.2-.9M4 11.5h16"/></svg>',
        heading: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 4v16"/><path d="M18 4v16"/><path d="M6 12h12"/></svg>',
        fontname: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><line x1="12" y1="4" x2="12" y2="20"/></svg>',
        fontsize: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>',
        subscript: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 5l11 11"/><path d="M16 5l-11 11"/><path d="M20 20h2v2h-2z"/></svg>',
        superscript: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 19l11-11"/><path d="M16 19l-11-11"/><path d="M20 4h2v2h-2z"/></svg>',
        forecolor: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h16"/><path d="M6.5 16L9.354 5h5.292L18 16" fill="currentColor" opacity="0.2"/></svg>',
        backcolor: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor" opacity="0.2"/></svg>',
        alignleft: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>',
        aligncenter: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>',
        alignright: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>',
        orderedlist: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h2v2H4z" fill="currentColor"/><path d="M4 12h2v2H4z" fill="currentColor"/><path d="M4 18h2v2H4z" fill="currentColor"/></svg>',
        unorderedlist: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="9" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="9" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="4" cy="18" r="1.5" fill="currentColor"/></svg>',
        indent: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="9" y1="18" x2="21" y2="18"/><polyline points="3 9 6 12 3 15"/></svg>',
        outdent: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="9" y1="18" x2="21" y2="18"/><polyline points="6 9 3 12 6 15"/></svg>',
        link: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
        unlink: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.84 12.25l1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M5.17 11.75L3.45 13.46a5 5 0 0 0 7.07 7.07l1.71-1.71"/><line x1="2" y1="2" x2="22" y2="22"/></svg>',
        image: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
        table: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>',
        hr: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/></svg>',
        video: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor"/></svg>',
        blockquote: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>',
        code: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
        removeformat: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><line x1="4" y1="20" x2="20" y2="4"/></svg>',
        selectall: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/></svg>',
        print: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
        undo: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
        redo: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
        fullscreen: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
        fullscreenExit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
        source: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
        findreplace: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
    };

    function _getToolbarItems() {
        const localFonts = _t('localFonts') || [];
        return {
            bold: { icon: TOOLBAR_ICONS.bold, title: _t('bold'), command: 'bold' },
            italic: { icon: TOOLBAR_ICONS.italic, title: _t('italic'), command: 'italic' },
            underline: { icon: TOOLBAR_ICONS.underline, title: _t('underline'), command: 'underline' },
            strikethrough: { icon: TOOLBAR_ICONS.strikethrough, title: _t('strikethrough'), command: 'strikeThrough' },
            separator: { type: 'separator' },
            heading: {
                icon: TOOLBAR_ICONS.heading, title: _t('heading'), type: 'dropdown',
                items: [
                    { label: _t('heading1'), command: 'formatBlock', value: 'h1' },
                    { label: _t('heading2'), command: 'formatBlock', value: 'h2' },
                    { label: _t('heading3'), command: 'formatBlock', value: 'h3' },
                    { label: _t('paragraph'), command: 'formatBlock', value: 'p' }
                ]
            },
            fontname: {
                icon: TOOLBAR_ICONS.fontname, title: _t('fontname'), type: 'dropdown',
                items: [
                    { label: _t('defaultFont'), command: 'fontName', value: 'inherit' },
                    { label: 'Arial', command: 'fontName', value: 'Arial' },
                    { label: 'Verdana', command: 'fontName', value: 'Verdana' },
                    { label: 'Times New Roman', command: 'fontName', value: 'Times New Roman' },
                    { label: 'Courier New', command: 'fontName', value: 'Courier New' },
                    ...localFonts.map(f => ({ label: f.label, command: 'fontName', value: f.value }))
                ]
            },
            fontsize: {
                icon: TOOLBAR_ICONS.fontsize, title: _t('fontsize'), type: 'dropdown',
                items: [
                    { label: '10px', command: 'fontSize', value: '10px' },
                    { label: '11px', command: 'fontSize', value: '11px' },
                    { label: '12px', command: 'fontSize', value: '12px' },
                    { label: '13px', command: 'fontSize', value: '13px' },
                    { label: '14px', command: 'fontSize', value: '14px' },
                    { label: '15px', command: 'fontSize', value: '15px' },
                    { label: '16px', command: 'fontSize', value: '16px' },
                    { label: '18px', command: 'fontSize', value: '18px' },
                    { label: '20px', command: 'fontSize', value: '20px' },
                    { label: '22px', command: 'fontSize', value: '22px' },
                    { label: '24px', command: 'fontSize', value: '24px' },
                    { label: '28px', command: 'fontSize', value: '28px' },
                    { label: '32px', command: 'fontSize', value: '32px' },
                    { label: '36px', command: 'fontSize', value: '36px' },
                    { label: '40px', command: 'fontSize', value: '40px' },
                    { label: '48px', command: 'fontSize', value: '48px' }
                ]
            },
            subscript: { icon: TOOLBAR_ICONS.subscript, title: _t('subscript'), command: 'subscript' },
            superscript: { icon: TOOLBAR_ICONS.superscript, title: _t('superscript'), command: 'superscript' },
            forecolor: { icon: TOOLBAR_ICONS.forecolor, title: _t('forecolor'), type: 'color', command: 'foreColor' },
            backcolor: { icon: TOOLBAR_ICONS.backcolor, title: _t('backcolor'), type: 'color', command: 'hiliteColor' },
            alignleft: { icon: TOOLBAR_ICONS.alignleft, title: _t('alignleft'), command: 'justifyLeft' },
            aligncenter: { icon: TOOLBAR_ICONS.aligncenter, title: _t('aligncenter'), command: 'justifyCenter' },
            alignright: { icon: TOOLBAR_ICONS.alignright, title: _t('alignright'), command: 'justifyRight' },
            orderedlist: { icon: TOOLBAR_ICONS.orderedlist, title: _t('orderedlist'), command: 'insertOrderedList' },
            unorderedlist: { icon: TOOLBAR_ICONS.unorderedlist, title: _t('unorderedlist'), command: 'insertUnorderedList' },
            indent: { icon: TOOLBAR_ICONS.indent, title: _t('indent'), command: 'indent' },
            outdent: { icon: TOOLBAR_ICONS.outdent, title: _t('outdent'), command: 'outdent' },
            link: { icon: TOOLBAR_ICONS.link, title: _t('link'), type: 'link' },
            unlink: { icon: TOOLBAR_ICONS.unlink, title: _t('unlink'), command: 'unlink' },
            image: { icon: TOOLBAR_ICONS.image, title: _t('image'), type: 'image' },
            table: { icon: TOOLBAR_ICONS.table, title: _t('table'), type: 'table' },
            hr: { icon: TOOLBAR_ICONS.hr, title: _t('hr'), command: 'insertHorizontalRule' },
            video: { icon: TOOLBAR_ICONS.video, title: _t('video'), type: 'video' },
            blockquote: { icon: TOOLBAR_ICONS.blockquote, title: _t('blockquote'), type: 'quotegallery' },
            code: { icon: TOOLBAR_ICONS.code, title: _t('code'), type: 'codeblock' },
            removeformat: { icon: TOOLBAR_ICONS.removeformat, title: _t('removeformat'), command: 'removeFormat' },
            selectall: { icon: TOOLBAR_ICONS.selectall, title: _t('selectall'), command: 'selectAll' },
            print: { icon: TOOLBAR_ICONS.print, title: _t('print'), type: 'print' },
            undo: { icon: TOOLBAR_ICONS.undo, title: _t('undo'), command: 'undo' },
            redo: { icon: TOOLBAR_ICONS.redo, title: _t('redo'), command: 'redo' },
            fullscreen: { icon: TOOLBAR_ICONS.fullscreen, iconExit: TOOLBAR_ICONS.fullscreenExit, title: _t('fullscreen'), type: 'fullscreen' },
            source: { icon: TOOLBAR_ICONS.source, title: _t('source'), type: 'source' },
            findreplace: { icon: TOOLBAR_ICONS.findreplace, title: _t('findreplace'), type: 'findreplace' },
            checklist: {
                icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 4.5 7.5 7 5"/><polyline points="3 12 4.5 13.5 7 11"/><polyline points="3 18 4.5 19.5 7 17"/><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/></svg>',
                title: _t('checklist'), type: 'checklist'
            },
            toc: {
                icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="5" x2="20" y2="5"/><line x1="8" y1="10" x2="20" y2="10"/><line x1="8" y1="15" x2="20" y2="15"/><line x1="4" y1="20" x2="20" y2="20"/></svg>',
                title: _t('toc'), type: 'toc'
            }
        };
    }

    const TOOLBAR_PRESETS = {
        minimal: ['bold', 'italic', 'separator', 'link'],
        // 좁은 화면이나 좁은 칸(댓글 폼·사이드바)용. 스킨이 버튼 이름을 몰라도 쓸 수 있게 둔다.
        // 320px 폭에서 한 줄에 들어가는 것이 이 프리셋의 조건이다. 항목을 늘리면 두 줄이 된다.
        compact: ['undo', 'redo', 'separator', 'bold', 'italic', 'underline', 'separator', 'link', 'image'],
        basic: ['heading', 'fontname', 'fontsize', 'separator', 'bold', 'italic', 'underline', 'separator', 'forecolor', 'backcolor', 'separator', 'alignleft', 'aligncenter', 'alignright', 'separator', 'orderedlist', 'unorderedlist', 'separator', 'link', 'image', 'video', 'table'],
        full: ['source', 'separator', 'undo', 'redo', 'separator', 'heading', 'fontname', 'fontsize', 'separator', 'bold', 'italic', 'underline', 'strikethrough', 'subscript', 'superscript', 'separator', 'forecolor', 'backcolor', 'separator', 'alignleft', 'aligncenter', 'alignright', 'separator', 'orderedlist', 'unorderedlist', 'indent', 'outdent', 'separator', 'link', 'unlink', 'image', 'video', 'table', 'separator', 'blockquote', 'code', 'hr', 'separator', 'removeformat', 'selectall', 'print', 'separator', 'findreplace', 'fullscreen']
    };

    const DEFAULT_COLORS = [
        '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
        '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
        '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc'
    ];

    // 코드 블록 언어 목록 (data-language 속성 저장 + 구문 강조 대상)
    const CODE_LANGUAGES = ['text', 'html', 'css', 'javascript', 'php', 'sql', 'python', 'json', 'bash'];

