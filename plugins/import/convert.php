<?php
/**
 * MubloEditor 문서 변환기 (v1.7 — FileImport 플러그인 서버 지원)
 *
 * POST multipart(file) → JSON { success, html }
 *
 * 지원 형식 (외부 라이브러리 없이 PHP 내장 기능만 사용):
 * - DOCX: ZipArchive + word/document.xml 파싱 (문단·제목·굵게/기울임·표·목록)
 * - XLSX: ZipArchive + sharedStrings/sheet1 파싱 (첫 시트 → 표)
 * - PDF:  pdftotext 바이너리가 있으면 텍스트 추출, 없으면 UNSUPPORTED
 *
 * upload.php 와 동일하게 standalone 직접 실행은 config.local.php 의
 * 'allow_standalone_handler' => true 일 때만 허용된다 (로컬 개발 전용).
 * 운영 환경에서는 프레임워크 라우트에서 MubloEditorFileConverter::convert() 호출.
 */

class MubloEditorFileConverter
{
    private const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    private const MAX_CELLS = 5000;            // XLSX 표 셀 상한

    private static function esc(string $s): string
    {
        return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
    }

    /** @return array{success:bool, html?:string, error?:string, message?:string} */
    public static function convert(string $path, string $originalName): array
    {
        if (!is_file($path) || filesize($path) > self::MAX_SIZE) {
            return ['success' => false, 'error' => 'INVALID_FILE', 'message' => 'File missing or too large'];
        }
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        switch ($ext) {
            case 'docx': return self::convertDocx($path);
            case 'xlsx': return self::convertXlsx($path);
            case 'pdf':  return self::convertPdf($path);
            default:
                return ['success' => false, 'error' => 'UNSUPPORTED', 'message' => 'Unsupported extension: ' . $ext];
        }
    }

    // ---------------------------------------------------------
    // DOCX
    // ---------------------------------------------------------
    private static function convertDocx(string $path): array
    {
        if (!class_exists('ZipArchive')) {
            return ['success' => false, 'error' => 'NO_ZIP', 'message' => 'ZipArchive extension required'];
        }
        $zip = new ZipArchive();
        if ($zip->open($path) !== true) {
            return ['success' => false, 'error' => 'BAD_DOCX', 'message' => 'Cannot open docx'];
        }
        $xml = $zip->getFromName('word/document.xml');
        $zip->close();
        if ($xml === false) {
            return ['success' => false, 'error' => 'BAD_DOCX', 'message' => 'word/document.xml not found'];
        }

        $doc = new DOMDocument();
        if (!@$doc->loadXML($xml, LIBXML_NONET | LIBXML_NOENT)) {
            return ['success' => false, 'error' => 'BAD_XML', 'message' => 'Cannot parse document.xml'];
        }
        $xp = new DOMXPath($doc);
        $xp->registerNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main');

        $out = [];
        $body = $xp->query('//w:body')->item(0);
        if (!$body) return ['success' => false, 'error' => 'BAD_DOCX', 'message' => 'No body'];

        $listBuffer = [];
        $flushList = function () use (&$listBuffer, &$out) {
            if ($listBuffer) {
                $out[] = '<ul>' . implode('', $listBuffer) . '</ul>';
                $listBuffer = [];
            }
        };

        foreach ($body->childNodes as $node) {
            if (!($node instanceof DOMElement)) continue;

            if ($node->localName === 'p') {
                $style = $xp->evaluate('string(w:pPr/w:pStyle/@w:val)', $node);
                $isList = $xp->query('w:pPr/w:numPr', $node)->length > 0;
                $inner = self::docxRuns($xp, $node);
                if (trim(strip_tags($inner)) === '') { $flushList(); continue; }

                if ($isList) {
                    $listBuffer[] = '<li>' . $inner . '</li>';
                    continue;
                }
                $flushList();
                if (preg_match('/^Heading([1-6])$/i', $style, $m) || preg_match('/^제목\s*([1-6])$/u', $style, $m)) {
                    $lv = min(6, max(1, (int)$m[1]));
                    $out[] = "<h{$lv}>{$inner}</h{$lv}>";
                } else {
                    $out[] = '<p>' . $inner . '</p>';
                }
                continue;
            }

            if ($node->localName === 'tbl') {
                $flushList();
                $rows = [];
                foreach ($xp->query('w:tr', $node) as $ri => $tr) {
                    $cells = [];
                    foreach ($xp->query('w:tc', $tr) as $tc) {
                        $cellHtml = [];
                        foreach ($xp->query('w:p', $tc) as $p) {
                            $cellHtml[] = self::docxRuns($xp, $p);
                        }
                        $tag = $ri === 0 ? 'th' : 'td';
                        $cells[] = "<{$tag} style=\"border:1px solid #dee2e6; padding:8px;\">" . implode('<br>', $cellHtml) . "</{$tag}>";
                    }
                    if ($cells) $rows[] = '<tr>' . implode('', $cells) . '</tr>';
                }
                if ($rows) {
                    $out[] = '<table style="width:100%;border-collapse:collapse;"><tbody>' . implode('', $rows) . '</tbody></table>';
                }
            }
        }
        $flushList();

        return ['success' => true, 'html' => implode('', $out)];
    }

