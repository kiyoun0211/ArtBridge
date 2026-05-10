'use server'

import { z } from 'zod'
import sharp from 'sharp'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type MockupState =
  | { status: 'idle' }
  | { status: 'error'; error: string }
  | {
      status: 'success'
      url: string
      warning?: string
      meta: {
        artworkPxW: number
        artworkPxH: number
        roomPxW: number
        roomPxH: number
      }
    }

const MAX_ROOM_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// TODO: Replace Picsum seeds with real CC0 interior photo URLs for production.
//       Picsum returns generic photos — not actual interior rooms.
const PRESET_ROOMS: Record<string, string> = {
  living:  'https://picsum.photos/seed/atelier-room-living/1600/1200',
  bedroom: 'https://picsum.photos/seed/atelier-room-bedroom/1600/1200',
  studio:  'https://picsum.photos/seed/atelier-room-studio/1600/1200',
  loft:    'https://picsum.photos/seed/atelier-room-loft/1600/1200',
}

const MockupSchema = z.object({
  artworkId: z.string().uuid('유효하지 않은 작품 ID입니다.'),
  roomWidthCm: z
    .number()
    .min(50, '벽 폭은 최소 50cm 이상이어야 합니다.')
    .max(1000, '벽 폭은 최대 1000cm 이하여야 합니다.'),
  // New optional params
  presetRoom: z.enum(['living', 'bedroom', 'studio', 'loft']).nullable().optional(),
  offsetX: z.number().min(-0.5).max(0.5).optional().default(0),
  offsetY: z.number().min(-0.3).max(0.3).optional().default(0),
  showSilhouette: z.boolean().optional().default(false),
})

export async function generateMockup(
  _prev: MockupState,
  formData: FormData,
): Promise<MockupState> {
  try {
    return await runMockup(formData)
  } catch (err) {
    console.error('[mockup] uncaught error:', err)
    const detail = err instanceof Error ? err.message : String(err)
    return { status: 'error', error: `합성 중 오류가 발생했습니다: ${detail}` }
  }
}

