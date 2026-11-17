import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Премиум — Priday',
  description: 'Подписка и тарифы Priday',
}

export default function PremiumRedirectPage() {
  redirect('/?modal=premium')
}
