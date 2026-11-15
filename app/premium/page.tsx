import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Премиум — Огонёк',
  description: 'Подписка и тарифы Огонька',
}

export default function PremiumRedirectPage() {
  redirect('/?modal=premium')
}
