    // =========================================================
    // 코드 구문 강조 (정규식 기반 · 외부 라이브러리/CDN 의존 없음)
    // ---------------------------------------------------------
    // 언어별 문법을 정규식 규칙 배열로 정의하고, 하나의 결합 정규식으로
    // 토큰을 스캔하여 <span class="mublo-tok-*"> 로 감싼다.
    // 규칙 패턴 내부에는 반드시 비캡처 그룹 (?:...) / 룩어헤드만 사용한다
    // (결합 정규식에서 각 규칙을 캡처 그룹으로 감싸 매칭 인덱스로 종류를 판별하므로).
    // =========================================================
    const CODE_KEYWORDS = {
        javascript: 'abstract arguments async await boolean break byte case catch char class const continue debugger default delete do double else enum eval export extends false final finally float for function goto if implements import in instanceof int interface let long native new null of package private protected public return short static super switch synchronized this throw throws transient true try typeof undefined var void volatile while with yield',
        php: 'abstract and array as break callable case catch class clone const continue declare default do echo else elseif empty enddeclare endfor endforeach endif endswitch endwhile enum extends final finally fn for foreach function global goto if implements include include_once instanceof insteadof interface isset list match namespace new or print private protected public readonly require require_once return static switch throw trait try unset use var while xor yield true false null',
        python: 'and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield True False None self',
        sql: 'select from where and or not insert into values update set delete create table drop alter add column primary key foreign references join inner left right outer full on as distinct group by order having limit offset union all index view null is in like between exists count sum avg min max case when then else end asc desc default constraint unique begin commit rollback transaction int integer varchar char text date datetime timestamp boolean decimal float',
        bash: 'if then else elif fi for while until do done case esac function in select return break continue exit echo export local readonly declare unset source alias cd pwd test eval exec trap set shift'
    };

    function _kwRe(lang) {
        const words = (CODE_KEYWORDS[lang] || '').trim().split(/\s+/).filter(Boolean);
        return new RegExp('\\b(?:' + words.join('|') + ')\\b');
    }

    const _grammarCache = {};

    function _getGrammar(lang) {
        if (lang in _grammarCache) return _grammarCache[lang];
        let rules = null;
        let flags = 'g';

        switch (lang) {
            case 'javascript':
                rules = [
                    { type: 'comment', re: /\/\/[^\n]*|\/\*[\s\S]*?\*\// },
                    { type: 'string', re: /`(?:\\[\s\S]|[^`\\])*`|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/ },
                    { type: 'number', re: /\b(?:0[xX][0-9a-fA-F]+|0[bB][01]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/ },
                    { type: 'keyword', re: _kwRe('javascript') },
                    { type: 'operator', re: /[+\-*/%=<>!&|^~?]+/ }
                ];
                break;
            case 'php':
                rules = [
                    { type: 'comment', re: /\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\// },
                    { type: 'string', re: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/ },
                    { type: 'variable', re: /\$[a-zA-Z_]\w*/ },
                    { type: 'keyword', re: /<\?php|<\?=|\?>/ },
                    { type: 'number', re: /\b(?:0[xX][0-9a-fA-F]+|\d+(?:\.\d+)?)\b/ },
                    { type: 'keyword', re: _kwRe('php') },
                    { type: 'operator', re: /[+\-*/%=<>!&|^~?:]+/ }
                ];
                break;
            case 'python':
                rules = [
                    { type: 'comment', re: /#[^\n]*/ },
                    { type: 'string', re: /"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/ },
                    { type: 'number', re: /\b(?:0[xX][0-9a-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/ },
                    { type: 'keyword', re: _kwRe('python') },
                    { type: 'operator', re: /[+\-*/%=<>!&|^~]+/ }
                ];
                break;
            case 'sql':
                rules = [
                    { type: 'comment', re: /--[^\n]*|\/\*[\s\S]*?\*\// },
                    { type: 'string', re: /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/ },
                    { type: 'number', re: /\b\d+(?:\.\d+)?\b/ },
                    { type: 'keyword', re: _kwRe('sql') },
                    { type: 'operator', re: /[+\-*/%=<>!]+|[,;()]/ }
                ];
                flags = 'gi';
                break;
            case 'json':
                rules = [
                    { type: 'string', re: /"(?:\\.|[^"\\])*"/ },
                    { type: 'keyword', re: /\b(?:true|false|null)\b/ },
                    { type: 'number', re: /-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/ },
                    { type: 'operator', re: /[:{}\[\],]/ }
                ];
                break;
            case 'css':
                rules = [
                    { type: 'comment', re: /\/\*[\s\S]*?\*\// },
                    { type: 'string', re: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/ },
                    { type: 'keyword', re: /@[a-zA-Z-]+/ },
                    { type: 'number', re: /#[0-9a-fA-F]{3,8}\b|\b\d+(?:\.\d+)?(?:px|em|rem|ex|ch|vw|vh|vmin|vmax|%|s|ms|deg|fr|pt|pc|cm|mm|in)?\b/ },
                    { type: 'property', re: /[a-zA-Z-]+(?=\s*:)/ },
                    { type: 'operator', re: /[:;{}>~+*,]/ }
                ];
                break;
            case 'html':
                rules = [
                    { type: 'comment', re: /<!--[\s\S]*?-->/ },
                    { type: 'string', re: /"[^"]*"|'[^']*'/ },
                    { type: 'tag', re: /<\/?[a-zA-Z][a-zA-Z0-9-]*|\/?>/ },
                    { type: 'property', re: /[a-zA-Z-]+(?==)/ },
                    { type: 'keyword', re: /&[a-zA-Z#0-9]+;/ }
                ];
                flags = 'gi';
                break;
            case 'bash':
                rules = [
                    { type: 'comment', re: /#[^\n]*/ },
                    { type: 'string', re: /"(?:\\.|[^"\\])*"|'[^']*'/ },
                    { type: 'variable', re: /\$\{[^}]*\}|\$[a-zA-Z_]\w*|\$[0-9@*#?]/ },
                    { type: 'keyword', re: _kwRe('bash') },
                    { type: 'number', re: /\b\d+\b/ },
                    { type: 'operator', re: /[|&;<>()=]+/ }
                ];
                break;
        }

        const grammar = rules ? { rules, flags, combined: null } : null;
        _grammarCache[lang] = grammar;
        return grammar;
    }

    function _buildCombined(grammar) {
        const src = grammar.rules.map(r => '(' + r.re.source + ')').join('|');
        return new RegExp(src, grammar.flags);
    }

    function _escapeCode(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    /**
     * 코드 텍스트를 구문 강조된 HTML로 변환한다.
     * 반환 HTML의 텍스트(태그 제외)는 입력 text와 문자 단위로 동일하다
     * (커서 오프셋 보존을 위해 문자 수가 절대 바뀌지 않도록 span만 삽입).
     */
    function highlightCodeToHtml(text, lang) {
        const grammar = _getGrammar(lang);
        if (!grammar) return _escapeCode(text);

        const combined = grammar.combined || (grammar.combined = _buildCombined(grammar));
        combined.lastIndex = 0;

        let out = '';
        let last = 0;
        let m;
        while ((m = combined.exec(text)) !== null) {
            if (m[0] === '') { combined.lastIndex++; continue; }
            if (m.index > last) out += _escapeCode(text.slice(last, m.index));

            let type = null;
            for (let i = 1; i < m.length; i++) {
                if (m[i] !== undefined) { type = grammar.rules[i - 1].type; break; }
            }
            out += '<span class="mublo-tok-' + type + '">' + _escapeCode(m[0]) + '</span>';
            last = m.index + m[0].length;
        }
        if (last < text.length) out += _escapeCode(text.slice(last));
        return out;
    }

    /** rgb(a) 문자열을 #hex 로 변환. 파싱 불가하면 '' */
    function rgbToHex(rgb) {
        if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return '';
        if (rgb.startsWith('#')) return rgb;
        const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(rgb);
        if (!m) return '';
        return '#' + [m[1], m[2], m[3]].map(n => (+n).toString(16).padStart(2, '0')).join('');
    }

    function sanitizeHtml(html) {
        if (!html) return '';

        // DOMParser를 이용한 자체 XSS 방어 로직
        // 외부 라이브러리 의존성 없이 브라우저 내장 파서를 사용하여 스크립트 실행을 방지합니다.
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // 1. 블랙리스트 태그 제거
            const forbiddenTags = ['script', 'meta', 'applet', 'object', 'embed', 'base', 'form', 'link'];
            
            forbiddenTags.forEach(tag => {
                const elements = doc.querySelectorAll(tag);
                elements.forEach(el => el.remove());
            });

            // 2. 모든 요소의 속성 전수 검사
            const allElements = doc.body.querySelectorAll('*');
            allElements.forEach(el => {
                const attributes = Array.from(el.attributes);
                
                attributes.forEach(attr => {
                    const name = attr.name.toLowerCase();
                    // 제어 문자 및 공백 제거 후 검사 (우회 공격 방지)
                    const value = attr.value.toLowerCase().replace(/[\s\x00-\x1f]+/g, '');

                    // 2-1. 이벤트 핸들러 제거 (onmouseover, onclick 등)
                    if (name.startsWith('on')) {
                        el.removeAttribute(attr.name);
                    }

                    // 2-2. 위험한 프로토콜 제거 (javascript:, vbscript:)
                    if (value.includes('javascript:') || value.includes('vbscript:')) {
                        el.removeAttribute(attr.name);
                    }
                    
                    // 2-3. data: 프로토콜은 이미지 외에는 차단
                    if (value.startsWith('data:') && !value.startsWith('data:image/')) {
                        el.removeAttribute(attr.name);
                    }

                    // 2-4. style 속성 내 위험 패턴 차단
                    if (name === 'style') {
                        const cleaned = attr.value
                            .replace(/expression\s*\(/gi, '')
                            .replace(/url\s*\(\s*['"]?\s*javascript:/gi, '')
                            .replace(/-moz-binding/gi, '')
                            .replace(/behavior\s*:/gi, '');
                        if (cleaned !== attr.value) {
                            el.setAttribute('style', cleaned);
                        }
                    }
                });
            });

            return doc.body.innerHTML;
        } catch (e) {
            console.error('[MubloEditor] Sanitization failed:', e);
            // 파싱 실패 시 텍스트만 반환하여 안전 확보
            const temp = document.createElement('div');
            temp.textContent = html;
            return temp.innerHTML;
        }
    }

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

