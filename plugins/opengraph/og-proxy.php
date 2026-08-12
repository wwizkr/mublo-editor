<?php
/**
 * MubloEditor OG 메타 수집 프록시 (v1.5 스마트 붙여넣기)
 *
 * GET ?url=https://... → JSON { success, title, description, image, host }
 *
 * 보안 (SSRF 방어):
 * - http/https 만 허용, 포트는 80/443 만 허용
 * - DNS 해석 후 사설/루프백/링크로컬/예약 대역 차단
 * - 리다이렉트는 수동 추적(최대 3회)하며 매 단계 재검증
 * - 타임아웃 3초, 응답 본문 상한 512KB
 * - 결과는 24시간 파일 캐시
 *
 * upload.php 와 동일하게 standalone 직접 실행은 기본 차단이다.
 * config.local.php 에서 'allow_standalone_handler' => true 설정 시에만 동작하며(로컬 개발),
 * 운영 환경에서는 프레임워크 라우트를 통해 MubloEditorOgProxy::fetch() 를 호출한다.
 */

class MubloEditorOgProxy
{
    private const MAX_REDIRECTS = 3;
    private const TIMEOUT = 3;
    private const MAX_BYTES = 524288; // 512KB
    private const CACHE_TTL = 86400;  // 24h

    /** URL 검증: 스킴·포트·IP 대역. 통과하면 정규화된 URL 반환, 실패 시 null */
    public static function validateUrl(string $url): ?string
    {
        $parts = parse_url($url);
        if (!$parts || empty($parts['host'])) return null;

        $scheme = strtolower($parts['scheme'] ?? '');
        if (!in_array($scheme, ['http', 'https'], true)) return null;

        $port = $parts['port'] ?? ($scheme === 'https' ? 443 : 80);
        if (!in_array($port, [80, 443], true)) return null;

        // 자격증명 포함 URL 차단 (http://user:pass@host — 파서 혼동 우회 방지)
        if (isset($parts['user']) || isset($parts['pass'])) return null;

        $host = $parts['host'];

        // 호스트가 IP 리터럴이면 그대로, 아니면 DNS 해석 후 검사
        $ips = [];
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            $ips[] = $host;
        } else {
            $records = @dns_get_record($host, DNS_A + DNS_AAAA) ?: [];
            foreach ($records as $r) {
                if (!empty($r['ip'])) $ips[] = $r['ip'];
                if (!empty($r['ipv6'])) $ips[] = $r['ipv6'];
            }
            if (!$ips) return null; // 해석 불가
        }

