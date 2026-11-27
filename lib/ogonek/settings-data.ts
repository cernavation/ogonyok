import {
  Bell,
  Database,
  Info,
  Lock,
  MessageSquare,
  Palette,
  Play,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react'
import type { ComponentType } from 'react'

export type SettingsSection =
  | 'profile'
  | 'appearance'
  | 'privacy'
  | 'notifications'
  | 'chats'
  | 'security'
  | 'data'
  | 'tariff'
  | 'tour'
  | 'about'

export interface SettingsSectionItem {
  id: SettingsSection
  label: string
  hint: string
  icon: ComponentType<{ size?: number; className?: string }>
}

export const SETTINGS_SECTIONS: readonly SettingsSectionItem[] = [
  {
    id: 'profile',
    label: 'Профиль',
    hint: 'Никнейм, имя, bio и сложность',
    icon: User,
  },
  {
    id: 'appearance',
    label: 'Внешний вид',
    hint: 'Тема, шрифт, плотность и звуки',
    icon: Palette,
  },
  {
    id: 'privacy',
    label: 'Приватность',
    hint: 'Кто находит, пишет, звонит и онлайн',
    icon: ShieldCheck,
  },
  {
    id: 'notifications',
    label: 'Уведомления',
    hint: 'Звуки, громкость и напоминания',
    icon: Bell,
  },
  {
    id: 'chats',
    label: 'Чаты',
    hint: 'Медиа, отправка и кэш диалогов',
    icon: MessageSquare,
  },
  {
    id: 'security',
    label: 'Безопасность',
    hint: 'ПИН-код, пароль и сессии',
    icon: Lock,
  },
  {
    id: 'data',
    label: 'Данные',
    hint: 'Экспорт, сброс и удаление',
    icon: Database,
  },
  {
    id: 'tariff',
    label: 'Тариф',
    hint: 'Free, Pro, Ultra и подписка',
    icon: Sparkles,
  },
  {
    id: 'tour',
    label: 'Тур',
    hint: 'Обучающий тур по 13 возможностям',
    icon: Play,
  },
  {
    id: 'about',
    label: 'О приложении',
    hint: 'Манифест, версия и соглашения',
    icon: Info,
  },
] as const