    /** 문단 안의 run 들을 굵게/기울임 유지하며 HTML 로 */
    private static function docxRuns(DOMXPath $xp, DOMElement $p): string
    {
        $html = '';
        foreach ($xp->query('.//w:r', $p) as $r) {
            $text = '';
            foreach ($xp->query('w:t', $r) as $t) $text .= $t->textContent;
            if ($xp->query('w:br', $r)->length) $html .= '<br>';
            if ($text === '') continue;
            $text = self::esc($text);
            $bold = $xp->evaluate('count(w:rPr/w:b[not(@w:val="0")][not(@w:val="false")])', $r) > 0;
            $italic = $xp->evaluate('count(w:rPr/w:i[not(@w:val="0")][not(@w:val="false")])', $r) > 0;
            if ($bold) $text = '<strong>' . $text . '</strong>';
            if ($italic) $text = '<em>' . $text . '</em>';
            $html .= $text;
        }
        return $html;
    }

    // ---------------------------------------------------------
    // XLSX (첫 시트)
    // ---------------------------------------------------------
    private static function convertXlsx(string $path): array
    {
        if (!class_exists('ZipArchive')) {
            return ['success' => false, 'error' => 'NO_ZIP', 'message' => 'ZipArchive extension required'];
        }
        $zip = new ZipArchive();
        if ($zip->open($path) !== true) {
            return ['success' => false, 'error' => 'BAD_XLSX', 'message' => 'Cannot open xlsx'];
        }

        // 공유 문자열
        $shared = [];
        $ss = $zip->getFromName('xl/sharedStrings.xml');
        if ($ss !== false) {
            $ssDoc = new DOMDocument();
            if (@$ssDoc->loadXML($ss, LIBXML_NONET)) {
                foreach ($ssDoc->getElementsByTagName('si') as $si) {
                    $shared[] = $si->textContent;
                }
            }
        }

        // 첫 시트 찾기
        $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
        if ($sheetXml === false) {
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $name = $zip->getNameIndex($i);
                if (preg_match('#^xl/worksheets/sheet\d+\.xml$#', $name)) {
                    $sheetXml = $zip->getFromName($name);
                    break;
                }
            }
        }
        $zip->close();
        if ($sheetXml === false) {
            return ['success' => false, 'error' => 'BAD_XLSX', 'message' => 'No worksheet found'];
        }

        $doc = new DOMDocument();
        if (!@$doc->loadXML($sheetXml, LIBXML_NONET)) {
            return ['success' => false, 'error' => 'BAD_XML', 'message' => 'Cannot parse sheet'];
        }

        $rows = [];
        $cellCount = 0;
        foreach ($doc->getElementsByTagName('row') as $row) {
            $cells = [];
            $colIdx = 0;
            foreach ($row->getElementsByTagName('c') as $c) {
                // 열 위치 보정 (빈 셀 건너뛴 자리 채움)
                $ref = $c->getAttribute('r');
                if ($ref && preg_match('/^([A-Z]+)/', $ref, $m)) {
                    $target = self::colToIndex($m[1]);
                    while ($colIdx < $target) { $cells[] = ''; $colIdx++; }
                }
                $type = $c->getAttribute('t');
                $vNode = $c->getElementsByTagName('v')->item(0);
                $v = $vNode ? $vNode->textContent : '';
                if ($type === 's') $v = $shared[(int)$v] ?? '';
                elseif ($type === 'inlineStr') $v = $c->textContent;
                $cells[] = $v;
                $colIdx++;
                if (++$cellCount > self::MAX_CELLS) break 2;
            }
            $rows[] = $cells;
        }
        // 뒤쪽 완전 빈 행 제거
        while ($rows && !array_filter(end($rows), fn($v) => trim((string)$v) !== '')) array_pop($rows);
        if (!$rows) return ['success' => false, 'error' => 'EMPTY', 'message' => 'Empty sheet'];

