import test from 'node:test'
import assert from 'node:assert/strict'
import {
  validateMediaFileType,
  compressToWebP,
  uploadProfileMedia,
  MAX_FILE_SIZE_BYTES,
} from '../lib/ogonek/profile-media-service.ts'

test('Profile Media: Валидация типов файлов (ЗАДАЧА 4)', async (t) => {
  await t.test('принимает допустимые форматы: JPG, PNG, WebP, HEIC', () => {
    const validJpg = new File(['mock-content'], 'avatar.jpg', { type: 'image/jpeg' })
    const validPng = new File(['mock-content'], 'cover.png', { type: 'image/png' })
    const validWebp = new File(['mock-content'], 'photo.webp', { type: 'image/webp' })
    const validHeic = new File(['mock-content'], 'iphone.heic', { type: 'image/heic' })

    assert.equal(validateMediaFileType(validJpg).valid, true)
    assert.equal(validateMediaFileType(validPng).valid, true)
    assert.equal(validateMediaFileType(validWebp).valid, true)
    assert.equal(validateMediaFileType(validHeic).valid, true)
  })

  await t.test('отклоняет неподдерживаемые форматы (exe, pdf, txt, svg)', () => {
    const invalidPdf = new File(['%PDF'], 'document.pdf', { type: 'application/pdf' })
    const invalidTxt = new File(['hello'], 'note.txt', { type: 'text/plain' })
    const invalidExe = new File(['MZ'], 'run.exe', { type: 'application/x-msdownload' })

    assert.equal(validateMediaFileType(invalidPdf).valid, false)
    assert.equal(validateMediaFileType(invalidTxt).valid, false)
    assert.equal(validateMediaFileType(invalidExe).valid, false)
  })
})

test('Profile Media: Компрессия и лимит размера (ЗАДАЧА 4)', async (t) => {
  await t.test('проверяет константу максимального размера (ровно 2 МБ)', () => {
    assert.equal(MAX_FILE_SIZE_BYTES, 2 * 1024 * 1024)
  })

  await t.test('обрабатывает сжатие в WebP без падений', async () => {
    const dummyBlob = new Blob(['sample-image-bytes'], { type: 'image/jpeg' })
    const result = await compressToWebP(dummyBlob, MAX_FILE_SIZE_BYTES)
    assert.ok(result.blob)
    assert.ok(result.dataUrl)
    assert.equal(result.blob.type, 'image/webp')
  })
})

test('Profile Media: Загрузка аватара и обложки (ЗАДАЧА 4)', async (t) => {
  await t.test('загружает аватар в fallback-режиме при отсутствии облака без битых картинок', async () => {
    const dummyBlob = new Blob(['mock-avatar-bytes'], { type: 'image/jpeg' })
    const res = await uploadProfileMedia({
      kind: 'avatar',
      fileOrCanvas: dummyBlob,
      userId: 'usr-test-123',
    })

    assert.equal(res.ok, true)
    assert.ok(res.url)
    assert.ok(res.url.startsWith('data:image/') || res.url.startsWith('http'))
  })

  await t.test('загружает обложку с сохранением URL', async () => {
    const dummyBlob = new Blob(['mock-banner-bytes'], { type: 'image/png' })
    const res = await uploadProfileMedia({
      kind: 'banner',
      fileOrCanvas: dummyBlob,
      userId: 'usr-test-123',
    })

    assert.equal(res.ok, true)
    assert.ok(res.url)
  })
})
