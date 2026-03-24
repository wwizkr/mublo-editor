# MubloEditor

Lightweight WYSIWYG editor with zero dependencies. Built-in i18n, image upload, autosave, and plugin system.

**~35KB** unminified · **Zero dependencies** · **Dark mode** · **Bootstrap 5 compatible**

## Features

- **Declarative** — Add `class="mublo-editor"` to any `<textarea>` and it just works
- **Image handling** — Drag & drop, paste, resize, double-click replace, upload with progress
- **i18n** — Built-in Korean/English, extensible via `addLocale()`
- **Autosave** — localStorage-based with restore banner
- **Plugin system** — Custom upload handlers, toolbar buttons, event hooks
- **Find & replace** — With highlight navigation
- **Markdown shortcuts** — `#`, `##`, `-`, `1.`, `>` auto-conversion
- **Dark mode** — CSS variable-based theming, Bootstrap 5 compatible
- **TypeScript** — Full type definitions included

## Quick Start

### CDN / Script Tag

```html
<link rel="stylesheet" href="src/MubloEditor.css">

<textarea class="mublo-editor" data-toolbar="full" data-height="400">
  <p>Hello, world!</p>
</textarea>

<script src="src/MubloEditor.js"></script>
```

That's it. Any `<textarea>` with `class="mublo-editor"` auto-initializes on `DOMContentLoaded`.

### Programmatic

```js
const editor = MubloEditor.create('#my-editor', {
    toolbar: 'full',
    height: 400,
    locale: 'en',
    uploadUrl: '/api/upload',
    autosave: true,
    onChange: (html) => console.log(html)
});
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `toolbar` | `string` | `'full'` | Preset: `'minimal'`, `'basic'`, `'full'` |
| `toolbarItems` | `string[]` | — | Custom toolbar items (overrides preset) |
| `height` | `number` | `300` | Editor height in px |
| `minHeight` | `number` | `150` | Minimum height in px |
| `placeholder` | `string` | `''` | Placeholder text |
| `locale` | `string` | `'ko'` | Locale code (`'ko'`, `'en'`, or custom) |
| `uploadUrl` | `string` | `null` | Image upload endpoint |
| `maxFileSize` | `number` | `5242880` | Max file size in bytes (5MB) |
| `sanitize` | `boolean` | `true` | Enable HTML sanitization |
| `showWordCount` | `boolean` | `false` | Show character/word count |
| `maxLength` | `number` | `0` | Max characters (0 = unlimited, enforced on input) |
| `autosave` | `boolean` | `false` | Enable localStorage autosave |
| `autosaveInterval` | `number` | `30000` | Autosave interval in ms |
| `readonly` | `boolean` | `false` | Read-only mode |
| `colors` | `string[]` | (30 colors) | Color palette for text/background |

### Data Attributes

All options can be set via `data-*` attributes on the textarea:

```html
<textarea class="mublo-editor"
    data-toolbar="basic"
    data-height="300"
    data-upload-url="/api/upload"
    data-locale="en"
    data-autosave="true"
    data-max-length="5000"
    data-show-word-count="true"
    data-placeholder="Start writing...">
