# СРЕЗ INFORMATION_SCHEMA КАНОНИЧЕСКОЙ СХЕМЫ (ЭТАП 1)

- **Дата формирования**: 2026-11-09T21:30:21.969Z
- **Файл миграции**: [`supabase/migrations/010_canonical_schema.sql`](file:///Users/user/Desktop/ogonyok-ai-clone/supabase/migrations/010_canonical_schema.sql)
- **Сущностей проверено**: 16

### Сущность: `profiles`
| № | Колонка | Тип данных | Nullable |
|---|---------|------------|:--------:|
| 1 | `id` | `uuid` | NO |
| 2 | `username` | `text` | NO |
| 3 | `display_name` | `text` | NO |
| 4 | `bio` | `text` | NO |
| 5 | `city` | `text` | NO |
| 6 | `website` | `text` | NO |
| 7 | `joined_label` | `text` | NO |
| 8 | `avatar_url` | `text` | NO |
| 9 | `avatar_image` | `text` | NO |
| 10 | `avatar_color` | `text` | NO |
| 11 | `cover_url` | `text` | NO |
| 12 | `banner_image` | `text` | NO |
| 13 | `banner_preset` | `text` | NO |
| 14 | `level` | `integer` | NO |
| 15 | `difficulty_level` | `integer` | NO |
| 16 | `streak_count` | `integer` | NO |
| 17 | `streak` | `integer` | NO |
| 18 | `subscription_tier` | `text` | NO |
| 19 | `verified` | `bool` | NO |
| 20 | `is_anonymous` | `bool` | NO |
| 21 | `telegram_chat_id` | `text` | NO |
| 22 | `monthly_goal` | `text` | NO |
| 23 | `monthly_goal_updated_at` | `timestamptz` | NO |
| 24 | `level_changed_at` | `timestamptz` | NO |
| 25 | `theme` | `text` | NO |
| 26 | `accent` | `text` | NO |
| 27 | `font_scale` | `text` | NO |
| 28 | `feed_density` | `text` | NO |
| 29 | `privacy` | `jsonb` | NO |
| 30 | `streak_settings` | `jsonb` | NO |
| 31 | `settings` | `jsonb` | NO |
| 32 | `social_links` | `jsonb` | NO |
| 33 | `reminder_times` | `jsonb` | NO |
| 34 | `client_id` | `text` | NO |
| 35 | `client_updated_at` | `timestamptz` | NO |
| 36 | `created_at` | `timestamptz` | NO |
| 37 | `updated_at` | `timestamptz` | NO |

### Сущность: `days`
| № | Колонка | Тип данных | Nullable |
|---|---------|------------|:--------:|
| 1 | `id` | `uuid` | NO |
| 2 | `user_id` | `uuid` | NO |
| 3 | `client_id` | `text` | NO |
| 4 | `day_number` | `integer` | NO |
| 5 | `title` | `text` | NO |
| 6 | `date_iso` | `text` | NO |
| 7 | `day_date` | `date` | NO |
| 8 | `status` | `text` | NO |
| 9 | `visibility` | `text` | NO |
| 10 | `closed_at` | `timestamptz` | NO |
| 11 | `tags` | `jsonb` | NO |
| 12 | `photos` | `jsonb` | NO |
| 13 | `client_updated_at` | `timestamptz` | NO |
| 14 | `created_at` | `timestamptz` | NO |
| 15 | `updated_at` | `timestamptz` | NO |

### Сущность: `prides`
| № | Колонка | Тип данных | Nullable |
|---|---------|------------|:--------:|
| 1 | `id` | `uuid` | NO |
| 2 | `user_id` | `uuid` | NO |
| 3 | `day_id` | `uuid` | NO |
| 4 | `day_client_id` | `text` | NO |
| 5 | `client_id` | `text` | NO |
| 6 | `position` | `integer` | NO |
| 7 | `num` | `text` | NO |
| 8 | `text` | `text` | NO |
| 9 | `scale` | `integer` | NO |
| 10 | `overcome` | `integer` | NO |
| 11 | `ai_comment` | `text` | NO |
| 12 | `visibility` | `text` | NO |
| 13 | `client_updated_at` | `timestamptz` | NO |
| 14 | `created_at` | `timestamptz` | NO |
| 15 | `updated_at` | `timestamptz` | NO |

### Сущность: `gratitudes`
| № | Колонка | Тип данных | Nullable |
|---|---------|------------|:--------:|
| 1 | `id` | `uuid` | NO |
| 2 | `user_id` | `uuid` | NO |
| 3 | `day_id` | `uuid` | NO |
| 4 | `day_client_id` | `text` | NO |
| 5 | `client_id` | `text` | NO |
| 6 | `position` | `integer` | NO |
| 7 | `num` | `text` | NO |
| 8 | `text` | `text` | NO |
| 9 | `rating` | `integer` | NO |
| 10 | `visibility` | `text` | NO |
| 11 | `client_updated_at` | `timestamptz` | NO |
| 12 | `created_at` | `timestamptz` | NO |
| 13 | `updated_at` | `timestamptz` | NO |

### Сущность: `diary_days`
| № | Колонка | Тип данных | Nullable |
|---|---------|------------|:--------:|
| 1 | `id` | `VIEW_COLUMN` | YES |
| 2 | `user_id` | `VIEW_COLUMN` | YES |
| 3 | `day_number` | `VIEW_COLUMN` | YES |
| 4 | `day_date` | `VIEW_COLUMN` | YES |
| 5 | `closed_at` | `VIEW_COLUMN` | YES |
| 6 | `created_at` | `VIEW_COLUMN` | YES |
| 7 | `updated_at` | `VIEW_COLUMN` | YES |

### Сущность: `stories`
| № | Колонка | Тип данных | Nullable |
|---|---------|------------|:--------:|
| 1 | `id` | `uuid` | NO |
| 2 | `user_id` | `uuid` | NO |
| 3 | `client_id` | `text` | NO |
| 4 | `friend_id` | `uuid` | NO |
| 5 | `emoji` | `text` | NO |
| 6 | `kicker` | `text` | NO |
| 7 | `headline` | `text` | NO |
| 8 | `detail` | `text` | NO |
| 9 | `from_color` | `text` | NO |
| 10 | `to_color` | `text` | NO |
| 11 | `accent` | `text` | NO |
| 12 | `background_id` | `text` | NO |
| 13 | `photo` | `text` | NO |
| 14 | `slides` | `jsonb` | NO |
| 15 | `source_day_id` | `integer` | NO |
| 16 | `source_pride_index` | `integer` | NO |
| 17 | `visibility` | `text` | NO |
| 18 | `created_at` | `timestamptz` | NO |
| 19 | `expires_at` | `timestamptz` | NO |
| 20 | `client_updated_at` | `timestamptz` | NO |

### Сущность: `comments`
| № | Колонка | Тип данных | Nullable |
|---|---------|------------|:--------:|
| 1 | `id` | `uuid` | NO |
| 2 | `user_id` | `uuid` | NO |
| 3 | `client_id` | `text` | NO |
| 4 | `target_key` | `text` | NO |
| 5 | `day_client_id` | `text` | NO |
| 6 | `parent_client_id` | `text` | NO |
| 7 | `author` | `text` | NO |
| 8 | `initials` | `text` | NO |
| 9 | `text` | `text` | NO |
| 10 | `likes` | `integer` | NO |
| 11 | `liked_by_me` | `bool` | NO |
| 12 | `is_mine` | `bool` | NO |
| 13 | `template` | `text` | NO |
| 14 | `persona` | `text` | NO |
| 15 | `created_at` | `timestamptz` | NO |
| 16 | `client_updated_at` | `timestamptz` | NO |

### Сущность: `reactions`
| № | Колонка | Тип данных | Nullable |
|---|---------|------------|:--------:|
| 1 | `id` | `uuid` | NO |
| 2 | `user_id` | `uuid` | NO |
| 3 | `client_id` | `text` | NO |
| 4 | `target_key` | `text` | NO |
| 5 | `target_kind` | `text` | NO |
| 6 | `day_client_id` | `text` | NO |
| 7 | `position` | `integer` | NO |
| 8 | `emoji_id` | `text` | NO |
| 9 | `count` | `integer` | NO |
| 10 | `mine` | `bool` | NO |
| 11 | `created_at` | `timestamptz` | NO |
| 12 | `client_updated_at` | `timestamptz` | NO |

### Сущность: `evidence_vault`
| № | Колонка | Тип данных | Nullable |
|---|---------|------------|:--------:|
| 1 | `id` | `uuid` | NO |
| 2 | `user_id` | `uuid` | NO |
| 3 | `category_id` | `text` | NO |
| 4 | `title` | `text` | NO |
| 5 | `topic` | `text` | NO |
| 6 | `achieved_at` | `timestamptz` | NO |
| 7 | `status` | `text` | NO |
| 8 | `regulation` | `jsonb` | NO |
| 9 | `evidence` | `jsonb` | NO |
| 10 | `submission` | `jsonb` | NO |
| 11 | `submitted_at` | `timestamptz` | NO |
| 12 | `verified_at` | `timestamptz` | NO |
| 13 | `reviewer_note` | `text` | NO |
| 14 | `moderator_status` | `text` | NO |
| 15 | `tracking_code` | `text` | NO |
| 16 | `created_at` | `timestamptz` | NO |
| 17 | `updated_at` | `timestamptz` | NO |

### Сущность: `direct_messages`
| № | Колонка | Тип данных | Nullable |
|---|---------|------------|:--------:|
| 1 | `id` | `uuid` | NO |
| 2 | `client_id` | `text` | NO |
| 3 | `thread_key` | `text` | NO |
| 4 | `author_id` | `uuid` | NO |
| 5 | `recipient_id` | `uuid` | NO |
| 6 | `body` | `text` | NO |
| 7 | `attachment` | `jsonb` | NO |
| 8 | `reactions` | `jsonb` | NO |
| 9 | `is_read` | `bool` | NO |
| 10 | `is_system` | `bool` | NO |
| 11 | `sent_at` | `timestamptz` | NO |
| 12 | `created_at` | `timestamptz` | NO |
| 13 | `client_updated_at` | `timestamptz` | NO |

### Сущность: `call_sessions`
| № | Колонка | Тип данных | Nullable |
|---|---------|------------|:--------:|
| 1 | `id` | `uuid` | NO |
| 2 | `caller_id` | `uuid` | NO |
| 3 | `receiver_id` | `uuid` | NO |
| 4 | `status` | `text` | NO |
| 5 | `duration_seconds` | `integer` | NO |
| 6 | `started_at` | `timestamptz` | NO |
| 7 | `ended_at` | `timestamptz` | NO |
| 8 | `created_at` | `timestamptz` | NO |
| 9 | `updated_at` | `timestamptz` | NO |

### Сущность: `follows`
| № | Колонка | Тип данных | Nullable |
|---|---------|------------|:--------:|
| 1 | `id` | `uuid` | NO |
| 2 | `follower_id` | `uuid` | NO |
| 3 | `following_id` | `uuid` | NO |
| 4 | `created_at` | `timestamptz` | NO |

### Сущность: `friendships`
| № | Колонка | Тип данных | Nullable |
|---|---------|------------|:--------:|
| 1 | `id` | `uuid` | NO |
| 2 | `client_id` | `text` | NO |
| 3 | `user_id` | `uuid` | NO |
| 4 | `friend_id` | `uuid` | NO |
| 5 | `addressee_id` | `uuid` | NO |
| 6 | `requester_id` | `uuid` | NO |
| 7 | `status` | `friendship_status` | NO |
| 8 | `message` | `text` | NO |
| 9 | `mutual_count` | `integer` | NO |
| 10 | `client_updated_at` | `timestamptz` | NO |
| 11 | `created_at` | `timestamptz` | NO |
| 12 | `updated_at` | `timestamptz` | NO |

### Сущность: `scheduled_messages`
| № | Колонка | Тип данных | Nullable |
|---|---------|------------|:--------:|
| 1 | `id` | `uuid` | NO |
| 2 | `thread_key` | `text` | NO |
| 3 | `conversation_id` | `uuid` | NO |
| 4 | `author_id` | `uuid` | NO |
| 5 | `sender_id` | `uuid` | NO |
| 6 | `recipient_id` | `uuid` | NO |
| 7 | `body` | `text` | NO |
| 8 | `attachment` | `jsonb` | NO |
| 9 | `payload` | `jsonb` | NO |
| 10 | `scheduled_at` | `timestamptz` | NO |
| 11 | `delivered` | `bool` | NO |
| 12 | `delivered_at` | `timestamptz` | NO |
| 13 | `created_at` | `timestamptz` | NO |

### Сущность: `telegram_links`
| № | Колонка | Тип данных | Nullable |
|---|---------|------------|:--------:|
| 1 | `id` | `uuid` | NO |
| 2 | `user_id` | `uuid` | NO |
| 3 | `token` | `text` | NO |
| 4 | `used` | `bool` | NO |
| 5 | `created_at` | `timestamptz` | NO |
| 6 | `expires_at` | `timestamptz` | NO |

### Сущность: `ai_evaluations`
| № | Колонка | Тип данных | Nullable |
|---|---------|------------|:--------:|
| 1 | `id` | `uuid` | NO |
| 2 | `user_id` | `uuid` | NO |
| 3 | `day_id` | `uuid` | NO |
| 4 | `day_number` | `integer` | NO |
| 5 | `evaluation` | `jsonb` | NO |
| 6 | `feedback` | `text` | NO |
| 7 | `score` | `integer` | NO |
| 8 | `model` | `text` | NO |
| 9 | `provider` | `text` | NO |
| 10 | `created_at` | `timestamptz` | NO |
