    // =========================================================
    // 유틸리티 함수
    // =========================================================
    function generateId() {
        return 'mublo-editor-' + Math.random().toString(36).substr(2, 9);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function normalizeCodeText(html) {
        // 블록 태그와 <br>을 줄바꿈으로 변환 (innerText는 detached DOM에서 작동 안 함)
        let processed = html;
        processed = processed.replace(/<br\s*\/?>/gi, '\n');
        processed = processed.replace(/<\/(?:p|div|li|h[1-6]|pre|blockquote)>\s*<(?:p|div|li|h[1-6]|pre|blockquote)[^>]*>/gi, '\n');
        processed = processed.replace(/<\/?(?:p|div|li|h[1-6]|pre|blockquote)[^>]*>/gi, '\n');

        const temp = document.createElement('div');
        temp.innerHTML = processed;
        let text = temp.textContent || '';
        text = text.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ');
        text = text.replace(/^\n+/, '').replace(/\n+$/, '');
        text = text.replace(/\n{3,}/g, '\n\n');
        return text;
    }

    function convertCodeShortcodesToHtml(html) {
        if (!html || html.indexOf('[code]') === -1) return html;

        return html.replace(/\[code\]([\s\S]*?)\[\/code\]/gi, (_, codeContent) => {
            const codeText = normalizeCodeText(codeContent);
            return `<pre><code>${escapeHtml(codeText)}</code></pre>`;
        });
    }

    function convertCodeHtmlToShortcodes(html) {
        if (!html || html.indexOf('<code>') === -1) return html;

        return html.replace(/<pre([^>]*)>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, (full, preAttrs, codeContent) => {
            // 언어가 지정된 향상된 코드 블록은 원본 HTML을 유지해 data-language 를 보존한다
            if (/mublo-code-block|data-language/i.test(preAttrs)) return full;
            // HTML 엔티티 디코딩
            const temp = document.createElement('textarea');
            temp.innerHTML = codeContent;
            return `[code]${temp.value}[/code]`;
        });
    }

