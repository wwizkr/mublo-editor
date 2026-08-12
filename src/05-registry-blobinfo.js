    const instances = new Map();
    const plugins = new Map();
    // 플러그인이 등록하는 전역 커스텀 툴바 항목 (이름 → def)
    const customToolbarItems = new Map();

    // =========================================================
    // BlobInfo 클래스
    // =========================================================
    class BlobInfo {
        constructor(file, base64 = null) {
            this._file = file;
            this._base64 = base64;
            this._id = 'blobid' + Date.now() + Math.random().toString(36).substr(2, 9);
        }

        id() { return this._id; }
        name() { return this._file.name; }
        filename() { return this._file.name; }
        blob() { return this._file; }
        base64() { return this._base64; }
        blobUri() { return URL.createObjectURL(this._file); }
        uri() { return this.blobUri(); }
    }

