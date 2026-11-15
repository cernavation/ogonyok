import type { ViewId } from './types'

export interface TourStep {
  id: number
  target: string
  title: string
  description: string
  requiresComposer?: boolean
  requiresDrawer?: boolean
  requiredView?: ViewId
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 1,
    target: 'composer-pride',
    title: 'Поле записи гордости',
    description:
      'Главное место в приложении. Записывай сюда свои победы и преодоления дня. Умная вставка сама разложит списки и ссылки.',
    requiresComposer: true,
  },
  {
    id: 2,
    target: 'composer-stars',
    title: 'Оценка преодоления',
    description:
      'Шкала от 1 до 10★. Оценивай внутреннее сопротивление и силу воли, которую ты приложил для выполнения каждого дела.',
    requiresComposer: true,
  },
  {
    id: 3,
    target: 'composer-gratitude',
    title: 'Благодарности дня',
    description:
      'Вторая половина баланса. Отмечай людей и события, которым ты благодарен сегодня, чтобы замечать хорошее вокруг.',
    requiresComposer: true,
  },
  {
    id: 4,
    target: 'composer-ai-eval',
    title: 'ИИ-оценка по тарифам',
    description:
      'Умный ментор проанализирует глубину преодоления, даст персональный разбор и подскажет, как не допустить выгорания.',
    requiresComposer: true,
  },
  {
    id: 5,
    target: 'composer-audience',
    title: 'Аудитория записи',
    description:
      'Ты решаешь, кто видит победу: только ты («Лично»), друзья в ленте, весь мир («Всем») или закрытые группы.',
    requiresComposer: true,
  },
  {
    id: 6,
    target: 'nav-streak',
    title: 'Твой стрик',
    description:
      'Счётчик прожитых дней летописи. В Огоньке стрик никогда не сгорает от пропуска — каждый закрытый день сохраняется навсегда.',
    requiresComposer: false,
    requiredView: 'home',
  },
  {
    id: 7,
    target: 'nav-friends',
    title: 'Друзья и группы',
    description:
      'Объединяйся с близкими по духу. Создавай закрытые сообщества («Семья», «Спортсмены»), чтобы расти и побеждать вместе.',
    requiresComposer: false,
    requiredView: 'home',
  },
  {
    id: 8,
    target: 'nav-messages',
    title: 'Чаты и звонки',
    description:
      'Удобный мессенджер в стиле Telegram: голосовые сообщения с расшифровкой, папки чатов и надёжные аудио/видеозвонки.',
    requiresComposer: false,
    requiredView: 'home',
  },
  {
    id: 9,
    target: 'nav-vault',
    title: 'Evidence Vault',
    description:
      'Неприступное хранилище доказательств. Прикрепляй фотофиксации, чеки и протоколы для верификации высших достижений.',
    requiresComposer: false,
    requiresDrawer: true,
    requiredView: 'home',
  },
  {
    id: 10,
    target: 'nav-analytics',
    title: 'Статистика и вехи',
    description:
      'Глубокая аналитика побед, динамика сфер жизни и празднование великих вех — 100, 200, 300 и 700 дней пути.',
    requiresComposer: false,
    requiresDrawer: true,
    requiredView: 'home',
  },
  {
    id: 11,
    target: 'nav-premium',
    title: 'Премиум возможности',
    description:
      'Неограниченная видеосвязь, полный разбор ментора Огонька, расширенная летопись и приоритетная верификация.',
    requiresComposer: false,
    requiresDrawer: true,
    requiredView: 'home',
  },
  {
    id: 12,
    target: 'nav-settings',
    title: 'Настройки и повтор тура',
    description:
      'Управление темами, звуками, приватностью и напоминаниями в Telegram. Здесь же всегда можно запустить этот тур заново.',
    requiresComposer: false,
    requiredView: 'home',
  },
  {
    id: 13,
    target: 'composer-save',
    title: 'Запиши первую гордость',
    description:
      'Твой путь начинается прямо сейчас. Сделай первый шаг: запиши хотя бы одно маленькое преодоление сегодняшнего дня!',
    requiresComposer: true,
  },
]
