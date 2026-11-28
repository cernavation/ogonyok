import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Премиум — Winlog',
  description: 'Подписка и тарифы Winlog',
}

export default function PremiumRedirectPage() {
  redirect('/?modal=premium')
}
