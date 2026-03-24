# Changelog

## [1.3.0] - 2026-03-24

### Added
- **i18n system**: Built-in Korean and English locales with `setLocale()`, `addLocale()`, and `getLocale()` API
- **Per-instance locale**: Each editor can have its own locale via `locale` option or `data-locale` attribute
- **Autosave restore banner**: Replaced browser `confirm()` with an in-editor banner UI
- **`autosaveRestoreAvailable` event**: Allows plugins to customize restore behavior
- **`maxLengthExceeded` event**: Fired when content exceeds `maxLength`
- **`maxLength` enforcement**: Actual input truncation on `input`/`compositionend` (IME-safe)
- **Toast notifications**: CSS class-based toast system (`.mublo-editor-toast-{type}`)
- **`srcset` / `data-src` support**: PHP `processHtml()` now handles lazy-load and responsive image patterns

### Changed
- **CSS class naming**: Unified all `Mublo-*` classes to `mublo-editor-*` (breaking for custom CSS targeting old classes)
- **PHP upload response**: Standardized to `{ success, url, error, message }` format
- **PHP error messages**: All English by default
- **CORS**: Configurable via `cors_origin` in config (default: `*`)
- **Move action**: Disabled by default (`allow_move_action: false`)

### Removed
- All `alert()` and `confirm()` calls replaced with toast/banner UI
- TinyMCE references removed from comments and type definitions

### Security
- `sanitizeHtml`: Added `expression()`, `-moz-binding`, `behavior:` blocking in style attributes
- PHP: Enhanced directory traversal protection with explicit `..` removal

### Refactored
- `_doFind` / `_doFindWithoutHighlight` merged into `_collectMatches()`
- `TOOLBAR_ITEMS` converted to `_getToolbarItems()` function for runtime locale resolution

## [1.2.0] - 2026-02-18

### Added
- Image double-click replace with modal
- Image hover tooltip
- Markdown shortcuts (headings, lists, blockquote)
- Find & replace
- Autosave to localStorage
- Word count / character count status bar
- Image resize handles
- Drag & drop image reordering in upload modal

## [1.1.0] - 2026-01-15

### Added
- Plugin system (`registerPlugin`)
- Custom image upload handler (`setImageUploadHandler`)
- BlobInfo class for upload handlers
- Dark mode support (CSS variables)

## [1.0.0] - 2025-12-01

### Added
- Initial release
- WYSIWYG editing with contentEditable
- Toolbar presets (minimal, basic, full)
- Image upload with drag & drop
- Video embed (YouTube, Vimeo)
- Table insertion with grid picker
- Source mode (HTML editing)
- Fullscreen mode
- Print support