        $maxCols = max(array_map('count', $rows));
        $html = '<table style="width:100%;border-collapse:collapse;"><tbody>';
        foreach ($rows as $ri => $cells) {
            $tag = $ri === 0 ? 'th' : 'td';
            $html .= '<tr>';
            for ($i = 0; $i < $maxCols; $i++) {
                $html .= "<{$tag} style=\"border:1px solid #dee2e6; padding:8px;\">" . self::esc((string)($cells[$i] ?? '')) . "</{$tag}>";
            }
            $html .= '</tr>';
        }
        $html .= '</tbody></table>';

        return ['success' => true, 'html' => $html];
    }

    private static function colToIndex(string $letters): int
    {
        $n = 0;
        foreach (str_split($letters) as $ch) $n = $n * 26 + (ord($ch) - 64);
        return $n - 1;
    }

    // ---------------------------------------------------------
    // PDF — pdftotext 가 설치된 환경에서만
    // ---------------------------------------------------------
    private static function convertPdf(string $path): array
    {
        // "명령을 찾을 수 없음" 에러 문구에도 명령 이름이 포함되므로,
        // 버전 출력 형식("pdftotext version x.y")까지 확인해야 오탐이 없다 (특히 Windows).
        $bin = null;
        foreach (['pdftotext', '/usr/bin/pdftotext', '/usr/local/bin/pdftotext'] as $cand) {
            $check = @shell_exec(escapeshellcmd($cand) . ' -v 2>&1');
            if ($check !== null && preg_match('/pdftotext\s+version\s+[\d.]/i', (string)$check)) { $bin = $cand; break; }
        }
        if ($bin === null) {
            return [
                'success' => false,
                'error'   => 'PDF_TOOL_MISSING',
                'message' => 'pdftotext not installed on this server — install poppler-utils'
                    . ' (Linux: apt install poppler-utils / macOS: brew install poppler / Windows: choco install poppler)',
            ];
        }
        $nullDev = DIRECTORY_SEPARATOR === '\\' ? 'nul' : '/dev/null';
        $out = @shell_exec(escapeshellcmd($bin) . ' -layout -enc UTF-8 ' . escapeshellarg($path) . ' - 2>' . $nullDev);
        if (!$out || trim($out) === '') {
            return ['success' => false, 'error' => 'EMPTY', 'message' => 'No extractable text (scanned/image-only PDF?)'];
        }
        $paras = preg_split('/\R\R+/', trim($out));
        $html = implode('', array_map(
            fn($p) => '<p>' . nl2br(self::esc(trim($p))) . '</p>',
            array_filter($paras, fn($p) => trim($p) !== '')
        ));
        return ['success' => true, 'html' => $html];
    }

    // ---------------------------------------------------------
    // HTTP 핸들러 (standalone)
    // ---------------------------------------------------------
    public static function handleRequest(): void
    {
        header('Content-Type: application/json; charset=utf-8');
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST' || empty($_FILES['file'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'BAD_REQUEST', 'message' => 'POST multipart "file" required']);
            return;
        }
        $f = $_FILES['file'];
        if ($f['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'UPLOAD_ERROR', 'message' => 'Upload error ' . $f['error']]);
            return;
        }
        $result = self::convert($f['tmp_name'], $f['name']);
        if (empty($result['success'])) http_response_code(422);
        echo json_encode($result, JSON_UNESCAPED_UNICODE);
    }
}

// 직접 실행 게이트 (upload.php / og-proxy.php 와 동일 규칙)
if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'] ?? '')) {
    $configPath = dirname(__DIR__, 2) . '/config.php';
    $localPath = dirname(__DIR__, 2) . '/config.local.php';
    $config = is_file($configPath) ? require $configPath : [];
    if (is_file($localPath)) $config = array_merge($config, require $localPath);

    if (empty($config['allow_standalone_handler'])) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error'   => 'STANDALONE_DISABLED',
            'message' => 'Standalone converter is disabled. Route through the framework.',
        ]);
        exit;
    }
    MubloEditorFileConverter::handleRequest();
}