        foreach ($ips as $ip) {
            // 공인 IP 가 아니면 차단 (사설·루프백·링크로컬·예약 대역 전부)
            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
                return null;
            }
        }

        return $url;
    }

    /** 검증된 URL 의 HTML 을 가져온다 (수동 리다이렉트 + 크기 제한) */
    private static function fetchHtml(string $url): ?string
    {
        for ($i = 0; $i <= self::MAX_REDIRECTS; $i++) {
            if (self::validateUrl($url) === null) return null;

            $ch = curl_init($url);
            $body = '';
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => false,
                CURLOPT_FOLLOWLOCATION => false,      // 수동 추적 (재검증 위해)
                CURLOPT_PROTOCOLS      => CURLPROTO_HTTP | CURLPROTO_HTTPS,
                CURLOPT_CONNECTTIMEOUT => self::TIMEOUT,
                CURLOPT_TIMEOUT        => self::TIMEOUT + 2,
                CURLOPT_USERAGENT      => 'Mozilla/5.0 (compatible; MubloEditor-OG/1.0)',
                CURLOPT_HTTPHEADER     => ['Accept: text/html'],
                CURLOPT_WRITEFUNCTION  => function ($ch, $chunk) use (&$body) {
                    $body .= $chunk;
                    // 상한 초과 시 전송 중단 (curl 이 에러를 반환하지만 body 는 유지)
                    return strlen($body) > self::MAX_BYTES ? 0 : strlen($chunk);
                },
            ]);
            curl_exec($ch);
            $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            $redirect = curl_getinfo($ch, CURLINFO_REDIRECT_URL) ?: null;
            $ctype = (string)curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
            curl_close($ch);

            if ($status >= 300 && $status < 400 && $redirect) {
                $url = $redirect;
                continue;
            }
            if ($status >= 200 && $status < 300 && $body !== '') {
                // HTML 만 파싱
                if ($ctype && stripos($ctype, 'text/html') === false && stripos($ctype, 'xhtml') === false) {
                    return null;
                }
                return $body;
            }
            return null;
        }
        return null;
    }

    /** HTML 에서 OG/기본 메타 추출 */
    private static function parseMeta(string $html, string $url): array
    {
        $meta = ['title' => '', 'description' => '', 'image' => ''];

        // <meta property="og:..." content="..."> (속성 순서 양방향 지원)
        $patterns = [
            'title'       => 'og:title',
            'description' => 'og:description',
            'image'       => 'og:image',
        ];
        foreach ($patterns as $key => $prop) {
            if (preg_match(
                '/<meta[^>]+(?:property|name)=["\']' . preg_quote($prop, '/') . '["\'][^>]+content=["\']([^"\']*)["\']/i',
                $html, $m
            ) || preg_match(
                '/<meta[^>]+content=["\']([^"\']*)["\'][^>]+(?:property|name)=["\']' . preg_quote($prop, '/') . '["\']/i',
                $html, $m
            )) {
                $meta[$key] = html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
            }
        }

        // 폴백: <title>, meta description
        if ($meta['title'] === '' && preg_match('/<title[^>]*>(.*?)<\/title>/is', $html, $m)) {
            $meta['title'] = trim(html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        }
        if ($meta['description'] === '' && preg_match(
            '/<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']*)["\']/i', $html, $m
        )) {
            $meta['description'] = html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }

        // 상대 경로 og:image 보정 + http(s) 외 차단
        if ($meta['image'] !== '' && !preg_match('#^https?://#i', $meta['image'])) {
            $p = parse_url($url);
            if ($p && !empty($p['host']) && str_starts_with($meta['image'], '/')) {
                $meta['image'] = ($p['scheme'] ?? 'https') . '://' . $p['host'] . $meta['image'];
            } else {
                $meta['image'] = '';
            }
        }

        $host = parse_url($url, PHP_URL_HOST) ?: '';
        return [
            'success'     => true,
            'title'       => mb_substr($meta['title'], 0, 300),
            'description' => mb_substr($meta['description'], 0, 500),
            'image'       => mb_substr($meta['image'], 0, 2000),
            'host'        => preg_replace('/^www\./', '', $host),
        ];
    }

    /** 캐시 포함 전체 흐름. 프레임워크 라우트에서도 이 메서드를 호출한다 */
    public static function fetch(string $url): array
    {
        if (self::validateUrl($url) === null) {
            return ['success' => false, 'error' => 'INVALID_URL', 'message' => 'URL not allowed'];
        }

        $cacheDir = sys_get_temp_dir() . '/mublo-og-cache';
        if (!is_dir($cacheDir)) @mkdir($cacheDir, 0775, true);
        $cacheFile = $cacheDir . '/' . md5($url) . '.json';

        if (is_file($cacheFile) && (time() - filemtime($cacheFile)) < self::CACHE_TTL) {
            $cached = json_decode((string)file_get_contents($cacheFile), true);
            if (is_array($cached)) return $cached;
        }

        $html = self::fetchHtml($url);
        if ($html === null) {
            return ['success' => false, 'error' => 'FETCH_FAILED', 'message' => 'Could not fetch URL'];
        }

        $result = self::parseMeta($html, $url);
        @file_put_contents($cacheFile, json_encode($result, JSON_UNESCAPED_UNICODE), LOCK_EX);
        return $result;
    }
}

// 직접 실행: upload.php 와 동일한 게이트 (config.local.php 의 allow_standalone_handler)
if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'] ?? '')) {
    header('Content-Type: application/json; charset=utf-8');

    $configPath = dirname(__DIR__, 2) . '/config.php';
    $localPath = dirname(__DIR__, 2) . '/config.local.php';
    $config = is_file($configPath) ? require $configPath : [];
    if (is_file($localPath)) {
        $config = array_merge($config, require $localPath);
    }

    if (empty($config['allow_standalone_handler'])) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error'   => 'STANDALONE_DISABLED',
            'message' => 'Standalone OG proxy is disabled. Route through the framework.',
        ]);
        exit;
    }

    $url = (string)($_GET['url'] ?? '');
    if ($url === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'MISSING_URL', 'message' => 'url parameter required']);
        exit;
    }

    $result = MubloEditorOgProxy::fetch($url);
    if (empty($result['success'])) http_response_code(422);
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
}
