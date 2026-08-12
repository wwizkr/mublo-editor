    // =========================================================
    // 자동 초기화
    // =========================================================
    function autoInit() {
        document.querySelectorAll(`.${EDITOR_CLASS}`).forEach(el => {
            if (!instances.has(el.id || el)) new Editor(el);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }

    // =========================================================
    // Public API
    // =========================================================
    return {
        VERSION,
        
        create(selector, options = {}) {
            const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
            if (!el) { console.error('[MubloEditor] Element not found:', selector); return null; }
            if (el.id && instances.has(el.id)) return instances.get(el.id);
            return new Editor(el, options);
        },
        
        get(id) { return instances.get(id) || null; },
        getAll() { return Array.from(instances.values()); },
        destroy(id) { instances.get(id)?.destroy(); },
        destroyAll() { instances.forEach(e => e.destroy()); },
        
        registerPlugin(name, fn) {
            if (typeof fn !== 'function') return false;
            plugins.set(name, fn);
            // 이미 생성된 에디터에도 적용
            instances.forEach(e => { try { fn(e); } catch (err) { console.error(err); } });
            return true;
        },

        /**
         * 전역 커스텀 툴바 항목 등록 (모든 인스턴스에서 사용 가능).
         * def: { icon, title, onClick(editor) }
         * data-toolbar-items에 name을 넣으면 버튼이 노출된다.
         */
        addToolbarItem(name, def) {
            if (!name || typeof def?.onClick !== 'function') return false;
            customToolbarItems.set(name, def);
            instances.forEach(e => {
                if (e._resolveToolbarItems().includes(name)) e._renderResponsiveToolbar();
            });
            return true;
        },
        
        syncAll() { instances.forEach(e => e.sync()); },

        setLocale(locale) {
            if (LOCALE[locale]) {
                _globalLocale = locale;
            } else {
                console.warn(`[MubloEditor] Unknown locale: ${locale}`);
            }
        },

        addLocale(name, translations) {
            LOCALE[name] = { ...LOCALE.en, ...translations };
        },

        getLocale() { return _globalLocale; },

        // 상수 노출
        TOOLBAR_ITEMS: _getToolbarItems,
        TOOLBAR_PRESETS,
        DEFAULT_COLORS,
        BlobInfo
    };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = MubloEditor;
