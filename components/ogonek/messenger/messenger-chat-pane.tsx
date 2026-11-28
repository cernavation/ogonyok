'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  BarChart3,
  Check,
  CheckSquare,
  Clock,
  Copy,
  FileText,
  Flame,
  Home,
  Image as ImageIcon,
  Megaphone,
  MoreVertical,
  Paperclip,
  Pencil,
  Plus,
  Reply,
  Search,
  Send,
  Smile,
  Sparkles,
  Trash2,
  Users,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react'
import { useOgonekStore, usePridayTyping } from '@/lib/ogonek/use-ogonek-store'
import { getFriend } from '@/lib/ogonek/friends'
import { usePresenceSnapshot, useUserPresenceStatus } from '@/lib/supabase/presence'
import {
  chatDayKey,
  formatChatDayLabel,
  getDirectThreadKey,
  isGroupThread,
  isPridayChat,
  isDeletableChat,
  QUICK_REPLIES,
  threadOf,
  threadTitle,
  unreadCount,
} from '@/lib/ogonek/messenger'
import { isFounderUser, PRIDAY_QUICK_ACTIONS } from '@/lib/ogonek/priday-system-chat'
import { canMessageUser } from '@/lib/ogonek/privacy'
import { resolveEmojiChar } from '@/lib/ogonek/reactions'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import type {
  ChatAttachment,
  ChatMessage,
  ChatMessageMedia,
  ChatMessageReply,
  ChatPoll,
} from '@/lib/ogonek/types'
import {
  extractDbGroupUuid,
  getCachedProfileSync,
  getFounderBroadcastStatsApi,
  getProfile,
  getDirectMessages,
  getGroupMessagesFromDb,
  markDirectMessagesAsRead,
  markGroupMessagesAsReadDb,
  type ProfileRecord,
} from '@/lib/supabase/api'
import { getSupabase } from '@/lib/supabase/client'
import { ChatAvatar, GroupAvatar } from './chat-avatar'
import { VerifiedBadge } from '../ui'
import { ChatContextMenu, type ContextMenuItem } from './chat-context-menu'
import { ChatMessageBubble } from './chat-message-bubble'
import { ChatPinnedBanner } from './chat-pinned-banner'
import { ChatSearchBar } from './chat-search-bar'
import { ChatSelectionToolbar } from './chat-selection-toolbar'
import { ForwardToChatModal } from './forward-to-chat-modal'
import { ChatGifModal } from './chat-gif-modal'
import { ChatPollCreatorModal } from './chat-poll-creator-modal'
import { ChatScheduleModal } from './chat-schedule-modal'
import { AttachCardPicker } from './attach-card-picker'
import { ChatAttachmentCard } from './chat-attachment-card'
import { FriendDetailModal } from '../friend-detail-modal'
import { GroupManagementModal } from './group-management-modal'
import { ChatMuteModal } from './chat-mute-modal'
import { ChatScheduledMessagesModal } from './chat-scheduled-messages-modal'
import {
  uploadChatMedia,
  extractFirstUrl,
  buildLinkPreview,
  detectChatMediaType,
  type ChatMediaType,
} from '@/lib/ogonek/chat-media-service'
import { canScheduleMessage } from '@/lib/ogonek/permissions'
import type { ChatLinkPreview } from '@/lib/ogonek/types'
import { Loader2, RefreshCw } from 'lucide-react'
import dynamic from 'next/dynamic'
import { Tooltip } from '../tooltip'

const ChatEmojiPicker = dynamic(
  () => import('./chat-emoji-picker').then((m) => m.ChatEmojiPicker),
  { ssr: false }
)

type Props = {
  friendId: string | null
  currentUserId?: string | null
  onBack?: () => void
  onNavigateHome?: () => void
  onNotify: (message: string) => void
  soundEnabled?: boolean
}

const PAGE_SIZE = 30

