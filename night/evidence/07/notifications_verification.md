# STAGE 07: NOTIFICATION CENTER & UNREAD SYSTEM VERIFICATION REPORT

## 1. Executive Summary
- **Target**: Notification Center, Unread Counts Persistence, Telegram Desktop Toasts, Web Audio Synthesizer, Missed Calls & Reaction Aggregation.
- **Status**: ALL VERIFICATIONS PASSED (DONE)
- **Total Tests**: 40
- **Passed**: 40
- **Failed**: 0

## 2. Test Suite Breakdown
| Suite | Description | Total | Passed | Status |
|---|---|---|---|---|
| Migration & Schema | 070_notifications.sql, 9 types, RLS, 4 RPCs | 17 | 17 | PASS |
| Unread Counts | Persistence across reloads, chats, comrades, notifications | 5 | 5 | PASS |
| Telegram Toasts | Stack max 3, auto-close 6s, hover pause, chat suppression | 4 | 4 | PASS |
| Audio Synthesizer | Web Audio oscillators, gesture unlock, DND mode | 5 | 5 | PASS |
| Missed Calls | System message «Пропущенный звонок», badge, notification | 2 | 2 | PASS |
| Reaction Aggregation | Anti-spam 1-minute window per post/entity | 2 | 2 | PASS |
| Tab Title & Favicon | (N) Огонёк, 99+ formatting | 3 | 3 | PASS |

## 3. Key Guarantees Tested
1. **Unread Counts Persistence**: `get_unread_counts` returns atomic counts directly from Postgres upon initial page mount, preserving counters across browser reloads.
2. **Toast Stack Overflow Protection**: Even if 30 messages arrive simultaneously, the screen never shows more than 3 visible toasts.
3. **Suppression in Active Chat**: When a user is in `messages` view actively looking at the sender's thread, incoming toasts and sound signals are cleanly suppressed.
4. **Missed Call Visibility**: Triggers create both a `missed_call` notification and a system message «Пропущенный звонок, HH:MM» in `direct_messages` with a distinct red badge in the dialog list.
5. **Autoplay Safe Web Audio**: AudioContext unlocks on the first user gesture (`pointerdown`, `keydown`, `touchstart`) without console errors.
