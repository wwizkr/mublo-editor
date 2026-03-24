/**
 * MubloEditor v1.3.0
 * TypeScript type definitions
 *
 * (c) 2025-2026 Mublo
 * Released under the MIT License
 */

declare module 'mublo-editor' {
    export = MubloEditor;
}

declare const MubloEditor: MubloEditorStatic;

interface MubloEditorStatic {
    /** Editor version */
    readonly VERSION: string;

    /** Toolbar item definitions (function — returns locale-aware items) */
    readonly TOOLBAR_ITEMS: () => Record<string, ToolbarItem>;

    /** Toolbar presets */
    readonly TOOLBAR_PRESETS: {
        minimal: string[];
        basic: string[];
        full: string[];
    };

    /** Default color palette */
    readonly DEFAULT_COLORS: string[];

    /** BlobInfo class */
    readonly BlobInfo: typeof BlobInfo;

    /**
     * Create an editor instance
     * @param selector CSS selector or DOM element
     * @param options Editor options
     */
    create(selector: string | HTMLElement, options?: EditorOptions): Editor | null;

    /**
     * Get editor instance by ID
     * @param id Editor ID
     */
    get(id: string): Editor | null;

    /** Get all editor instances */
    getAll(): Editor[];

    /**
     * Destroy editor instance
     * @param id Editor ID
     */
    destroy(id: string): void;

    /** Destroy all editor instances */
    destroyAll(): void;

    /**
     * Register a plugin
     * @param name Plugin name
     * @param fn Plugin initializer
     */
    registerPlugin(name: string, fn: PluginFunction): boolean;

    /** Sync all editor instances to their textareas */
    syncAll(): void;

    /**
     * Set global locale
     * @param locale Locale code ('ko', 'en', or custom)
     */
    setLocale(locale: string): void;

    /**
     * Add a custom locale
     * @param name Locale code
     * @param translations Translation object (merged with 'en' as fallback)
     */
    addLocale(name: string, translations: Partial<LocaleStrings>): void;

    /** Get current global locale */
    getLocale(): string;
}

interface Editor {
    /** Editor ID */
    readonly id: string;

    /** Original textarea element */
    readonly originalElement: HTMLTextAreaElement;

    /** Editor options */
    readonly options: EditorOptions;

    /** Fullscreen mode state */
    isFullscreen: boolean;

    /** Source mode state */
    isSourceMode: boolean;

    /** Get HTML content */
    getHTML(): string;

    /**
     * Set HTML content
     * @param html HTML string
     */
    setHTML(html: string): this;

    /** Get plain text (tags stripped) */
    getText(): string;

    /** Check if editor is empty */
    isEmpty(): boolean;

    /** Focus the editor */
    focus(): this;

    /** Blur the editor */
    blur(): this;

    /** Sync editor content to textarea */
    sync(): this;

    /**
     * Insert HTML content at cursor
     * @param html HTML to insert
     */
    insertContent(html: string): this;

    /**
     * Insert an image
     * @param url Image URL
     * @param alt Alt text
     */
    insertImage(url: string, alt?: string): this;

    /**
     * Insert a video (YouTube/Vimeo)
     * @param url Video URL
     */
    insertVideo(url: string): this;

    /**
     * Set the image upload handler (plugin API)
     * @param handler Upload handler function
     */
    setImageUploadHandler(handler: ImageUploadHandler): this;

    /** Get the current image upload handler */
    getImageUploadHandler(): ImageUploadHandler | null;

    /**
     * Set readonly mode
     * @param readonly Enable/disable readonly
     */
    setReadonly(readonly: boolean): this;

    /** Check if editor is readonly */
    isReadonly(): boolean;

    /** Enable editing (alias for setReadonly(false)) */
    enable(): this;

    /** Disable editing (alias for setReadonly(true)) */
    disable(): this;

    /** Get word count statistics */
    getWordCount(): { chars: number; charsNoSpace: number; words: number };

    /** Get autosaved content from localStorage */
    getAutosavedContent(): { content: string; timestamp: number; id: string } | null;

    /** Clear autosaved content */
    clearAutosave(): this;