</textarea>
```

## API

### Static Methods

```js
MubloEditor.create(selector, options)  // Create editor
MubloEditor.get(id)                    // Get instance by ID
MubloEditor.getAll()                   // Get all instances
MubloEditor.destroy(id)                // Destroy instance
MubloEditor.destroyAll()               // Destroy all
MubloEditor.syncAll()                  // Sync all to textareas
MubloEditor.registerPlugin(name, fn)   // Register plugin
MubloEditor.setLocale('en')            // Set global locale
MubloEditor.addLocale('ja', {...})     // Add custom locale
MubloEditor.getLocale()                // Get current locale
```

### Instance Methods

```js
editor.getHTML()                       // Get HTML content
editor.setHTML(html)                   // Set HTML content
editor.getText()                       // Get plain text
editor.isEmpty()                       // Check if empty
editor.focus() / editor.blur()         // Focus management
editor.sync()                          // Sync to textarea
editor.insertContent(html)             // Insert HTML at cursor
editor.insertImage(url, alt)           // Insert image
editor.insertVideo(url)                // Insert YouTube/Vimeo
editor.setReadonly(bool)               // Toggle readonly
editor.getWordCount()                  // { chars, charsNoSpace, words }
editor.saveNow()                       // Trigger autosave
editor.clearAutosave()                 // Clear saved content
editor.destroy()                       // Remove editor
```

## Events

```js
editor.on('change', (e) => console.log(e.content));
```

| Event | Data | Description |
|-------|------|-------------|
| `ready` | `{ editor }` | Editor initialized |
| `change` | `{ content }` | Content changed (debounced 300ms) |
| `focus` / `blur` | — | Focus state |
| `keydown` | `{ originalEvent }` | Key press |
| `paste` | `{ originalEvent }` | Paste event |
| `drop` | `{ originalEvent }` | Drop event |
| `uploadStart` | `{ blobInfo }` | Upload started |
| `uploadProgress` | `{ percent, blobInfo }` | Upload progress |
| `uploadSuccess` | `{ url, blobInfo }` | Upload completed |
| `uploadError` | `{ error, blobInfo }` | Upload failed |
| `maxLengthExceeded` | `{ max, length }` | Character limit exceeded |
| `autosave` | `{ content, timestamp }` | Content autosaved |
| `autosaveRestoreAvailable` | `{ saved, handled }` | Saved content found (set `handled=true` to suppress banner) |
| `imageModalReady` | `{ modal }` | Image modal opened (for plugins to add tabs) |
| `fullscreenStateChanged` | `{ state }` | Fullscreen toggled |
| `sourceModeChanged` | `{ state }` | Source mode toggled |
| `destroy` | — | Editor destroyed |

## Plugins

```js
MubloEditor.registerPlugin('myUploader', (editor) => {
    editor.setImageUploadHandler(async (blobInfo, progress) => {
        const formData = new FormData();
        formData.append('file', blobInfo.blob(), blobInfo.filename());

        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        return data.url;
    });
});
```

## i18n

```js
// Set globally
MubloEditor.setLocale('en');

// Per instance
MubloEditor.create('#editor', { locale: 'en' });

// Add custom locale
MubloEditor.addLocale('ja', {
    bold: '太字 (Ctrl+B)',
    italic: '斜体 (Ctrl+I)',
    // ... all keys from LocaleStrings
});
```

Built-in locales: `ko` (Korean), `en` (English)

## PHP Upload Handler

A standalone PHP upload handler is included in `plugins/upload/`.

### Setup

1. Copy `config.local.php.example` to `config.local.php`
2. Set `storage_path` and `storage_url`
3. Point your editor to the upload endpoint:

```html
<textarea class="mublo-editor" data-upload-url="/path/to/upload.php"></textarea>
```

### Configuration

| Key | Default | Description |
|-----|---------|-------------|
| `storage_path` | (required) | Absolute path to storage directory |
| `storage_url` | (required) | Web URL to storage directory |
| `temp_folder` | `'temp'` | Temp upload folder name |
| `max_file_size` | `5242880` | Max file size (5MB) |
| `allowed_types` | jpeg, png, gif, webp | Allowed MIME types |
| `cors_origin` | `'*'` | CORS allowed origin |
| `allow_move_action` | `false` | Enable file move API |
| `temp_expire_hours` | `24` | Temp file cleanup window |

### Processing Saved Content

After form submission, move temp images to permanent storage:

```php
require_once 'plugins/upload/upload.php';

$html = $_POST['content'];
$html = MubloEditorUploader::processHtml($html, 'articles/2026/03');
// Moves temp images to articles/2026/03/ and updates URLs in HTML
// Supports src, data-src, and srcset attributes
```

## Browser Support

Chrome, Firefox, Safari, Edge (latest 2 versions)

## License

[MIT](LICENSE) — free for personal and commercial use.
