/**
 * Модуль надежности WebRTC вызовов (Шаг 10):
 * - TURN через Metered (/api/webrtc/ice-servers)
 * - ICE restart при переключении сетей
 * - Таймаут 45 секунд для фиксации missed
 * - Человекопонятные ошибки доступа к медиаустройствам
 */

export const CALL_RING_TIMEOUT_MS = 45_000

export interface IceServersResponse {
  iceServers: RTCIceServer[]
  iceTransportPolicy?: 'all' | 'relay'
  ttlSeconds?: number
}

const DEFAULT_STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

/**
 * Получить список ICE-серверов с бэкенда (включая временные TURN-токены Metered)
 */
export async function getWebrtcIceServers(options?: {
  relayOnly?: boolean
}): Promise<IceServersResponse> {
  if (typeof window === 'undefined') {
    return { iceServers: DEFAULT_STUN_SERVERS, iceTransportPolicy: 'all' }
  }

  try {
    const url = `/api/webrtc/ice-servers${options?.relayOnly ? '?relay=true' : ''}`
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    if (res.ok) {
      const data = (await res.json()) as IceServersResponse
      if (Array.isArray(data.iceServers) && data.iceServers.length > 0) {
        return {
          iceServers: data.iceServers,
          iceTransportPolicy: options?.relayOnly ? 'relay' : (data.iceTransportPolicy || 'all'),
        }
      }
    }
  } catch (err) {
    console.warn('[WebRTC] Failed to fetch ice-servers from API, falling back to STUN:', err)
  }

  return {
    iceServers: DEFAULT_STUN_SERVERS,
    iceTransportPolicy: options?.relayOnly ? 'relay' : 'all',
  }
}

export interface MediaDeviceErrorInfo {
  title: string
  message: string
  blocked: boolean
  isCameraSpecific: boolean
}

/**
 * Преобразование ошибок getUserMedia в понятные пользователю сообщения
 */
export function parseMediaDeviceError(error: any, isVideo = false): MediaDeviceErrorInfo {
  const errName = error?.name || ''
  const errMsg = error?.message || ''

  if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
    return {
      title: isVideo ? 'Доступ к камере и микрофону запрещён' : 'Доступ к микрофону запрещён',
      message:
        'Браузер заблокировал доступ к устройствам. Нажмите на значок замка или камеры в адресной строке и включите «Разрешить».',
      blocked: true,
      isCameraSpecific: false,
    }
  }

  if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
    return {
      title: isVideo ? 'Камера или микрофон не найдены' : 'Микрофон не найден',
      message: 'Подключите гарнитуру или внешнее аудио/видео устройство и повторите попытку.',
      blocked: false,
      isCameraSpecific: isVideo && errMsg.toLowerCase().includes('video'),
    }
  }

  if (errName === 'NotReadableError' || errName === 'TrackStartError') {
    return {
      title: 'Устройство занято другой программой',
      message:
        'Микрофон или камера используются другим приложением (Telegram, Zoom, браузерная вкладка). Закройте их.',
      blocked: false,
      isCameraSpecific: false,
    }
  }

  if (errName === 'OverconstrainedError') {
    return {
      title: 'Неподдерживаемое разрешение',
      message: 'Камера вашего устройства не поддерживает запрошенные видео-параметры.',
      blocked: false,
      isCameraSpecific: true,
    }
  }

  return {
    title: 'Ошибка медиаустройств',
    message: errMsg || 'Не удалось активировать голосовой или видео-поток.',
    blocked: false,
    isCameraSpecific: false,
  }
}

/**
 * Инициировать ICE Restart на существующем RTCPeerConnection
 */
export async function createIceRestartOffer(
  pc: RTCPeerConnection,
  isVideo = false
): Promise<RTCSessionDescriptionInit | null> {
  try {
    if (typeof (pc as any).restartIce === 'function') {
      ;(pc as any).restartIce()
    }
    const offer = await pc.createOffer({
      iceRestart: true,
      offerToReceiveAudio: true,
      offerToReceiveVideo: isVideo,
    })
    await pc.setLocalDescription(offer)
    return offer
  } catch (err) {
    console.warn('[WebRTC] createIceRestartOffer failed:', err)
    return null
  }
}

/**
 * Форматирование длительности разговора (секунды -> mm:ss)
 */
export function formatCallDuration(seconds: number): string {
  if (!seconds || seconds <= 0 || isNaN(seconds)) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return `${mm}:${ss}`
}