    /** Trigger autosave immediately */
    saveNow(): this;

    /**
     * Add event listener
     * @param event Event name
     * @param callback Handler function
     */
    on<K extends keyof EditorEventMap>(event: K, callback: (e: EditorEventMap[K]) => void): this;
    on(event: string, callback: (e: EditorEvent) => void): this;

    /**
     * Remove event listener
     * @param event Event name
     * @param callback Handler (omit to remove all listeners for this event)
     */
    off<K extends keyof EditorEventMap>(event: K, callback?: (e: EditorEventMap[K]) => void): this;
    off(event: string, callback?: (e: EditorEvent) => void): this;

    /**
     * Fire an event
     * @param event Event name
     * @param data Event data
     */
    fire(event: string, data?: Record<string, any>): this;

    /** Destroy the editor and restore the original textarea */
    destroy(): void;

    /** Get the content area element */
    getElement(): HTMLDivElement;

    /** Get the wrapper element */
    getWrapper(): HTMLDivElement;

    /** Get the toolbar element */
    getToolbar(): HTMLDivElement;
}

interface EditorOptions {
    /** Toolbar preset: 'minimal', 'basic', 'full' */
    toolbar?: 'minimal' | 'basic' | 'full';

    /** Custom toolbar items (overrides preset) */
    toolbarItems?: string[];

    /** Editor height in px */
    height?: number;

    /** Minimum height in px */
    minHeight?: number;

    /** Placeholder text */
    placeholder?: string;

    /** Auto-focus on init */
    autofocus?: boolean;

    /** Read-only mode */
    readonly?: boolean;

    /** Locale code ('ko', 'en', or custom) */
    locale?: string;

    /** Color palette */
    colors?: string[];

    /** Image upload endpoint URL */
    uploadUrl?: string | null;

    /** Max upload file size in bytes (default: 5MB) */
    maxFileSize?: number;

    /** Allowed image MIME types */
    allowedImageTypes?: string[];

    /** Enable HTML sanitization (default: true) */
    sanitize?: boolean;

    /** Auto-upload pasted/dropped images (default: true) */
    automatic_uploads?: boolean;

    /** Include credentials in upload requests */
    images_upload_credentials?: boolean;

    /** Legacy-style upload handler (resolve/reject callbacks) */
    images_upload_handler?: LegacyStyleUploadHandler;

    /** Show word count in status bar */
    showWordCount?: boolean;

    /** Max character length (0 = unlimited) */
    maxLength?: number;

    /** Enable autosave to localStorage */
    autosave?: boolean;

    /** Autosave interval in ms (default: 30000) */
    autosaveInterval?: number;

    /** Custom autosave localStorage key */
    autosaveKey?: string;

    /** Restore autosaved content on load (default: true) */
    autosaveRestore?: boolean;

    /** Content change callback */
    onChange?: (html: string, editor: Editor) => void;

    /** Focus callback */
    onFocus?: (editor: Editor) => void;

    /** Blur callback */
    onBlur?: (editor: Editor) => void;

    /** Legacy image upload callback */
    onImageUpload?: (file: File, editor: Editor) => Promise<{ url: string } | void>;

    /** Editor ready callback */
    onReady?: (editor: Editor) => void;
}

interface ToolbarItem {
    icon: string;
    iconExit?: string;
    title: string;
    type?: 'separator' | 'dropdown' | 'color' | 'link' | 'image' | 'table' | 'fullscreen' | 'source' | 'print' | 'findreplace' | 'video';
    command?: string;
    value?: string;
    items?: DropdownItem[];
}

interface DropdownItem {
    label: string;
    command: string;
    value: string;
}

declare class BlobInfo {
    constructor(file: File, base64?: string | null);

    /** Unique ID */
    id(): string;

    /** File name */
    name(): string;

    /** File name (alias) */
    filename(): string;

    /** File/Blob object */
    blob(): File;

    /** Base64 string */
    base64(): string | null;

    /** Blob URI */
    blobUri(): string;

    /** URI (alias) */
    uri(): string;
}

/** Progress callback */
type ProgressCallback = (percent: number) => void;

