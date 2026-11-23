/**
 * src/content/landing.ts
 * Multi-language content source for Priday Landing.
 * Backwards-compatible default exports (RU) + full i18n access.
 */

export * from './i18n'
import { getLandingContent } from './i18n'

const ruContent = getLandingContent('ru')

export const HERO_CONTENT = ruContent.hero
export const PRIDE_WHEEL_CONTENT = ruContent.prideWheel
export const HOW_IT_WORKS_CONTENT = ruContent.howItWorks
export const TEMPO_CONTENT = ruContent.tempo
export const AI_ANALYSIS_CONTENT = ruContent.aiAnalysis
export const FRIENDS_FAMILY_CONTENT = ruContent.friendsFamily
export const GLOBE_CONTENT = ruContent.globe
export const PRIVACY_CONTENT = ruContent.privacy
export const FACTS_CONTENT = ruContent.facts
export const PRICING_CONTENT = ruContent.pricing
export const FINAL_CTA_CONTENT = ruContent.finalCta
