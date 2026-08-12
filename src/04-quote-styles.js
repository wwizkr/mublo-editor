    // =========================================================
    // 인용구 스타일 갤러리 데이터
    // - style: blockquote 인라인 스타일 (뷰 페이지에서 CSS 없이 렌더링되도록 완결)
    // - icon: 내용 앞에 붙는 이모지/문자 (없으면 생략)
    // - label: 갤러리 카드 라벨 (ko/en)
    // =========================================================
    const QUOTE_STYLES = {
        basic: [
            { id: 'classic-line', label: { ko: '클래식 라인', en: 'Classic line' },
              style: 'margin:1em 0;padding:.6em 1em;border-left:4px solid #adb5bd;color:#495057;' },
            { id: 'simple-bg', label: { ko: '심플 배경', en: 'Simple background' },
              style: 'margin:1em 0;padding:.8em 1em;background:#f1f3f5;border-radius:4px;color:#495057;' },
            { id: 'double-line', label: { ko: '더블 라인', en: 'Double line' },
              style: 'margin:1em 0;padding:.6em 1em;border-left:4px double #495057;border-right:4px double #495057;color:#495057;' },
            { id: 'top-bottom', label: { ko: '상하 라인', en: 'Top & bottom' },
              style: 'margin:1em 0;padding:.8em .5em;border-top:2px solid #343a40;border-bottom:2px solid #343a40;color:#343a40;' },
            { id: 'thick-left', label: { ko: '왼쪽 굵은 라인', en: 'Thick left' },
              style: 'margin:1em 0;padding:.6em 1em;border-left:8px solid #343a40;background:#f8f9fa;color:#343a40;' },
            { id: 'italic-accent', label: { ko: '이탤릭 강조', en: 'Italic accent' },
              style: 'margin:1em 0;padding:.6em 1em;border-left:3px solid #7048e8;color:#7048e8;font-style:italic;' },
            { id: 'dashed-left', label: { ko: '점선 왼쪽', en: 'Dashed left' },
              style: 'margin:1em 0;padding:.6em 1em;border-left:3px dashed #868e96;color:#495057;' },
            { id: 'gradient-line', label: { ko: '그라데이션 라인', en: 'Gradient line' },
              style: 'margin:1em 0;padding:.8em 1em;border-left:4px solid #7048e8;background:linear-gradient(90deg,#f3f0ff,#ffffff);color:#5f3dc4;' },
            { id: 'round-box', label: { ko: '둥근 박스', en: 'Rounded box' },
              style: 'margin:1em 0;padding:.8em 1.2em;border:1px solid #dee2e6;border-radius:12px;color:#495057;' },
            { id: 'dashed-box', label: { ko: '점선 박스', en: 'Dashed box' },
              style: 'margin:1em 0;padding:.8em 1.2em;border:2px dashed #adb5bd;border-radius:8px;color:#495057;' }
        ],
        color: [
            { id: 'blue', label: { ko: '블루', en: 'Blue' },
              style: 'margin:1em 0;padding:.8em 1em;border-left:4px solid #339af0;background:#e7f5ff;color:#1971c2;border-radius:0 4px 4px 0;' },
            { id: 'green', label: { ko: '그린', en: 'Green' },
              style: 'margin:1em 0;padding:.8em 1em;border-left:4px solid #51cf66;background:#ebfbee;color:#2b8a3e;border-radius:0 4px 4px 0;' },
            { id: 'red', label: { ko: '레드', en: 'Red' },
              style: 'margin:1em 0;padding:.8em 1em;border-left:4px solid #ff6b6b;background:#fff5f5;color:#c92a2a;border-radius:0 4px 4px 0;' },
            { id: 'orange', label: { ko: '오렌지', en: 'Orange' },
              style: 'margin:1em 0;padding:.8em 1em;border-left:4px solid #ff922b;background:#fff4e6;color:#d9480f;border-radius:0 4px 4px 0;' },
            { id: 'purple', label: { ko: '퍼플', en: 'Purple' },
              style: 'margin:1em 0;padding:.8em 1em;border-left:4px solid #9775fa;background:#f3f0ff;color:#6741d9;border-radius:0 4px 4px 0;' },
            { id: 'teal', label: { ko: '틸', en: 'Teal' },
              style: 'margin:1em 0;padding:.8em 1em;border-left:4px solid #20c997;background:#e6fcf5;color:#087f5b;border-radius:0 4px 4px 0;' },
            { id: 'pink', label: { ko: '핑크', en: 'Pink' },
              style: 'margin:1em 0;padding:.8em 1em;border-left:4px solid #f06595;background:#fff0f6;color:#c2255c;border-radius:0 4px 4px 0;' },
            { id: 'dark', label: { ko: '다크', en: 'Dark' },
              style: 'margin:1em 0;padding:.8em 1em;background:#343a40;color:#f1f3f5;border-radius:6px;' }
        ],
        icon: [
            { id: 'idea', icon: '💡', label: { ko: '아이디어', en: 'Idea' },
              style: 'margin:1em 0;padding:.8em 1em;background:#fff9db;border-radius:6px;color:#5c5028;' },
            { id: 'pin', icon: '📌', label: { ko: '핀 고정', en: 'Pinned' },
              style: 'margin:1em 0;padding:.8em 1em;border:1px solid #ffc9c9;background:#fff5f5;border-radius:6px;color:#495057;' },
            { id: 'star', icon: '⭐', label: { ko: '별점 강조', en: 'Star' },
              style: 'margin:1em 0;padding:.8em 1em;border:1px solid #ffe066;background:#fff9db;border-radius:6px;color:#495057;' },
            { id: 'memo', icon: '📝', label: { ko: '메모', en: 'Memo' },
              style: 'margin:1em 0;padding:.8em 1em;border-left:4px solid #74c0fc;background:#f8f9fa;color:#495057;' },
            { id: 'quote-mark', icon: '❝', label: { ko: '인용 부호', en: 'Quote mark' },
              style: 'margin:1em 0;padding:.8em 1em;background:#f8f9fa;border-radius:6px;color:#495057;font-style:italic;' }
        ],
        alert: [
            { id: 'info', icon: 'ℹ️', label: { ko: '정보', en: 'Info' },
              style: 'margin:1em 0;padding:.8em 1em;border:1px solid #a5d8ff;background:#e7f5ff;border-radius:6px;color:#1864ab;' },
            { id: 'success', icon: '✅', label: { ko: '성공', en: 'Success' },
              style: 'margin:1em 0;padding:.8em 1em;border:1px solid #b2f2bb;background:#ebfbee;border-radius:6px;color:#2b8a3e;' },
            { id: 'warning', icon: '⚠️', label: { ko: '주의', en: 'Warning' },
              style: 'margin:1em 0;padding:.8em 1em;border:1px solid #ffec99;background:#fff9db;border-radius:6px;color:#e67700;' },
            { id: 'danger', icon: '🚫', label: { ko: '위험', en: 'Danger' },
              style: 'margin:1em 0;padding:.8em 1em;border:1px solid #ffc9c9;background:#fff5f5;border-radius:6px;color:#c92a2a;' },
            { id: 'note', icon: '🗒️', label: { ko: '노트', en: 'Note' },
              style: 'margin:1em 0;padding:.8em 1em;border:1px solid #d0bfff;background:#f3f0ff;border-radius:6px;color:#5f3dc4;' },
            { id: 'tip', icon: '💬', label: { ko: '팁', en: 'Tip' },
              style: 'margin:1em 0;padding:.8em 1em;border:1px solid #96f2d7;background:#e6fcf5;border-radius:6px;color:#087f5b;' }
        ],
        special: [
            { id: 'big-quote', label: { ko: '큰 따옴표', en: 'Big quotes' },
              style: 'margin:1.2em 0;padding:1em 1.2em .8em;background:#f8f9fa;border-radius:8px;color:#495057;position:relative;font-size:1.05em;',
              icon: '❝', iconStyle: 'font-size:1.6em;color:#adb5bd;line-height:1;vertical-align:-0.2em;' },
            { id: 'gradient-bg', label: { ko: '그라데이션 배경', en: 'Gradient background' },
              style: 'margin:1em 0;padding:1em 1.2em;background:linear-gradient(135deg,#e7f5ff,#f3f0ff);border-radius:10px;color:#3b5bdb;' },
            { id: 'shadow-card', label: { ko: '섀도 카드', en: 'Shadow card' },
              style: 'margin:1em 0;padding:1em 1.2em;background:#ffffff;border:1px solid #e9ecef;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,.08);color:#495057;' },
            { id: 'center-quote', label: { ko: '가운데 정렬', en: 'Centered' },
              style: 'margin:1.2em 0;padding:.8em 1em;text-align:center;border-top:1px solid #dee2e6;border-bottom:1px solid #dee2e6;color:#495057;font-style:italic;' },
            { id: 'dark-terminal', label: { ko: '터미널', en: 'Terminal' },
              style: 'margin:1em 0;padding:.8em 1em;background:#212529;color:#69db7c;border-radius:6px;font-family:monospace;' }
        ]
    };

