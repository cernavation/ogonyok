import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { z } from 'zod'
import { ACCENT_PRESETS, THEME_PRESETS, FEED_DENSITY_PRESETS, FONT_SCALE_PRESETS } from '../lib/ogonek/appearance.ts'

const UpdatePrivacySchema = z.object({
  who_can_find: z.enum(['everyone', 'friends', 'nobody']).optional(),
  who_can_message: z.enum(['everyone', 'friends', 'nobody']).optional(),
  who_can_call: z.enum(['everyone', 'friends', 'nobody']).optional(),
  who_can_see_online: z.enum(['everyone', 'friends', 'nobody']).optional(),
  default_day_visibility: z.enum(['public', 'friends', 'groups', 'private']).optional(),
  show_streak_publicly: z.boolean().optional(),
  show_badges_publicly: z.boolean().optional(),
  show_difficulty_publicly: z.boolean().optional(),
  searchable_by_username: z.boolean().optional(),
  hide_from_leaderboards: z.boolean().optional(),
})

const BlockActionSchema = z.object({
  targetUserId: z.string().uuid(),
  action: z.enum(['block', 'unblock']),
})

const DeleteAccountSchema = z.object({
  password: z.string().min(1, 'Введите пароль для подтверждения'),
  confirmation: z.enum(['УДАЛИТЬ', 'DELETE']),
})

describe('Stage 14 Settings & Privacy Schemas', () => {
  it('validates privacy settings schema correctly', () => {
    const valid = UpdatePrivacySchema.safeParse({
      who_can_find: 'friends',
      who_can_message: 'everyone',
      who_can_call: 'nobody',
      who_can_see_online: 'friends',
      default_day_visibility: 'public',
      show_streak_publicly: true,
      searchable_by_username: false,
      hide_from_leaderboards: true,
    })
    assert.equal(valid.success, true)

    const invalid = UpdatePrivacySchema.safeParse({
      who_can_find: 'invalid_scope',
    })
    assert.equal(invalid.success, false)
  })

  it('validates block and unblock action schemas', () => {
    const validBlock = BlockActionSchema.safeParse({
      targetUserId: '123e4567-e89b-12d3-a456-426614174000',
      action: 'block',
    })
    assert.equal(validBlock.success, true)

    const validUnblock = BlockActionSchema.safeParse({
      targetUserId: '123e4567-e89b-12d3-a456-426614174000',
      action: 'unblock',
    })
    assert.equal(validUnblock.success, true)

    const invalidAction = BlockActionSchema.safeParse({
      targetUserId: '123e4567-e89b-12d3-a456-426614174000',
      action: 'ban_forever',
    })
    assert.equal(invalidAction.success, false)

    const invalidUuid = BlockActionSchema.safeParse({
      targetUserId: 'not-a-uuid',
      action: 'block',
    })
    assert.equal(invalidUuid.success, false)
  })

  it('validates account deletion security guard schema', () => {
    const validDeleteRu = DeleteAccountSchema.safeParse({
      password: 'mypassword123',
      confirmation: 'УДАЛИТЬ',
    })
    assert.equal(validDeleteRu.success, true)

    const validDeleteEn = DeleteAccountSchema.safeParse({
      password: 'mypassword123',
      confirmation: 'DELETE',
    })
    assert.equal(validDeleteEn.success, true)

    const invalidConfirm = DeleteAccountSchema.safeParse({
      password: 'mypassword123',
      confirmation: 'удалить_случайно',
    })
    assert.equal(invalidConfirm.success, false)

    const missingPass = DeleteAccountSchema.safeParse({
      password: '',
      confirmation: 'УДАЛИТЬ',
    })
    assert.equal(missingPass.success, false)
  })

  it('verifies appearance presets have consistent structure', () => {
    assert.equal(THEME_PRESETS.length, 3)
    assert.deepEqual(
      THEME_PRESETS.map((t) => t.id),
      ['x-black', 'apple-light', 'dim']
    )

    assert.equal(ACCENT_PRESETS.length, 6)
    assert.equal(FEED_DENSITY_PRESETS.length, 3)
    assert.equal(FONT_SCALE_PRESETS.length, 4)
  })

  it('checks contrast math for light theme --text-2 (#536471)', () => {
    const sRGB = [83 / 255, 100 / 255, 113 / 255].map((val) =>
      val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
    )
    const lumText = 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2]
    const lumWhite = 1.0
    const contrastRatio = (lumWhite + 0.05) / (lumText + 0.05)

    assert.ok(contrastRatio >= 4.5, `Contrast ratio ${contrastRatio} must be >= 4.5:1`)
    assert.ok(contrastRatio > 6.0, `Contrast ratio ${contrastRatio} is ~6.06:1`)
  })
})