async function runMockup(formData: FormData): Promise<MockupState> {
  console.log('[mockup] start')
  // Auth: require any authenticated user
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) {
    return { status: 'error', error: '로그인이 필요합니다.' }
  }

  // Parse new optional params
  const presetRoomRaw = formData.get('presetRoom')
  const presetRoom = presetRoomRaw && presetRoomRaw !== 'null' && presetRoomRaw !== ''
    ? (presetRoomRaw as 'living' | 'bedroom' | 'studio' | 'loft')
    : null

  const offsetX = Number(formData.get('offsetX') ?? 0)
  const offsetY = Number(formData.get('offsetY') ?? 0)
  const showSilhouette = formData.get('showSilhouette') === 'true'

  // Validate room image file
  const roomImageFile = formData.get('roomImage')
  const hasFile = roomImageFile instanceof File && roomImageFile.size > 0
  const hasPreset = presetRoom !== null

  if (!hasFile && !hasPreset) {
    return { status: 'error', error: '방 사진을 선택하거나 프리셋 룸을 선택해 주세요.' }
  }

  if (hasFile) {
    // Loosened MIME check: some browsers/iOS send empty type for HEIC/HEIF
    if ((roomImageFile as File).type && !(roomImageFile as File).type.startsWith('image/')) {
      return { status: 'error', error: '이미지 파일(JPG, PNG 등)만 업로드할 수 있습니다.' }
    }
    if ((roomImageFile as File).size > MAX_ROOM_FILE_SIZE) {
      return { status: 'error', error: '방 사진은 10MB 이하여야 합니다.' }
    }
  }

  // Validate other fields
  const parsed = MockupSchema.safeParse({
    artworkId: String(formData.get('artworkId') ?? '').trim(),
    roomWidthCm: Number(formData.get('roomWidthCm')),
    presetRoom,
    offsetX: isNaN(offsetX) ? 0 : Math.max(-0.5, Math.min(0.5, offsetX)),
    offsetY: isNaN(offsetY) ? 0 : Math.max(-0.3, Math.min(0.3, offsetY)),
    showSilhouette,
  })

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { status: 'error', error: firstError?.message ?? '입력값을 확인해 주세요.' }
  }

  const { artworkId, roomWidthCm } = parsed.data
  const safeOffsetX = isNaN(offsetX) ? 0 : Math.max(-0.5, Math.min(0.5, offsetX))
  const safeOffsetY = isNaN(offsetY) ? 0 : Math.max(-0.3, Math.min(0.3, offsetY))

  // Fetch artwork from DB
  const admin = createAdminClient()
  const { data: artwork, error: artworkError } = await admin
    .from('artworks')
    .select('id, title, width_cm, height_cm, mockup_url, storage_path')
    .eq('id', artworkId)
    .single()

  if (artworkError || !artwork) {
    return { status: 'error', error: '작품 정보를 불러올 수 없습니다.' }
  }

  // Resolve artwork image
  let artworkImageUrl: string | null = artwork.mockup_url ?? null
  if (!artworkImageUrl && artwork.storage_path) {
    const { data: urlData } = await admin.storage
      .from('artwork-originals')
      .createSignedUrl(artwork.storage_path, 600)
    artworkImageUrl = urlData?.signedUrl ?? null
  }

  if (!artworkImageUrl) {
    return { status: 'error', error: '작품 이미지를 불러올 수 없습니다.' }
  }

  // Load room image buffer — from file upload or preset URL
  let roomBuffer: Buffer
  let roomPxW = 0
  let roomPxH = 0

  if (hasFile) {
    const roomArrayBuffer = await (roomImageFile as File).arrayBuffer()
    roomBuffer = Buffer.from(roomArrayBuffer)
    try {
      const roomMeta = await sharp(roomBuffer).rotate().metadata()
      roomPxW = roomMeta.width ?? 0
      roomPxH = roomMeta.height ?? 0
    } catch (err) {
      console.error('[mockup] room metadata failed:', err)
      return { status: 'error', error: '방 사진을 처리할 수 없습니다. 다른 사진을 시도해 주세요.' }
    }
  } else {
    // Fetch preset room image
    const presetUrl = PRESET_ROOMS[presetRoom!]
    try {
      const resp = await fetch(presetUrl, { cache: 'no-store' })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      roomBuffer = Buffer.from(await resp.arrayBuffer())
      const roomMeta = await sharp(roomBuffer).rotate().metadata()
      roomPxW = roomMeta.width ?? 0
      roomPxH = roomMeta.height ?? 0
    } catch (err) {
      console.error('[mockup] preset fetch failed:', err)
      return { status: 'error', error: '프리셋 룸 이미지를 불러오는 데 실패했습니다.' }
    }
  }

  if (roomPxW === 0 || roomPxH === 0) {
    return { status: 'error', error: '방 사진의 크기를 확인할 수 없습니다.' }
  }

  // Fetch artwork image
  let artworkBuffer: Buffer
  try {
    const artworkResponse = await fetch(artworkImageUrl, { cache: 'no-store' })
    if (!artworkResponse.ok) throw new Error(`HTTP ${artworkResponse.status}`)
    artworkBuffer = Buffer.from(await artworkResponse.arrayBuffer())
  } catch {
    return { status: 'error', error: '작품 이미지를 불러오는 데 실패했습니다. 다시 시도해 주세요.' }
  }

  // Compute scale: pixels per cm based on room photo
  const pxPerCm = roomPxW / roomWidthCm
  let artworkPxW = Math.round(artwork.width_cm * pxPerCm)
  let artworkPxH = Math.round(artwork.height_cm * pxPerCm)

  // Safety: cap artwork to 90% of room dimensions while preserving aspect ratio
  let warning: string | undefined
  const maxW = Math.round(roomPxW * 0.9)
  const maxH = Math.round(roomPxH * 0.9)

  if (artworkPxW > maxW || artworkPxH > maxH) {
    const scaleW = artworkPxW > maxW ? maxW / artworkPxW : 1
    const scaleH = artworkPxH > maxH ? maxH / artworkPxH : 1
    const scale = Math.min(scaleW, scaleH)
    artworkPxW = Math.round(artworkPxW * scale)
    artworkPxH = Math.round(artworkPxH * scale)
    warning = `작품이 화면보다 커서 90% 크기로 축소하여 표시합니다. 실제 벽 폭(cm)이 정확한지 확인해 주세요.`
  }

  // Compute composite position with offsetX/offsetY
  // Base: center horizontally, 30% from top
  const baseLeft = (roomPxW - artworkPxW) / 2
  const baseTop = roomPxH * 0.3

  // Apply offsets (offsetX: fraction of room width; offsetY: fraction of room height)
  let left = Math.round(baseLeft + roomPxW * safeOffsetX)
  let top = Math.round(baseTop + roomPxH * safeOffsetY)

  // Clamp to stay within room bounds
  left = Math.max(0, Math.min(left, roomPxW - artworkPxW))
  top = Math.max(0, Math.min(top, roomPxH - artworkPxH - 16))
  top = Math.max(0, top)

  // Resize artwork
  const resizedArtworkBuffer = await sharp(artworkBuffer)
    .resize(artworkPxW, artworkPxH, { fit: 'fill' })
    .png()
    .toBuffer()

  // Build composites array
  const composites: sharp.OverlayOptions[] = [
    { input: resizedArtworkBuffer, left, top },
  ]

  // Silhouette: 40cm wide × 170cm tall gray rectangle, bottom aligned to artwork bottom
  if (showSilhouette) {
    const personW = Math.max(1, Math.round(40 * pxPerCm))
    const personH = Math.max(1, Math.round(170 * pxPerCm))

    try {
      const personBuffer = await sharp({
        create: {
          width: personW,
          height: personH,
          channels: 4,
          background: { r: 107, g: 103, b: 96, alpha: 0.55 },
        },
      })
        .png()
        .toBuffer()

      // Align bottom of silhouette with bottom of artwork
      const artworkBottom = top + artworkPxH
      const silhouetteTop = artworkBottom - personH
      const silhouetteLeft = left + artworkPxW + 40 // 40px gap

      // Only add silhouette if it fits within room bounds
      if (
        silhouetteLeft + personW <= roomPxW &&
        silhouetteTop >= 0
      ) {
        composites.push({
          input: personBuffer,
          left: silhouetteLeft,
          top: Math.max(0, silhouetteTop),
        })
      }
    } catch (err) {
      console.error('[mockup] silhouette failed (non-fatal):', err)
    }
  }

  // Composite onto room image
  let compositeBuffer: Buffer
  try {
    compositeBuffer = await sharp(roomBuffer)
      .rotate()
      .composite(composites)
      .jpeg({ quality: 88 })
      .toBuffer()
  } catch (err) {
    console.error('[mockup] composite failed:', err)
    return { status: 'error', error: '이미지 합성에 실패했습니다. 다른 사진으로 시도해 주세요.' }
  }

  // Upload composite to space-uploads bucket
  const storagePath = `${userId}/preview-${artworkId}-${Date.now()}.jpg`
  const { error: uploadError } = await admin.storage
    .from('space-uploads')
    .upload(storagePath, compositeBuffer, {
      contentType: 'image/jpeg',
      upsert: false,
    })

  if (uploadError) {
    return { status: 'error', error: '합성 이미지 업로드에 실패했습니다. 다시 시도해 주세요.' }
  }

  // Generate signed URL (TTL 60 minutes)
  const { data: signedData, error: signError } = await admin.storage
    .from('space-uploads')
    .createSignedUrl(storagePath, 3600)

  if (signError || !signedData?.signedUrl) {
    return { status: 'error', error: '합성 이미지 URL 생성에 실패했습니다.' }
  }

  return {
    status: 'success',
    url: signedData.signedUrl,
    warning,
    meta: { artworkPxW, artworkPxH, roomPxW, roomPxH },
  }
}