export function MessengerChatPane({
  friendId,
  currentUserId: currentUserIdProp,
  onBack,
  onNavigateHome,
  onNotify,
  soundEnabled = true,
}: Props) {
  const {
    state,
    currentUser,
    sendChatMessage,
    sendOfficialBroadcast,
    receiveIncomingChatMessage,
    updateIncomingChatMessage,
    removeDeletedChatMessage,
    reconcileThreadMessages,
    editChatMessage,
    deleteChatMessage,
    deleteChatThread,
    deleteChatMessages,
    togglePinChatMessage,
    toggleChatReaction,
    setChatDraft,
    markThreadRead,
    clearThreadMessages,
    toggleThreadMute,
    updateGroupMeta,
    addGroupMembers,
    removeGroupMember,
    setGroupMemberRole,
    leaveGroup,
    deleteGroup,
    muteChatThread,
    editScheduledMessage,
    cancelScheduledMessage,
    translateChatMessage,
    transcribeVoiceMessage,
    voteInPoll,
    toggleMessageLabel,
  } = useOgonekStore()

  // Состояние чата
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null)
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMatchIndex, setSearchMatchIndex] = useState(0)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [friendDetailOpen, setFriendDetailOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const [messageContextMenu, setMessageContextMenu] = useState<{
    x: number
    y: number
    message: ChatMessage
    isMine: boolean
  } | null>(null)

  // Модальные окна
  const [groupModalOpen, setGroupModalOpen] = useState(false)
  const [muteModalOpen, setMuteModalOpen] = useState(false)
  const [scheduledModalOpen, setScheduledModalOpen] = useState(false)
  const [gifModalOpen, setGifModalOpen] = useState(false)
  const [pollModalOpen, setPollModalOpen] = useState(false)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [attachOpen, setAttachOpen] = useState(false)
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [showQuickChips, setShowQuickChips] = useState(false)
  const [forwardModalData, setForwardModalData] = useState<{
    attachment: ChatAttachment | null
    note: string
  } | null>(null)

  // Вложения в черновике и загрузка медиа (без Base64)
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null)
  const [mediaAttachment, setMediaAttachment] = useState<ChatMessageMedia | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [linkPreview, setLinkPreview] = useState<ChatLinkPreview | null>(null)
  const [linkDismissed, setLinkDismissed] = useState(false)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [typingName, setTypingName] = useState<string | null>(null)
  const isPridayTyping = usePridayTyping()
  const [pridayComposerMode, setPridayComposerMode] = useState<'support' | 'broadcast'>('support')
  const [broadcastTotalUsers, setBroadcastTotalUsers] = useState<number | null>(null)
  const [broadcastConfirmOpen, setBroadcastConfirmOpen] = useState(false)
  const [broadcastSending, setBroadcastSending] = useState(false)

  const bodyRef = useRef<HTMLDivElement>(null)
  const headerMenuRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const threadChannelRef = useRef<any>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastFileRef = useRef<File | null>(null)
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const typingBroadcastTimerRef = useRef<number>(0)

  const [peerProfile, setPeerProfile] = useState<ProfileRecord | null>(null)

  const currentUserId = currentUserIdProp || state.auth?.activeAccountId || currentUser?.id || 'local-user'

  const targetPeerId = useMemo(() => {
    if (!friendId) return null
    if (friendId.includes('_')) {
      const parts = friendId.split('_')
      return (currentUserId && parts.find((p) => p !== currentUserId)) || parts[0]
    }
    return friendId
  }, [friendId, currentUserId])

  const thread = friendId ? threadOf(state.chatThreads ?? {}, friendId) : null
  const isGroup = friendId ? isGroupThread(thread ?? undefined, friendId) : false
  const isSaved = friendId === 'saved-messages'
  const isPriday = friendId ? isPridayChat(friendId) : false
  const isFounder = isFounderUser(state.profile?.username || currentUser?.username)
  const isBroadcastMode = isPriday && isFounder && pridayComposerMode === 'broadcast'
  const friend = targetPeerId && !isGroup && !isSaved && !isPriday ? getFriend(targetPeerId) : null
  const cachedPeerProfile =
    targetPeerId && !friend && !isGroup && !isSaved && !isPriday ? getCachedProfileSync(targetPeerId) : null
  const activePeerProfile = peerProfile || cachedPeerProfile
  const presenceSnap = usePresenceSnapshot()
  const peerStatus = useUserPresenceStatus(
    !isGroup && !isSaved && !isPriday ? targetPeerId : null,
    activePeerProfile?.last_seen_at ?? friend?.lastSeenAt ?? null
  )

  const isUuid = (s?: string | null) =>
    typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

  let title = isPriday
    ? 'Winlog'
    : isSaved
    ? 'Избранное'
    : friend
    ? friend.name
    : activePeerProfile?.display_name ||
      thread?.peerMeta?.name ||
      (activePeerProfile?.username
        ? `@${activePeerProfile.username}`
        : friendId
          ? threadTitle(friendId, thread ?? undefined)
          : '')

  if (isUuid(title) || (title === 'Собеседник' && (activePeerProfile?.username || thread?.peerMeta?.username))) {
    const uname = activePeerProfile?.username || thread?.peerMeta?.username
    title = uname ? `@${uname}` : 'Собеседник'
  }

  useEffect(() => {
    if (!isPriday) {
      setPridayComposerMode('support')
      setBroadcastConfirmOpen(false)
      return
    }
    if (!isFounder) return
    let active = true
    void getFounderBroadcastStatsApi().then((res) => {
      if (active && res.ok) {
        setBroadcastTotalUsers(res.totalUsers)
      }
    })
    return () => {
      active = false
    }
  }, [isPriday, isFounder, friendId])

  useEffect(() => {
    if (targetPeerId && !isGroup && !isSaved && !isPriday && isUuid(targetPeerId)) {
      const cached = getCachedProfileSync(targetPeerId)
      if (cached) setPeerProfile(cached)
      getProfile(targetPeerId).then((p) => {
        if (p) setPeerProfile(p)
      })
    } else {
      setPeerProfile(null)
    }
  }, [targetPeerId, isGroup, isSaved, isPriday])

  const dmPermission = useMemo(() => {
    if (isGroup || isSaved || isPriday || !targetPeerId || !activePeerProfile) {
      return { allowed: true as const, policy: 'everyone' as const }
    }
    const isMutualFriend = (state.friendIds ?? []).includes(targetPeerId)
    return canMessageUser({
      viewerId: currentUserId,
      targetProfile: activePeerProfile,
      isMutualFriend,
    })
  }, [isGroup, isSaved, isPriday, targetPeerId, activePeerProfile, state.friendIds, currentUserId])

  // Активировать поле ввода сообщения при открытии чата
  useEffect(() => {
    if (friendId) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus()
      }, 60)
      return () => clearTimeout(timer)
    }
  }, [friendId])

  const allMessages = thread?.messages ?? []
  const totalMessagesCount = allMessages.length
  const draft = thread?.draft ?? ''

  // Подгрузка истории
  const messages = useMemo(() => {
    if (visibleCount >= totalMessagesCount) return allMessages
    return allMessages.slice(totalMessagesCount - visibleCount)
  }, [allMessages, visibleCount, totalMessagesCount])

  // Закреплённое сообщение
  const pinnedMessage = useMemo(() => {
    if (!thread?.pinnedMessageId) return null
    return allMessages.find((m) => m.id === thread.pinnedMessageId) ?? null
  }, [allMessages, thread?.pinnedMessageId])

  // Административные права в группе
  const isCreator = thread?.groupMeta?.createdBy === currentUserId || thread?.groupMeta?.createdBy === 'me'
  const adminIds = thread?.groupMeta?.adminIds || (isCreator ? [currentUserId] : [])
  const isMeAdmin = !isGroup || isCreator || adminIds.includes(currentUserId) || thread?.groupMeta?.role === 'admin' || thread?.groupMeta?.role === 'owner'

  // Непрочитанные сообщения для разделителя и кнопки «Вниз»
  const unreadCountNumber = useMemo(() => {
    if (!thread || !thread.messages) return 0
    const readAtMs = thread.readAtISO ? new Date(thread.readAtISO).getTime() : 0
    return thread.messages.filter(
      (m) => m.authorId !== 'me' && !m.system && new Date(m.createdAtISO).getTime() > readAtMs
    ).length
  }, [thread])

  // Фиксируем якорное непрочитанное сообщение только в момент входа в чат, чтобы не мигать
  // плашкой «Новые сообщения» поверх живых ответов прямо внутри уже открытой переписки.
  const [firstUnreadMessageId, setFirstUnreadMessageId] = useState<string | null>(() => {
    if (!friendId || isPridayChat(friendId)) return null
    const initThread = threadOf(state.chatThreads ?? {}, friendId)
    if (!initThread.messages) return null
    const readAtMs = initThread.readAtISO ? new Date(initThread.readAtISO).getTime() : 0
    const firstUnread = initThread.messages.find(
      (m) => m && m.authorId !== 'me' && !m.system && !m.read && new Date(m.createdAtISO).getTime() > readAtMs
    )
    return firstUnread ? firstUnread.id : null
  })

  useEffect(() => {
    if (!friendId || isPridayChat(friendId)) {
      setFirstUnreadMessageId(null)
      return
    }
    const initThread = threadOf(state.chatThreads ?? {}, friendId)
    const readAtMs = initThread.readAtISO ? new Date(initThread.readAtISO).getTime() : 0
    const firstUnread = (initThread.messages ?? []).find(
      (m) => m && m.authorId !== 'me' && !m.system && !m.read && new Date(m.createdAtISO).getTime() > readAtMs
    )
    setFirstUnreadMessageId(firstUnread ? firstUnread.id : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendId])

  // Автоматическое определение ссылки в черновике
  useEffect(() => {
    if (linkDismissed || !draft) return
    const url = extractFirstUrl(draft)
    if (url && (!linkPreview || linkPreview.url !== url)) {
      setLinkPreview(buildLinkPreview(url))
    } else if (!url && linkPreview) {
      setLinkPreview(null)
    }
  }, [draft, linkDismissed, linkPreview])

  // Загрузка медиа в хранилище chat-media (без Base64)
  const processAndUploadMedia = async (file: File, explicitType?: ChatMediaType) => {
    lastFileRef.current = file
    abortControllerRef.current = new AbortController()
    setUploadProgress(10)
    setUploadError(null)

    const tempUrl = typeof window !== 'undefined' ? URL.createObjectURL(file) : ''
    setMediaAttachment({
      type: explicitType || (file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : 'file'),
      url: tempUrl,
      name: file.name,
      sizeBytes: file.size,
    })

    try {
      const res = await uploadChatMedia(file, {
        userId: currentUserId || 'me',
        threadId: friendId || 'general',
        fileName: file.name,
        mediaType: explicitType,
        signal: abortControllerRef.current.signal,
        onProgress: (p) => setUploadProgress(p.percent),
      })

      if (res.ok && res.url) {
        setMediaAttachment({
          type: res.type,
          url: res.url,
          name: res.name,
          sizeBytes: res.sizeBytes,
        })
        setUploadProgress(null)
        setUploadError(null)
        onNotify?.(`${res.type === 'image' ? 'Фото' : 'Файл'} «${file.name}» загружен`)
      } else {
        setUploadProgress(null)
        setUploadError(res.error || 'Ошибка загрузки')
        onNotify?.(res.error || 'Ошибка загрузки файла')
      }
    } catch (err: any) {
      setUploadProgress(null)
      setUploadError(err?.message || 'Сбой сети при отправке')
    }
  }

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setUploadProgress(null)
    setUploadError(null)
    setMediaAttachment(null)
    onNotify?.('Загрузка отменена')
  }

  const retryUpload = () => {
    if (lastFileRef.current) {
      processAndUploadMedia(lastFileRef.current)
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          processAndUploadMedia(file, 'image')
          return
        }
      }
    }

    const text = e.clipboardData?.getData('text')
    if (text) {
      const url = extractFirstUrl(text)
      if (url) {
        setLinkDismissed(false)
        setLinkPreview(buildLinkPreview(url))
      }
    }
  }

  const broadcastTyping = () => {
    const now = Date.now()
    if (now - typingBroadcastTimerRef.current > 2000) {
      typingBroadcastTimerRef.current = now
      const ch = threadChannelRef.current
      if (ch) {
        ch.send({
          type: 'broadcast',
          event: 'typing',
          payload: { userId: currentUserId, name: currentUser?.displayName || currentUser?.username || 'Собеседник' },
        }).catch?.(() => {})
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDraggingOver) setIsDraggingOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setIsDraggingOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(false)
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleUnifiedFile(files[0])
    }
  }

  // Закрытие выпадающего меню «⋮» по клику снаружи (mousedown) и клавише Escape
  useEffect(() => {
    if (!menuOpen) return
    const handlePointerDown = (e: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [menuOpen])

  const groupDbUuid = useMemo(
    () => (isGroup ? extractDbGroupUuid(thread?.groupMeta?.dbId) || extractDbGroupUuid(friendId) : null),
    [isGroup, thread?.groupMeta?.dbId, friendId]
  )

  // Загрузка и сверка сообщений из базы Supabase при открытии диалога или группы (источник истины)
  useEffect(() => {
    if (!friendId || !currentUserId || isSaved || isPriday) return
    let cancelled = false

    if (isGroup) {
      if (!groupDbUuid) return
      getGroupMessagesFromDb([groupDbUuid])
        .then((dbMessages) => {
          if (cancelled || !Array.isArray(dbMessages)) return
          reconcileThreadMessages(friendId, dbMessages)
        })
        .catch(() => {})
    } else {
      getDirectMessages(currentUserId, friendId)
        .then((dbMessages) => {
          if (cancelled || !Array.isArray(dbMessages)) return
          reconcileThreadMessages(friendId, dbMessages)
        })
        .catch(() => {})
    }

    return () => {
      cancelled = true
    }
  }, [friendId, currentUserId, isGroup, groupDbUuid, isSaved, isPriday, reconcileThreadMessages])

  // Пометка прочитанным при открытии (в локальном сторе и в Supabase — для ЛС и для групп через read_by)
  useEffect(() => {
    if (friendId) {
      markThreadRead(friendId)
      if (currentUserId && !isSaved && !isPriday) {
        if (isGroup && groupDbUuid) {
          markGroupMessagesAsReadDb(groupDbUuid, currentUserId).catch(() => {})
        } else if (!isGroup) {
          markDirectMessagesAsRead(currentUserId, friendId).catch(() => {})
        }
      }
    }
  }, [friendId, allMessages.length, markThreadRead, currentUserId, isGroup, groupDbUuid, isSaved, isPriday])

  // 1. Жизненный цикл Supabase Realtime подписки на сообщения диалога / группы (INSERT / UPDATE / DELETE)
  useEffect(() => {
    if (!friendId || !currentUserId || isSaved || isPriday) return
    if (isGroup && !groupDbUuid) return

    const supabase = getSupabase()
    if (!supabase) return

    const threadKey = isGroup && groupDbUuid
      ? `group:group-${groupDbUuid}`
      : getDirectThreadKey(currentUserId, friendId)
    const channelName = `chat_${threadKey}_${Math.random().toString(36).slice(2, 8)}`

    const channel = supabase.channel(channelName)
    threadChannelRef.current = channel

    const matchesThisThread = (record: any) => {
      if (!record?.thread_key) return false
      if (isGroup && groupDbUuid) {
        return extractDbGroupUuid(record.thread_key) === groupDbUuid
      }
      return record.thread_key === threadKey
    }

    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        ...(isGroup ? {} : { filter: `thread_key=eq.${threadKey}` }),
      },
      (payload) => {
        if (payload?.new && matchesThisThread(payload.new)) {
          receiveIncomingChatMessage(payload.new as any)
          if (isGroup && groupDbUuid) {
            markGroupMessagesAsReadDb(groupDbUuid, currentUserId).catch(() => {})
          } else {
            markDirectMessagesAsRead(currentUserId, friendId).catch(() => {})
          }
        }
      }
    )

    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'direct_messages',
        ...(isGroup ? {} : { filter: `thread_key=eq.${threadKey}` }),
      },
      (payload) => {
        if (payload?.new && matchesThisThread(payload.new)) {
          updateIncomingChatMessage(payload.new as any)
        }
      }
    )

    channel.on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'direct_messages',
      },
      (payload) => {
        const oldId = (payload?.old as any)?.id
        if (oldId) {
          removeDeletedChatMessage(oldId)
        }
      }
    )

    channel.on('broadcast', { event: 'typing' }, (payload: any) => {
      if (payload?.payload?.userId && payload.payload.userId !== currentUserId) {
        setTypingName(payload.payload.name || 'Собеседник')
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
        typingTimerRef.current = setTimeout(() => {
          setTypingName(null)
        }, 3000)
      }
    })

    channel.subscribe()

    return () => {
      threadChannelRef.current = null
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      supabase.removeChannel(channel)
    }
  }, [
    friendId,
    currentUserId,
    isGroup,
    isSaved,
    receiveIncomingChatMessage,
    updateIncomingChatMessage,
    removeDeletedChatMessage,
  ])

  // Автопрокрутка вниз при новом сообщении и появлении индикатора печатания
  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [allMessages.length, isPridayTyping, typingName])

  // Авторесайз текстового поля ввода
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const newHeight = Math.min(el.scrollHeight, 160)
    el.style.height = `${Math.max(newHeight, 36)}px`
  }, [draft])

  const handleScroll = () => {
    const el = bodyRef.current
    if (!el) return
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setShowScrollBottom(distanceToBottom > 160)
  }

  const scrollToBottom = () => {
    const el = bodyRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }

  const scrollToMessage = (msgId: string) => {
    const idx = allMessages.findIndex((m) => m.id === msgId)
    if (idx >= 0 && idx < totalMessagesCount - visibleCount) {
      setVisibleCount(totalMessagesCount)
    }
    setTimeout(() => {
      const el = document.getElementById(`msg-${msgId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('pulse-highlight')
        setTimeout(() => el.classList.remove('pulse-highlight'), 1600)
      }
    }, 120)
  }

  // Группировка сообщений по дням
  const groups = useMemo(() => {
    const result: Array<{ key: string; label: string; items: ChatMessage[] }> = []
    for (const msg of (messages || [])) {
      if (!msg) continue
      const iso = msg.createdAtISO || new Date().toISOString()
      const key = chatDayKey(iso) || 'today'
      const current = result[result.length - 1]
      if (current && current.key === key) {
        current.items.push(msg)
      } else {
        result.push({ key, label: formatChatDayLabel(iso) || 'Сегодня', items: [msg] })
      }
    }
    return result
  }, [messages])

  // Отправка сообщения
  const canSend = draft.trim().length > 0 || Boolean(attachment) || Boolean(mediaAttachment)

  const handleSend = (options?: { silent?: boolean; scheduledForISO?: string | null }) => {
    if (!friendId) return
    if (editingMessage) {
      if (draft.trim()) {
        editChatMessage(friendId, editingMessage.id, draft.trim())
        onNotify('Сообщение изменено')
        setEditingMessage(null)
        setChatDraft(friendId, '')
      }
      return
    }

    if (!canSend) return
    if (isBroadcastMode && !options?.scheduledForISO) {
      if (uploadProgress !== null) {
        onNotify('Дождитесь завершения загрузки изображения')
        return
      }
      if (attachment || (mediaAttachment && mediaAttachment.type !== 'image')) {
        onNotify('Для официальной рассылки поддерживаются текст и изображение')
        return
      }
      if (
        mediaAttachment?.url &&
        (/^blob:/i.test(mediaAttachment.url) || /^data:/i.test(mediaAttachment.url))
      ) {
        onNotify('Изображение ещё загружается или имеет неподдерживаемый формат')
        return
      }
      setBroadcastConfirmOpen(true)
      return
    }
    if (!dmPermission.allowed) {
      onNotify(dmPermission.reason || 'Отправка сообщений ограничена настройками приватности')
      return
    }

    const replyPayload: ChatMessageReply | null = replyingTo
      ? {
          id: replyingTo.id,
          authorId: replyingTo.authorId,
          text: replyingTo.text || replyingTo.attachment?.title || 'Вложение',
          attachmentSnippet: replyingTo.attachment?.title,
        }
      : null

    try {
      sendChatMessage(friendId, draft.trim(), attachment, {
        replyTo: replyPayload,
        media: mediaAttachment,
        linkPreview: linkPreview,
        silent: options?.silent,
        scheduledForISO: options?.scheduledForISO,
      })
    } catch (err) {
      console.warn('[Ogonek] Send message error:', err)
      onNotify('Не удалось отправить сообщение')
    }

    setFirstUnreadMessageId(null)
    playSuccess(soundEnabled)
    setChatDraft(friendId, '')
    setAttachment(null)
    setMediaAttachment(null)
    setLinkPreview(null)
    setLinkDismissed(false)
    setReplyingTo(null)
    setShowQuickChips(false)
  }

  const handleConfirmBroadcastSend = async () => {
    if (!friendId || !isBroadcastMode || broadcastSending) return
    if (uploadProgress !== null) {
      onNotify('Дождитесь завершения загрузки изображения')
      return
    }
    const imageUrl = mediaAttachment?.type === 'image' ? mediaAttachment.url : null
    if (!draft.trim() && !imageUrl) {
      onNotify('Введите текст объявления или прикрепите изображение')
      return
    }

    setBroadcastSending(true)
    try {
      const res = await sendOfficialBroadcast(draft.trim(), imageUrl)
      if (!res.ok) {
        onNotify(res.error || 'Не удалось опубликовать рассылку')
        return
      }
      if (typeof res.totalUsers === 'number') {
        setBroadcastTotalUsers(res.totalUsers)
      }
      setFirstUnreadMessageId(null)
      playSuccess(soundEnabled)
      setChatDraft(friendId, '')
      setAttachment(null)
      setMediaAttachment(null)
      setLinkPreview(null)
      setLinkDismissed(false)
      setReplyingTo(null)
      setBroadcastConfirmOpen(false)
      onNotify(
        typeof res.totalUsers === 'number'
          ? `Рассылка отправлена на ${res.totalUsers} аккаунтов`
          : 'Официальная рассылка опубликована'
      )
    } finally {
      setBroadcastSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    } else if (e.key === 'Escape') {
      if (uploadProgress !== null) {
        cancelUpload()
      } else if (linkPreview) {
        setLinkPreview(null)
        setLinkDismissed(true)
      } else if (mediaAttachment) {
        setMediaAttachment(null)
      } else if (replyingTo) {
        setReplyingTo(null)
      } else if (editingMessage) {
        setEditingMessage(null)
        if (friendId) setChatDraft(friendId, '')
      }
    } else if (e.key === 'ArrowUp' && !draft.trim() && friendId) {
      // Редактировать последнее моё сообщение
      for (let i = allMessages.length - 1; i >= 0; i--) {
        if (allMessages[i].authorId === 'me' && allMessages[i].text) {
          setEditingMessage(allMessages[i])
          setChatDraft(friendId, allMessages[i].text)
          break
        }
      }
    }
  }

  // Единая загрузка фото, видео или документа (в бакет chat-media Supabase Storage)
  const handleUnifiedFile = (e: React.ChangeEvent<HTMLInputElement> | File) => {
    const file = e instanceof File ? e : e.target.files?.[0]
    if (!(e instanceof File) && e.target) e.target.value = ''
    if (!file) return

    if (file.size > 50 * 1024 * 1024) {
      onNotify('Файл слишком велик (максимум 50 МБ)')
      return
    }

    const mediaType = detectChatMediaType(file)
    processAndUploadMedia(file, mediaType)
  }

  // Если диалог не выбран — красивое пустое состояние на весь экран
  if (!friendId) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 bg-[var(--bg)] text-center select-none relative">
        {onNavigateHome && (
          <div className="absolute top-4 left-4 z-10">
            <button
              type="button"
              onClick={onNavigateHome}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-[var(--bg-elev)] hover:bg-[var(--bg-hover)] text-[var(--text)] border border-[var(--border)] transition-colors shadow-sm"
              aria-label="Назад в ленту"
            >
              <ArrowLeft size={16} />
              <span>Назад в ленту</span>
            </button>
          </div>
        )}
        <div className="w-20 h-20 rounded-full bg-[var(--bg-elev)] border border-[var(--border)] flex items-center justify-center text-4xl shadow-lg mb-4">
          💬
        </div>
        <h2 className="text-2xl sm:text-3xl font-[800] text-[var(--text)] mb-2 tracking-tight">
          Выберите диалог или начните новый чат
        </h2>
        <p className="text-sm text-[var(--text-2)] max-w-sm mb-6 leading-relaxed">
          Общайтесь с друзьями, делитесь карточками гордости, файлами, GIF и ставьте реакции к победам.
        </p>
      </div>
    )
  }

  const groupMemberIds = thread?.groupMeta?.memberIds ?? []
  const groupMemberCount = groupMemberIds.length > 0 ? groupMemberIds.length : 1
  const groupOnlineCount = groupMemberIds.filter((id) => presenceSnap.onlineIds.has(id)).length

  return (
    <div
      className="flex-1 h-full flex flex-col bg-[var(--bg)] relative select-text min-w-0"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Драг-энд-дроп оверлей */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-[var(--bg)]/90 backdrop-blur-sm border-2 border-dashed border-[var(--accent)] flex flex-col items-center justify-center gap-3 p-6 pointer-events-none animate-in fade-in">
          <div className="w-16 h-16 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shadow-inner">
            <Paperclip size={32} />
          </div>
          <p className="text-base font-bold text-[var(--text)]">Перетащите файл сюда</p>
          <p className="text-xs text-[var(--text-2)]">Фото, видео или документ для отправки в чат</p>
        </div>
      )}

      {/* Единый скрытый файловый инпут для фото, видео и документов */}
      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,application/*"
        className="hidden"
        onChange={handleUnifiedFile}
      />

      {/* 1. ШАПКА 72px: прозрачная с backdrop-blur-md, аватар 44px, имя 20px/800 + галочка, 3 кнопки 44px с рамкой 1px */}
      <header className="h-[72px] px-4 sm:px-6 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-md sticky top-0 z-30 shrink-0 gap-3">
        {/* Левая часть: кнопка Назад (на планшетах/мобильных) + Аватар + Имя со статусом */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="lg:hidden w-10 h-10 rounded-full flex items-center justify-center hover:bg-[var(--bg-hover)] text-[var(--text-2)] hover:text-[var(--text)] transition-colors shrink-0 -ml-1"
              aria-label="Назад к списку чатов"
              title="Назад к списку чатов"
            >
              <ArrowLeft size={20} />
            </button>
          )}

          {/* Аватар + Имя со статусом (для группы кликабельно → открывает панель «О группе») */}
          <div
            onClick={
              isGroup
                ? () => {
                    playClick(soundEnabled)
                    setGroupModalOpen(true)
                  }
                : undefined
            }
            role={isGroup ? 'button' : undefined}
            tabIndex={isGroup ? 0 : undefined}
            onKeyDown={
              isGroup
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setGroupModalOpen(true)
                    }
                  }
                : undefined
            }
            title={isGroup ? 'Информация и управление группой' : undefined}
            className={`flex items-center gap-3 min-w-0 flex-1 ${
              isGroup ? 'cursor-pointer rounded-xl py-1 px-1.5 -mx-1.5 hover:bg-white/[0.04] transition-colors' : ''
            }`}
          >
            <div className="relative shrink-0 w-[40px] h-[40px] sm:w-[44px] sm:h-[44px] flex items-center justify-center">
              {isSaved ? (
                <div className="w-[40px] h-[40px] sm:w-[44px] sm:h-[44px] rounded-full bg-[var(--accent)] border border-[var(--line)] flex items-center justify-center text-lg sm:text-xl text-white">
                  ⭐️
                </div>
              ) : isGroup ? (
                <GroupAvatar group={thread?.groupMeta} size={42} />
              ) : (
                <ChatAvatar friendId={friendId} size={40} ringColor="var(--bg)" />
              )}
            </div>

            {/* Имя и статус: обрезается через ... и НИКОГДА не наезжает на кнопки */}
            <div className="flex flex-col min-w-0 flex-1 justify-center">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[16px] sm:text-[20px] font-[800] text-[var(--text)] truncate leading-tight">
                  {title}
                </span>
                {(isPriday || friend?.verified || activePeerProfile?.verified || thread?.peerMeta?.verified) && (
                  <VerifiedBadge size="sm" />
                )}
              </div>

              <span className="text-[12px] sm:text-[14px] text-[var(--text-2)] truncate leading-tight block">
                {typingName ? (
                  <span className="text-[var(--accent)] font-semibold inline-flex items-center gap-1 animate-pulse">
                    <span>{typingName} печатает</span>
                    <span className="tracking-widest">…</span>
                  </span>
                ) : isPriday && isPridayTyping ? (
                  <span
                    data-testid="priday-header-typing"
                    className="text-[#d76737] font-semibold inline-flex items-center gap-1 animate-pulse"
                  >
                    <span>печатает...</span>
                  </span>
                ) : isPriday ? (
                  'официальный аккаунт · @winlog.life'
                ) : isSaved ? (
                  'Личные заметки и сохранённое'
                ) : isGroup ? (
                  `${groupMemberCount} участников${groupOnlineCount > 0 ? `, ${groupOnlineCount} в сети` : ''}`
                ) : (
                  <span className={peerStatus.isOnline ? 'text-[#00ba7c] font-medium' : ''}>
                    {peerStatus.label}
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Правая часть: кнопка меню «⋮» */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          <div className="relative" ref={headerMenuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="w-[36px] h-[36px] sm:w-[44px] sm:h-[44px] rounded-full border border-[var(--border)] bg-[var(--bg-elev)] hover:bg-[var(--bg-hover)] text-[var(--text)] flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm"
              aria-label="Меню чата"
              title="Меню чата"
            >
              <MoreVertical size={16} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-white/[0.14] bg-[#060608] p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 text-xs font-medium">
                {isGroup && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      setGroupModalOpen(true)
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-white hover:bg-white/[0.06] cursor-pointer"
                  >
                    <Users size={15} className="text-[#d76737]" /> Управление группой
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSearchOpen((v) => !v)
                    setMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-white hover:bg-white/[0.06] cursor-pointer"
                >
                  <Search size={15} /> Поиск по чату
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nowMuted = toggleThreadMute(friendId)
                    setMenuOpen(false)
                    onNotify(nowMuted ? 'Уведомления отключены' : 'Уведомления включены')
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-white hover:bg-white/[0.06] cursor-pointer"
                >
                  {thread?.muted ? <Volume2 size={15} /> : <VolumeX size={15} />}
                  {thread?.muted ? 'Включить уведомления' : 'Отключить уведомления'}
                </button>
                {isDeletableChat(friendId) && (
                  <>
                    <div className="h-[1px] bg-white/[0.1] my-1" />
                    <button
                      type="button"
                      onClick={async () => {
                        setMenuOpen(false)
                        if (window.confirm('Очистить всю историю этого чата?')) {
                          await clearThreadMessages(friendId)
                          onNotify('История переписки очищена')
                        }
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-white hover:bg-white/[0.06] cursor-pointer"
                    >
                      <Trash2 size={15} /> Очистить историю
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setMenuOpen(false)
                        if (window.confirm(`Удалить чат «${title}» навсегда?`)) {
                          await deleteChatThread(friendId)
                          onNotify('Чат удалён')
                          onBack?.()
                        }
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                    >
                      <Trash2 size={15} /> Удалить чат
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Поиск по сообщениям */}
      {searchOpen && (
        <ChatSearchBar
          query={searchQuery}
          onChangeQuery={setSearchQuery}
          currentIndex={searchMatchIndex}
          totalMatches={0}
          onPrev={() => {}}
          onNext={() => {}}
          onClose={() => {
            setSearchOpen(false)
            setSearchQuery('')
          }}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Баннер закреплённого сообщения */}
      {pinnedMessage && (
        <ChatPinnedBanner
          message={pinnedMessage}
          onJumpToMessage={scrollToMessage}
          onUnpin={() => togglePinChatMessage(friendId, pinnedMessage.id)}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Панель массового выбора сообщений */}
      {isSelectionMode && (
        <ChatSelectionToolbar
          selectedCount={selectedMessageIds.length}
          onDelete={() => {
            deleteChatMessages(friendId, selectedMessageIds)
            setSelectedMessageIds([])
            setIsSelectionMode(false)
            onNotify('Выбранные сообщения удалены')
          }}
          onForward={() => {
            onNotify('Пересылка сообщений...')
            setSelectedMessageIds([])
            setIsSelectionMode(false)
          }}
          onCancel={() => {
            setSelectedMessageIds([])
            setIsSelectionMode(false)
          }}
        />
      )}

      {/* 2. ЛЕНТА СООБЩЕНИЙ: центрирована, макс. ширина 820px */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scroll-smooth"
        ref={bodyRef}
        onScroll={handleScroll}
      >
        <div className="w-full max-w-[820px] mx-auto flex flex-col justify-end min-h-full">
          {/* Подгрузка более ранней истории */}
          {totalMessagesCount > visibleCount && (
            <div className="flex justify-center py-2 mb-2">
              <button
                type="button"
                onClick={() => setVisibleCount((v) => Math.min(totalMessagesCount, v + PAGE_SIZE))}
                className="rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-1.5 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--bg-hover)] shadow-sm transition-colors"
              >
                Загрузить более ранние сообщения ({totalMessagesCount - visibleCount})
              </button>
            </div>
          )}

          {allMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center my-auto">
              <ChatAvatar friendId={friendId} size={72} ringColor="var(--border)" />
              <p className="text-lg font-bold text-[var(--text)] mt-3">{title || 'Чат'}</p>
              <p className="text-xs text-[var(--text-2)] max-w-sm mt-1">
                {isGroup ? thread?.groupMeta?.description : friend?.bio || 'Начало переписки в Winlog.'}
              </p>
              <p className="text-xs text-[var(--accent)] font-semibold mt-4">
                Это начало вашей истории. Отправьте «Держим огонь 🔥» или поделитесь победой!
              </p>
            </div>
          ) : (
            (groups || []).map((group) => {
              if (!group) return null
              return (
                <div key={group.key} className="w-full flex flex-col space-y-1">
                  {/* Разделитель дня: отдельная центрированная строка на всю ширину */}
                  <div className="w-full flex justify-center my-4 sticky top-2 z-10 pointer-events-none select-none clear-both">
                    <span className="inline-flex items-center justify-center rounded-full bg-[var(--bg-elev)]/90 px-4 py-1 text-[12px] font-bold text-[var(--text-2)] backdrop-blur-md border border-[var(--border)] shadow-sm pointer-events-auto">
                      {group.label}
                    </span>
                  </div>

                  {/* Сообщения дня */}
                  <div className="w-full flex flex-col space-y-1">
                    {(group.items || []).map((msg, idx) => {
                      if (!msg) return null
                      const prev = group.items[idx - 1]
                      const next = group.items[idx + 1]
                      const isFirstInGroup = !prev || prev.authorId !== msg.authorId
                      const isLastInGroup = !next || next.authorId !== msg.authorId
                      const isMineMsg = msg.authorId === 'me' || (Boolean(currentUserId) && msg.authorId === currentUserId)

                      return (
                        <React.Fragment key={msg.id}>
                          {msg.id === firstUnreadMessageId && (
                            <div
                              className="w-full flex items-center gap-3 my-3 select-none pointer-events-none"
                              data-testid="unread-divider"
                            >
                              <div className="flex-1 h-[1px] bg-[var(--accent)]/40" />
                              <span className="text-[11px] font-bold text-[var(--accent)] bg-[var(--accent-soft)] px-3 py-0.5 rounded-full border border-[var(--accent)]/30 uppercase tracking-wider">
                                Новые сообщения
                              </span>
                              <div className="flex-1 h-[1px] bg-[var(--accent)]/40" />
                            </div>
                          )}
                          <ChatMessageBubble
                            message={msg}
                            isMine={isMineMsg}
                            resolveChar={(emojiId) => resolveEmojiChar(emojiId, state.customEmojis)}
                            customEmojis={state.customEmojis}
                            onToggleReaction={(emojiId) => toggleChatReaction(friendId, msg.id, emojiId)}
                            onForward={(m) => setForwardModalData({ attachment: m.attachment, note: m.text })}
                            onReply={(m) => setReplyingTo(m)}
                            onEdit={(m) => {
                              setEditingMessage(m)
                              setChatDraft(friendId, m.text)
                              textareaRef.current?.focus()
                            }}
                            onPin={(id) => togglePinChatMessage(friendId, id)}
                            onDelete={(id, forEveryone) => deleteChatMessage(friendId, id, forEveryone)}
                            onJumpToReply={scrollToMessage}
                            onTranslate={(id, text, lang) => translateChatMessage(friendId, id, lang || 'ru', text)}
                            onTranscribe={(id, transcript) => transcribeVoiceMessage(friendId, id, transcript)}
                            onVotePoll={(id, pIdx) => voteInPoll(friendId, id, pIdx)}
                            onToggleLabel={(id, label) => toggleMessageLabel(friendId, id, label)}
                            isSelectionMode={isSelectionMode}
                            isSelected={selectedMessageIds.includes(msg.id)}
                            onToggleSelect={(id) => {
                              setSelectedMessageIds((ids) =>
                                ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]
                              )
                            }}
                            isGroup={isGroup}
                            showAuthorHeader={isGroup}
                            isFirstInGroup={isFirstInGroup}
                            isLastInGroup={isLastInGroup}
                            searchQuery={searchQuery}
                            soundEnabled={soundEnabled}
                            canDeleteBroadcast={isFounder}
                            onNotify={onNotify}
                            onContextMenu={(e, targetMsg) => {
                              setMessageContextMenu({
                                x: e.clientX,
                                y: e.clientY,
                                message: targetMsg,
                                isMine: isMineMsg,
                              })
                            }}
                          />
                        </React.Fragment>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}

          {/* Живой индикатор печатания (три пульсирующие точки в тёмном пузырьке) */}
          {((isPriday && isPridayTyping) || (!isPriday && Boolean(typingName))) && (
            <div
              data-testid={isPriday ? 'priday-typing-indicator' : 'peer-typing-indicator'}
              className="flex items-end gap-2 mt-2 mb-1 animate-in fade-in slide-in-from-bottom-1 duration-200"
              aria-live="polite"
              aria-label={isPriday ? 'Winlog печатает...' : `${typingName} печатает...`}
            >
              <div className="shrink-0 mb-0.5">
                <ChatAvatar friendId={friendId} size={28} showPresence={false} ringColor="var(--bg)" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-bl-sm bg-[#0d0e12] border border-white/[0.12] shadow-sm">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-white/80 animate-bounce"
                  style={{ animationDelay: '0ms', animationDuration: '900ms' }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-white/80 animate-bounce"
                  style={{ animationDelay: '160ms', animationDuration: '900ms' }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-white/80 animate-bounce"
                  style={{ animationDelay: '320ms', animationDuration: '900ms' }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Кнопка прокрутки вниз */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute right-6 bottom-24 z-20 w-11 h-11 rounded-full bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--text)] flex items-center justify-center shadow-2xl hover:bg-[var(--bg-hover)] active:scale-95 transition-all relative"
          aria-label="Вниз к новым сообщениям"
        >
          <ArrowDown size={18} />
          {unreadCountNumber > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 rounded-full bg-[var(--accent)] text-[var(--accent-text)] text-[10px] font-extrabold flex items-center justify-center shadow-md animate-in zoom-in-75"
              data-testid="scroll-bottom-badge"
            >
              {unreadCountNumber > 99 ? '99+' : unreadCountNumber}
            </span>
          )}
        </button>
      )}

      {/* 3. ПАНЕЛЬ ВВОДА ВНИЗУ (как на скриншоте X):
          Слева круглые 44px кнопки с рамкой 1px: «+» (вложения), «GIF», «😊».
          Затем поле-пилюля flex:1 (мин 48px), плейсхолдер короткий «Написать сообщение».
          Внутри поля справа микрофон (превращается в стрелку отправки, когда есть текст).
      */}
      <div className="w-full border-t border-[var(--border)] bg-[var(--bg)] px-3 sm:px-6 py-2.5 shrink-0 z-20">
        <div className="w-full max-w-[820px] mx-auto flex flex-col gap-1.5">
          {/* Полоска ответа / редактирования / пересылки */}
          {replyingTo && (
            <div className="flex items-center justify-between border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1.5 rounded-r-xl">
              <div className="flex items-center gap-2 min-w-0">
                <Reply size={15} className="text-[var(--accent)] shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-[var(--accent)] leading-tight">
                    В ответ {replyingTo.authorId === 'me' ? 'себе' : title}
                  </p>
                  <p className="truncate text-xs text-[var(--text)] opacity-90 leading-tight">
                    {replyingTo.text || replyingTo.attachment?.title || 'Вложение'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)]"
                aria-label="Отменить ответ"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {editingMessage && (
            <div className="flex items-center justify-between border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1.5 rounded-r-xl">
              <div className="flex items-center gap-2 min-w-0">
                <Pencil size={15} className="text-[var(--accent)] shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-[var(--accent)] leading-tight">
                    Редактирование сообщения
                  </p>
                  <p className="truncate text-xs text-[var(--text)] opacity-90 leading-tight">
                    {editingMessage.text}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingMessage(null)
                  setChatDraft(friendId, '')
                }}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)]"
                aria-label="Отменить редактирование"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Превью прикреплённой карточки */}
          {attachment && (
            <div className="relative mb-1 rounded-xl p-1 bg-[var(--bg-elev)] border border-[var(--border)] flex items-center justify-between">
              <ChatAttachmentCard attachment={attachment} compact />
              <button
                type="button"
                onClick={() => setAttachment(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)]"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {/* Превью ссылки */}
          {linkPreview && !linkDismissed && (
            <div className="relative mb-1 p-2 rounded-xl bg-[var(--bg-elev)] border border-[var(--border)] flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center shrink-0">
                  <Sparkles size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold text-[var(--accent)] leading-tight">Ссылка</p>
                  <p className="truncate text-xs font-semibold text-[var(--text)]">{linkPreview.title || linkPreview.url}</p>
                  <p className="truncate text-[10px] text-[var(--text-2)]">{linkPreview.url}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLinkDismissed(true)
                  setLinkPreview(null)
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)]"
                aria-label="Закрыть превью ссылки"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {/* Превью медиа-файла */}
          {mediaAttachment && (
            <div className="relative mb-1 p-2.5 rounded-xl bg-[var(--bg-elev)] border border-[var(--border)] flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {mediaAttachment.type === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mediaAttachment.url}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center shrink-0">
                      <FileText size={20} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-[var(--text)]">
                      {mediaAttachment.name || 'Медиафайл'}
                    </p>
                    <p className="text-[10px] text-[var(--text-2)]">
                      {uploadProgress !== null
                        ? `Загрузка... ${uploadProgress}%`
                        : uploadError
                        ? `Ошибка: ${uploadError}`
                        : mediaAttachment.sizeBytes
                        ? `${Math.round(mediaAttachment.sizeBytes / 1024)} КБ`
                        : 'Готово к отправке'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {uploadError && (
                    <button
                      type="button"
                      onClick={retryUpload}
                      className="px-2 py-1 rounded-md text-[11px] font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                    >
                      Повторить
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={cancelUpload}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)]"
                    aria-label="Отменить или удалить медиа"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
              {uploadProgress !== null && (
                <div className="w-full bg-[var(--bg-hover)] rounded-full h-1 overflow-hidden">
                  <div
                    className="bg-[var(--accent)] h-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Панель основателя @cernavation: переключение «Поддержка / тест» ↔ «Рассылка всем пользователям» */}
          {isPriday && isFounder && (
            <div
              className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/[0.12] bg-[#060608] px-3 py-2"
              data-testid="founder-broadcast-switcher"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    playClick(soundEnabled)
                    setPridayComposerMode('support')
                    setBroadcastConfirmOpen(false)
                  }}
                  className={`h-8 rounded-xl px-3 text-xs font-semibold transition-colors ${
                    pridayComposerMode === 'support'
                      ? 'bg-white text-black'
                      : 'bg-white/[0.06] text-white/70 hover:bg-white/[0.12] hover:text-white'
                  }`}
                >
                  Поддержка / тест
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClick(soundEnabled)
                    setPridayComposerMode('broadcast')
                  }}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-colors ${
                    pridayComposerMode === 'broadcast'
                      ? 'bg-[#d76737] text-black'
                      : 'border border-white/[0.12] bg-white/[0.04] text-white/80 hover:bg-white/[0.1] hover:text-white'
                  }`}
                >
                  <Megaphone size={13} />
                  <span>Рассылка всем пользователям</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                {isBroadcastMode && (
                  <button
                    type="button"
                    onClick={() => {
                      playClick(soundEnabled)
                      mediaInputRef.current?.click()
                    }}
                    className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-white/[0.12] bg-white/[0.04] px-2.5 text-[11px] font-medium text-white/80 hover:bg-white/[0.1] hover:text-white transition-colors"
                  >
                    <ImageIcon size={12} />
                    <span>Фото</span>
                  </button>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/75">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isBroadcastMode ? 'bg-[#d76737]' : 'bg-white/40'
                    }`}
                  />
                  {isBroadcastMode
                    ? `Рассылка на ${broadcastTotalUsers ?? '…'} аккаунтов`
                    : 'Личный тест / поддержка'}
                </span>
              </div>
            </div>
          )}

          {/* Интерактивные кнопки-чипсы для официального системного чата Priday */}
          {isPriday && !isBroadcastMode && (
            <div className="flex flex-wrap items-center gap-1.5 py-1">
              {PRIDAY_QUICK_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => {
                    playClick(soundEnabled)
                    sendChatMessage(friendId, action.label)
                    if (action.isSupport) {
                      onNotify('Заявка передана в поддержку Winlog')
                    }
                  }}
                  className="h-[34px] px-3.5 rounded-full border border-[var(--accent)]/40 bg-[var(--accent-soft)] hover:bg-[var(--accent)] hover:text-white text-[var(--text)] text-xs font-semibold whitespace-nowrap transition-colors"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Быстрые ответы по кнопке «⚡» или если переписка пуста (для обычных чатов) */}
          {!isPriday && (showQuickChips || allMessages.length === 0) && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none no-scrollbar">
              {QUICK_REPLIES.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => {
                    playClick(soundEnabled)
                    setChatDraft(friendId, reply)
                    textareaRef.current?.focus()
                  }}
                  className="shrink-0 h-[32px] px-3 rounded-full border border-[var(--border)] bg-[var(--bg-elev)] hover:bg-[var(--bg-hover)] text-[var(--text)] text-xs font-semibold whitespace-nowrap transition-colors"
                >
                  {reply}
                </button>
              ))}
            </div>
          )}

          {/* Строка ввода или блокировка по приватности */}
          {!dmPermission.allowed ? (
            <div className="w-full py-3 px-4 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] text-center text-xs text-[var(--text-2)] font-medium flex items-center justify-center gap-2 select-none shadow-sm">
              <span>🔒</span>
              <span>{dmPermission.reason}</span>
            </div>
          ) : isGroup && thread?.groupMeta?.adminsOnly && !isMeAdmin ? (
            <div className="w-full py-3 px-4 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] text-center text-xs text-[var(--text-2)] font-medium flex items-center justify-center gap-2 select-none shadow-sm">
              <span>🔒</span>
              <span>В этой группе только администраторы могут отправлять сообщения</span>
            </div>
          ) : (
            <div className="flex items-end gap-2 w-full">
              {/* Кнопки слева: «+», «GIF», «😊», «⚡» */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* 1. Кнопка «+» (вложения) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      playClick(soundEnabled)
                      setAttachMenuOpen((v) => !v)
                    }}
                    className="w-[44px] h-[44px] rounded-full border border-[var(--border)] bg-[var(--bg-elev)] hover:bg-[var(--bg-hover)] text-[var(--text)] flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm"
                    aria-label="Вложения"
                    title="Прикрепить файл, медиа или опрос"
                  >
                    <Plus size={20} strokeWidth={2.2} />
                  </button>

                  {attachMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setAttachMenuOpen(false)} />
                      <div className="absolute left-0 bottom-full mb-2 w-52 rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-1.5 shadow-2xl z-40 animate-in fade-in zoom-in-95 backdrop-blur-md text-xs font-medium">
                        <button
                          type="button"
                          onClick={() => {
                            setAttachMenuOpen(false)
                            mediaInputRef.current?.click()
                          }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[var(--text)] hover:bg-[var(--bg-hover)]"
                        >
                          <Paperclip size={16} className="text-[#1d9bf0]" /> Файл / Медиа
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAttachMenuOpen(false)
                            setPollModalOpen(true)
                          }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[var(--text)] hover:bg-[var(--bg-hover)]"
                        >
                          <BarChart3 size={16} className="text-[#00ba7c]" /> Опрос
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAttachMenuOpen(false)
                            setAttachOpen(true)
                          }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[var(--text)] hover:bg-[var(--bg-hover)]"
                        >
                          <Sparkles size={16} className="text-[var(--accent)]" /> Карточка Winlog
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* 2. Кнопка «GIF» */}
                <button
                  type="button"
                  onClick={() => {
                    playClick(soundEnabled)
                    setGifModalOpen(true)
                  }}
                  className="w-[44px] h-[44px] rounded-full border border-[var(--border)] bg-[var(--bg-elev)] hover:bg-[var(--bg-hover)] text-[var(--text)] text-[12px] font-extrabold flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm"
                  aria-label="Выбрать GIF"
                  title="GIF-анимация"
                >
                  GIF
                </button>

                {/* 3. Кнопка «😊» (эмодзи) */}
                <div className="relative overflow-visible">
                  <button
                    type="button"
                    onClick={() => {
                      playClick(soundEnabled)
                      setEmojiOpen((v) => !v)
                    }}
                    className="w-[44px] h-[44px] rounded-full border border-[var(--border)] bg-[var(--bg-elev)] hover:bg-[var(--bg-hover)] text-[var(--text)] flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm"
                    aria-label="Эмодзи и стикеры"
                    title="Эмодзи"
                  >
                    <Smile size={20} />
                  </button>

                  {emojiOpen && (
                    <ChatEmojiPicker
                      align="left"
                      onPickEmoji={(emoji) => {
                        setChatDraft(friendId, `${draft}${emoji}`)
                        textareaRef.current?.focus()
                      }}
                      onPickSticker={(stk) => {
                        setEmojiOpen(false)
                        sendChatMessage(friendId, '', null, {
                          media: { type: 'sticker', url: stk.id, name: stk.title },
                        })
                      }}
                      onClose={() => setEmojiOpen(false)}
                      soundEnabled={soundEnabled}
                    />
                  )}
                </div>

                {/* Кнопка быстрых ответов «⚡» */}
                <button
                  type="button"
                  onClick={() => {
                    playClick(soundEnabled)
                    setShowQuickChips((v) => !v)
                  }}
                  className={`w-[44px] h-[44px] rounded-full border border-[var(--border)] bg-[var(--bg-elev)] hover:bg-[var(--bg-hover)] flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm ${
                    showQuickChips ? 'text-[var(--accent)] border-[var(--accent)]' : 'text-[var(--text)]'
                  }`}
                  aria-label="Быстрые ответы"
                  title="Быстрые ответы Winlog"
                >
                  <Zap size={18} fill={showQuickChips ? 'currentColor' : 'none'} />
                </button>
              </div>

              {/* Поле-пилюля flex:1 */}
              <div className="flex-1 min-w-[200px] min-h-[48px] rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2 flex items-center gap-2 focus-within:border-[var(--accent)] transition-colors relative shadow-inner">
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(e) => {
                    setChatDraft(friendId, e.target.value)
                    broadcastTyping()
                  }}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={
                    isBroadcastMode
                      ? 'Официальное объявление от имени Winlog... (Shift+Enter — перенос)'
                      : 'Написать сообщение...'
                  }
                  rows={1}
                  className="flex-1 min-w-0 bg-transparent text-[15px] leading-relaxed text-[var(--text)] placeholder:text-[var(--text-2)] resize-none outline-none max-h-[160px]"
                  aria-label="Текст сообщения"
                />

                {/* Справа внутри поля: отложенная отправка и кнопка отправки */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {!isBroadcastMode && (canSend || editingMessage) && (
                    <button
                      type="button"
                      onClick={() => {
                        playClick(soundEnabled)
                        setScheduleModalOpen(true)
                      }}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)]"
                      title="Отправить позже или без звука"
                      aria-label="Опции отправки"
                    >
                      <Clock size={16} />
                    </button>
                  )}

                  <Tooltip content="Отправить (Enter)" side="top">
                    <button
                      type="button"
                      disabled={!canSend && !editingMessage}
                      onClick={() => handleSend()}
                      className={`w-[36px] h-[36px] rounded-full flex items-center justify-center transition-all ${
                        canSend || editingMessage
                          ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-md hover:opacity-90 active:scale-95'
                          : 'bg-white/10 text-[var(--text-2)] opacity-50 cursor-not-allowed'
                      }`}
                      aria-label="Отправить сообщение"
                    >
                      <Send size={16} className="-ml-0.5" />
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Контекстное меню по правому клику на сообщение */}
      {messageContextMenu && (
        <ChatContextMenu
          x={messageContextMenu.x}
          y={messageContextMenu.y}
          onClose={() => setMessageContextMenu(null)}
          items={
            [
              {
                id: 'reply',
                label: 'Ответить',
                icon: <Reply size={15} />,
                onSelect: () => {
                  playClick(soundEnabled)
                  setReplyingTo(messageContextMenu.message)
                  textareaRef.current?.focus()
                },
              },
              {
                id: 'copy',
                label: 'Скопировать текст',
                icon: <Copy size={15} />,
                disabled: !messageContextMenu.message.text?.trim(),
                onSelect: () => {
                  const textToCopy = messageContextMenu.message.text?.trim()
                  if (textToCopy && typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(textToCopy).catch(() => {})
                    onNotify('Текст скопирован')
                  }
                },
              },
              ...((messageContextMenu.message.actorMeta?.kind === 'official_broadcast'
                ? isFounder
                : messageContextMenu.isMine)
                ? [
                    {
                      id: 'delete',
                      label:
                        messageContextMenu.message.actorMeta?.kind === 'official_broadcast'
                          ? 'Удалить рассылку для всех'
                          : 'Удалить сообщение',
                      icon: <Trash2 size={15} />,
                      danger: true,
                      dividerBefore: true,
                      onSelect: async () => {
                        const isBroadcastItem =
                          messageContextMenu.message.actorMeta?.kind === 'official_broadcast'
                        const ok = await deleteChatMessage(
                          friendId,
                          messageContextMenu.message.id,
                          isBroadcastItem
                        )
                        if (ok) {
                          onNotify(
                            isBroadcastItem ? 'Рассылка удалена для всех' : 'Сообщение удалено'
                          )
                        } else {
                          onNotify('Не удалось удалить сообщение')
                        }
                      },
                    } satisfies ContextMenuItem,
                  ]
                : []),
            ] satisfies ContextMenuItem[]
          }
        />
      )}

      {/* Короткое подтверждение перед официальной рассылкой @cernavation */}
      {broadcastConfirmOpen && isBroadcastMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
          onClick={() => !broadcastSending && setBroadcastConfirmOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/[0.14] bg-[#060608] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d76737]/15 text-[#d76737] border border-[#d76737]/30">
                <Megaphone size={17} />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-white">
                  Отправить рассылку всем?
                </h3>
                <p className="text-xs text-white/60">
                  Получателей в БД: {broadcastTotalUsers ?? 'все аккаунты'} · от имени Winlog
                </p>
              </div>
            </div>

            {draft.trim() && (
              <div className="mb-3 max-h-36 overflow-y-auto rounded-xl border border-white/[0.1] bg-black px-3.5 py-2.5 text-xs leading-relaxed text-white/85 whitespace-pre-wrap">
                {draft.trim()}
              </div>
            )}

            {mediaAttachment?.type === 'image' && (
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/[0.1] bg-black px-3 py-2 text-xs text-white/75">
                <ImageIcon size={14} className="text-[#d76737] shrink-0" />
                <span className="truncate">
                  Изображение: {mediaAttachment.name || 'Фото к объявлению'}
                </span>
              </div>
            )}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={broadcastSending}
                onClick={() => setBroadcastConfirmOpen(false)}
                className="h-9 rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 text-xs font-semibold text-white/80 hover:bg-white/[0.1] hover:text-white disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={broadcastSending || uploadProgress !== null}
                onClick={() => void handleConfirmBroadcastSend()}
                className="h-9 rounded-xl bg-[#d76737] px-4 text-xs font-semibold text-black hover:opacity-90 disabled:opacity-50"
              >
                {broadcastSending ? 'Отправка...' : 'Отправить всем'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно поиска GIF */}
      {gifModalOpen && (
        <ChatGifModal
          onSelectGif={(url) => {
            sendChatMessage(friendId, '', null, {
              media: { type: 'image', url, name: 'GIF-анимация' },
            })
          }}
          onClose={() => setGifModalOpen(false)}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Модальное окно создания опроса */}
      {pollModalOpen && (
        <ChatPollCreatorModal
          onCreatePoll={(poll) => {
            sendChatMessage(friendId, '', null, { poll, type: 'poll' })
          }}
          onClose={() => setPollModalOpen(false)}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Модальное окно отложенной отправки */}
      {scheduleModalOpen && (
        <ChatScheduleModal
          onSchedule={(iso, silent) => handleSend({ scheduledForISO: iso, silent })}
          onSendSilent={() => handleSend({ silent: true })}
          onClose={() => setScheduleModalOpen(false)}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Модальное окно пересылки в другой чат */}
      {forwardModalData && (
        <ForwardToChatModal
          attachment={forwardModalData.attachment}
          initialNote={forwardModalData.note}
          onClose={() => setForwardModalData(null)}
          onNotify={onNotify}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Выбор карточки гордости/благодарности для чата */}
      {attachOpen && (
        <AttachCardPicker
          onPick={(att) => {
            setAttachment(att)
            setAttachOpen(false)
          }}
          onClose={() => setAttachOpen(false)}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Профиль друга */}
      {friendDetailOpen && friendId && (
        <FriendDetailModal
          friendId={friendId}
          onClose={() => setFriendDetailOpen(false)}
          onNotify={onNotify}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Модальное окно управления группой */}
      {groupModalOpen && thread?.groupMeta && (
        <GroupManagementModal
          groupId={friendId}
          groupMeta={thread.groupMeta}
          onUpdateGroup={(patch) => updateGroupMeta(friendId, patch)}
          onAddMembers={(memberIds) => addGroupMembers(friendId, memberIds)}
          onRemoveMember={(memberId) => removeGroupMember(friendId, memberId)}
          onSetMemberRole={(memberId, role) => setGroupMemberRole(friendId, memberId, role)}
          onLeaveGroup={async () => {
            const ok = await leaveGroup(friendId)
            setGroupModalOpen(false)
            if (ok) {
              onNotify('Вы вышли из группы')
              onBack?.()
            } else {
              onNotify('Не удалось выйти из группы')
            }
          }}
          onDeleteGroup={async () => {
            const ok = await deleteGroup(friendId)
            setGroupModalOpen(false)
            if (ok) {
              onNotify('Группа удалена')
              onBack?.()
            } else {
              onNotify('Не удалось удалить группу')
            }
          }}
          onClose={() => setGroupModalOpen(false)}
          soundEnabled={soundEnabled}
          onNotify={onNotify}
        />
      )}

      {/* Модальное окно отключения звука */}
      {muteModalOpen && (
        <ChatMuteModal
          isMuted={Boolean(thread?.muted)}
          muteUntilISO={thread?.muteUntilISO}
          onMute={(hours) => {
            muteChatThread(friendId, hours)
            if (hours === 0) {
              onNotify('Уведомления включены')
            } else if (hours === null) {
              onNotify('Уведомления отключены навсегда')
            } else {
              onNotify(`Уведомления отключены на ${hours} ч.`)
            }
            setMuteModalOpen(false)
          }}
          onClose={() => setMuteModalOpen(false)}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Модальное окно запланированных сообщений */}
      {scheduledModalOpen && (
        <ChatScheduledMessagesModal
          friendId={friendId}
          friendName={title}
          scheduledMessages={thread?.scheduledMessages || []}
          tier={state.profile?.subscription_tier || 'free'}
          onEditMessage={(msgId, patch) => editScheduledMessage(friendId, msgId, patch)}
          onCancelMessage={(msgId) => cancelScheduledMessage(friendId, msgId)}
          onClose={() => setScheduledModalOpen(false)}
          soundEnabled={soundEnabled}
          onNotify={onNotify}
        />
      )}
    </div>
  )
}
