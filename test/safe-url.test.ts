import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  isSafeUrl,
  safeHref,
  isSafeImageSrc,
  safeImageSrc,
  sanitizeWebsiteUrl,
  normalizeUrlCandidate,
} from '../lib/ogonek/safe-url.ts'

describe('Защита от XSS и санитайзер URL (lib/ogonek/safe-url.ts)', () => {
  it('разрешает легитимные http: и https: адреса', () => {
    assert.equal(isSafeUrl('https://example.com'), true)
    assert.equal(isSafeUrl('https://sub.domain.org/path/to/page?query=1&b=2#hash'), true)
    assert.equal(isSafeUrl('http://insecure-site.ru'), true)
    assert.equal(isSafeUrl('https://giphy.com/gifs/funny-cat-123'), true)
  })

  it('отклоняет javascript: во всех регистрах и вариантах', () => {
    assert.equal(isSafeUrl('javascript:alert(1)'), false)
    assert.equal(isSafeUrl('JavaScript:alert(document.cookie)'), false)
    assert.equal(isSafeUrl('JAVASCRIPT:alert(window.origin)'), false)
    assert.equal(isSafeUrl('javascript:void(0)'), false)
    assert.equal(safeHref('javascript:alert(1)'), null)
  })

  it('отклоняет data: ссылки для href (защита от Stored XSS)', () => {
    assert.equal(isSafeUrl('data:text/html,<script>alert(1)</script>'), false)
    assert.equal(isSafeUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='), false)
    assert.equal(safeHref('data:text/html,<script>alert(1)</script>'), null)
  })

  it('отклоняет vbscript: схемы', () => {
    assert.equal(isSafeUrl('vbscript:msgbox("XSS")'), false)
    assert.equal(isSafeUrl('VBScript:Execute(something)'), false)
    assert.equal(safeHref('vbscript:msgbox(1)'), null)
  })

  it('отклоняет protocol-relative ссылки вида //evil.com', () => {
    assert.equal(isSafeUrl('//evil.com/payload.js'), false)
    assert.equal(isSafeUrl('\\\\evil.com\\payload'), false)
    assert.equal(safeHref('//attacker.org'), null)
  })

  it('нейтрализует пробелы, переносы строк и табуляции для обхода фильтра', () => {
    assert.equal(isSafeUrl('   https://example.com  '), true)
    assert.equal(isSafeUrl('  javascript:alert(1)  '), false)
    assert.equal(isSafeUrl('java\tscript:alert(1)'), false)
    assert.equal(isSafeUrl('java\r\nscript:alert(1)'), false)
    assert.equal(isSafeUrl('java script:alert(1)'), false)
  })

  it('отклоняет нулевые байты и скрытые управляющие символы (0x00-0x1F, 0x7F)', () => {
    assert.equal(isSafeUrl('java\0script:alert(1)'), false)
    assert.equal(isSafeUrl('https://example.com/\0evil'), true) // чистится до https://example.com/evil
    assert.equal(normalizeUrlCandidate('java\u0000script:alert(1)').includes('\u0000'), false)
  })

  it('отклоняет URL-encoded и Unicode-обходы (полноширинные символы и zero-width spaces)', () => {
    // zero-width space
    assert.equal(isSafeUrl('java\u200Bscript:alert(1)'), false)
    assert.equal(isSafeUrl('java\uFEFFscript:alert(1)'), false)

    // URL-encoded percent representation "javascript%3A..."
    assert.equal(isSafeUrl('javascript%3Aalert(1)'), false)
    assert.equal(isSafeUrl('%6a%61%76%61%73%63%72%69%70%74%3aalert(1)'), false)

    // fullwidth colon \uFF1A
    assert.equal(isSafeUrl('javascript\uFF1Aalert(1)'), false)
  })

  it('безопасно валидирует источники изображений (isSafeImageSrc & safeImageSrc)', () => {
    assert.equal(isSafeImageSrc('https://cdn.example.com/photo.jpg'), true)
    assert.equal(isSafeImageSrc('/avatars/avatar-1.png'), true)
    assert.equal(isSafeImageSrc('blob:http://localhost:3000/12345'), true)
    assert.equal(isSafeImageSrc('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='), true)

    // Запрещено в src
    assert.equal(isSafeImageSrc('javascript:alert(1)'), false)
    assert.equal(isSafeImageSrc('//evil.com/cat.png'), false)
    assert.equal(isSafeImageSrc('data:text/html,<script>'), false)
    assert.equal(isSafeImageSrc('data:image/svg+xml,<svg onload=alert(1)>'), false)

    assert.equal(safeImageSrc('https://example.com/a.jpg'), 'https://example.com/a.jpg')
    assert.equal(safeImageSrc('javascript:alert(1)', '/default.png'), '/default.png')
  })

  it('санитизирует сайт пользователя в профиле (sanitizeWebsiteUrl)', () => {
    assert.equal(sanitizeWebsiteUrl('github.com/myname'), 'https://github.com/myname')
    assert.equal(sanitizeWebsiteUrl('https://myblog.io'), 'https://myblog.io')
    assert.equal(sanitizeWebsiteUrl('http://myblog.io'), 'http://myblog.io')
    assert.equal(sanitizeWebsiteUrl('javascript:alert(1)'), null)
    assert.equal(sanitizeWebsiteUrl('//evil.com'), null)
    assert.equal(sanitizeWebsiteUrl(''), null)
  })

  it('корректно обрабатывает нестроковые и пустые входные данные', () => {
    assert.equal(isSafeUrl(null), false)
    assert.equal(isSafeUrl(undefined), false)
    assert.equal(isSafeUrl(123), false)
    assert.equal(isSafeUrl({}), false)
    assert.equal(isSafeUrl(''), false)
    assert.equal(safeHref(null), null)
  })
})
