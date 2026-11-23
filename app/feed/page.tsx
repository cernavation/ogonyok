'use client'

import { useEffect } from 'react'

export default function FeedRedirectPage() {
  useEffect(() => {
    window.location.replace('/app')
  }, [])
  return (
    <div className="w-full min-h-screen bg-black flex items-center justify-center select-none">
      <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-[#ff6b35] animate-spin" />
    </div>
  )
}
