import path from 'node:path'

export const ROOT_DIR = process.cwd()

/** Five mandatory CONTRACT rule-2 viewports (1210x756 primary owner screen first). */
export const VIEWPORTS = [
  { name: '1210x756', label: '1210×756', width: 1210, height: 756, isMobile: false },
  { name: '1440x900', label: '1440×900', width: 1440, height: 900, isMobile: false },
  { name: '1024x768', label: '1024×768', width: 1024, height: 768, isMobile: false },
  { name: '820x1180', label: '820×1180', width: 820, height: 1180, isMobile: false },
  { name: '390x844', label: '390×844', width: 390, height: 844, isMobile: true },
]

export const PIXEL_DIFF_THRESHOLD = 0.003
export const MIN_TEXT_COLUMN_CHARS = 28
export const MIN_MOBILE_TAP_PX = 40
export const MAX_SIDEBAR_NAV_ITEMS = 10

export const THEMES = ['x-black', 'apple-light', 'dim']

export const SETTINGS_SECTIONS = [
  'appearance',
  'diary',
  'notifications',
  'privacy',
  'account',
  'guide',
]

export const STAGING_ACCOUNTS = {
  primary: {
    username: 'guard_primary',
    email: 'guard_primary@ogonek.local',
    password: 'GuardStaging#2026!Primary',
    displayName: 'Страж Основной',
  },
  peer: {
    username: 'guard_peer',
    email: 'guard_peer@ogonek.local',
    password: 'GuardStaging#2026!Peer',
    displayName: 'Алексей Тест',
  },
  empty: {
    username: 'guard_empty',
    email: 'guard_empty@ogonek.local',
    password: 'GuardStaging#2026!Empty',
    displayName: 'Пустой Профиль',
  },
}

/**
 * Full list of unauthenticated and authenticated screens/modals traversed by the guard.
 */
export const UNAUTH_SCREENS = [
  { id: 'landing', label: 'Гостевой лендинг', path: '/?view=landing' },
  { id: 'signin', label: 'Вход', path: '/' },
  { id: 'register', label: 'Регистрация', path: '/' },
  { id: 'privacy', label: 'Политика конфиденциальности', path: '/privacy' },
  { id: 'terms', label: 'Условия использования', path: '/terms' },
]

export const AUTH_SCREENS = [
  { id: 'home', label: 'Главная', nav: 'home' },
  { id: 'explore', label: 'Поиск', nav: 'explore' },
  { id: 'messages_list', label: 'Чаты (список)', nav: 'messages', sub: 'list' },
  { id: 'messages_chat', label: 'Чаты (открытый чат)', nav: 'messages', sub: 'chat' },
  { id: 'messages_group', label: 'Чаты (группа)', nav: 'messages', sub: 'group' },
  { id: 'profile', label: 'Профиль', nav: 'profile' },
  { id: 'vault', label: 'Evidence Vault', nav: 'vault' },
  { id: 'premium', label: 'Премиум', nav: 'premium' },
  { id: 'analytics', label: 'Статистика', nav: 'analytics' },
  { id: 'leaderboard', label: 'Рейтинг', nav: 'leaderboard' },
  { id: 'intentions', label: 'Намерения', nav: 'intentions' },
  ...SETTINGS_SECTIONS.map((section) => ({
    id: `settings_${section}`,
    label: `Настройки (${section})`,
    nav: 'settings',
    settingsSection: section,
  })),
  { id: 'modal_composer', label: 'Модалка: Композер дня', modal: 'composer' },
  { id: 'modal_day_menu', label: 'Модалка: Меню поста', modal: 'day_menu' },
  { id: 'modal_friends', label: 'Модалка: Друзья', modal: 'friends' },
  { id: 'modal_notifications', label: 'Модалка: Уведомления', modal: 'notifications' },
  { id: 'modal_call', label: 'Модалка: Звонок', modal: 'call' },
]

export const EMPTY_SCREENS = [
  { id: 'empty_home', label: 'Пустое состояние: Главная', nav: 'home' },
  { id: 'empty_vault', label: 'Пустое состояние: Evidence Vault', nav: 'vault' },
  { id: 'empty_messages', label: 'Пустое состояние: Чаты', nav: 'messages' },
]

export function getGuardPaths(rootDir = ROOT_DIR) {
  return {
    rootDir,
    guardDir: path.join(rootDir, 'tools', 'guard'),
    lockFile: path.join(rootDir, 'tools', 'guard', '.lock'),
    baselineDir: path.join(rootDir, 'baseline'),
    baselineLayout: path.join(rootDir, 'baseline', 'layout.json'),
    reviewDir: path.join(rootDir, 'review'),
    artifactsDir: path.join(rootDir, 'review', 'guard-artifacts'),
    diffsDir: path.join(rootDir, 'review', 'diffs'),
    reportMd: path.join(rootDir, 'review', 'guard-report.md'),
    reportJson: path.join(rootDir, 'review', 'guard-report.json'),
    stagingEnvFile: path.join(rootDir, '.env.staging.local'),
    prodEnvFile: path.join(rootDir, '.env.local'),
  }
}

export function parseCliArgs(argv = process.argv.slice(2)) {
  const opts = {
    baseline: false,
    selfTest: false,
    step: null,
    url: null,
    screen: null,
    allThemes: false,
    positional: [],
  }

  for (const arg of argv) {
    if (arg === '--baseline') opts.baseline = true
    else if (arg === '--self-test') opts.selfTest = true
    else if (arg === '--all-themes') opts.allThemes = true
    else if (arg.startsWith('--step=')) opts.step = arg.slice('--step='.length)
    else if (arg.startsWith('--url=')) opts.url = arg.slice('--url='.length)
    else if (arg.startsWith('--screen=')) opts.screen = arg.slice('--screen='.length)
    else if (!arg.startsWith('--')) opts.positional.push(arg)
  }
  return opts
}