/** Image upload handler (Promise-based) */
type ImageUploadHandler = (blobInfo: BlobInfo, progress: ProgressCallback) => Promise<string>;

/** Legacy upload handler (resolve/reject callbacks) */
type LegacyStyleUploadHandler = (
    blobInfo: BlobInfo,
    success: (url: string) => void,
    failure: (err: string) => void,
    progress: ProgressCallback
) => void;

/** Plugin function */
type PluginFunction = (editor: Editor) => void;

/** Base event */
interface EditorEvent {
    type: string;
    target: Editor;
    [key: string]: any;
}

/** Locale string keys (for addLocale) */
interface LocaleStrings {
    bold: string; italic: string; underline: string; strikethrough: string;
    heading: string; heading1: string; heading2: string; heading3: string; paragraph: string;
    fontname: string; defaultFont: string;
    fontsize: string; sizeSmall: string; sizeNormal: string; sizeLarge: string; sizeHuge: string;
    subscript: string; superscript: string;
    forecolor: string; backcolor: string;
    alignleft: string; aligncenter: string; alignright: string;
    orderedlist: string; unorderedlist: string;
    indent: string; outdent: string;
    link: string; unlink: string;
    image: string; table: string; hr: string; video: string;
    blockquote: string; code: string;
    removeformat: string; selectall: string;
    print: string; undo: string; redo: string;
    fullscreen: string; source: string; findreplace: string;
    localFonts: Array<{ label: string; value: string }>;
    cancel: string; confirm: string; insert: string; replace: string;
    linkInsert: string; linkUrl: string; linkText: string; linkNewTab: string;
    imageAdd: string; imageReplace: string;
    imageDragOrClick: string; imageHint: string; imageUrlPlaceholder: string;
    imageUrlAdd: string; imageRemove: string; imageDragHint: string;
    imageSelected: string; imageCount: string; uploading: string;
    imageTooltip: string; urlImage: string;
    videoInsert: string; videoUrl: string; videoUrlPlaceholder: string;
    tableInsert: string;
    findPlaceholder: string; replacePlaceholder: string;
    findPrev: string; findNext: string;
    replaceOne: string; replaceAll: string; findClose: string;
    foundCount: string; noResult: string; replacedCount: string;
    chars: string; charsNoSpace: string; words: string;
    invalidImageType: string; fileTooLarge: string;
    uploadFailed: string; unsupportedUrl: string;
    autosaveRestore: string; autosaveRestoreBtn: string; autosaveIgnoreBtn: string;
}

/** Event map */
interface EditorEventMap {
    ready: EditorEvent & { editor: Editor };
    focus: EditorEvent;
    blur: EditorEvent;
    change: EditorEvent & { content: string };
    keydown: EditorEvent & { originalEvent: KeyboardEvent };
    paste: EditorEvent & { originalEvent: ClipboardEvent };
    drop: EditorEvent & { originalEvent: DragEvent };
    uploadStart: EditorEvent & { blobInfo: BlobInfo };
    uploadProgress: EditorEvent & { percent: number; blobInfo: BlobInfo };
    uploadSuccess: EditorEvent & { url: string; blobInfo: BlobInfo };
    uploadError: EditorEvent & { error: string; blobInfo?: BlobInfo; file?: File };
    uploadWarning: EditorEvent & { message: string; blobInfo: BlobInfo };
    fullscreenStateChanged: EditorEvent & { state: boolean };
    sourceModeChanged: EditorEvent & { state: boolean };
    readonlyStateChanged: EditorEvent & { state: boolean };
    wordcount: EditorEvent & { chars: number; charsNoSpace: number; words: number; maxLength: number };
    maxLengthExceeded: EditorEvent & { max: number; length: number };
    autosave: EditorEvent & { content: string; timestamp: number; id: string };
    autosaveError: EditorEvent & { error: string };
    autosaveClear: EditorEvent;
    autosaveRestoreAvailable: EditorEvent & { saved: any; editor: Editor; handled: boolean };
    imageModalReady: EditorEvent & { modal: HTMLElement };
    destroy: EditorEvent;
}
