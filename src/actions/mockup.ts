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

const MockupSchema = z.object({
  artworkId: z.string().uuid('유효하지 않은 작품 ID입니다.'),
  roomWidthCm: z
    .number()
    .min(50, '벽 폭은 최소 50cm 이상이어야 합니다.')
    .max(1000, '벽 폭은 최대 1000cm 이하여야 합니다.'),
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

  // Validate room image file
  const roomImageFile = formData.get('roomImage')
  console.log('[mockup] file received:', {
    isFile: roomImageFile instanceof File,
    name: roomImageFile instanceof File ? roomImageFile.name : null,
    type: roomImageFile instanceof File ? roomImageFile.type : null,
    size: roomImageFile instanceof File ? roomImageFile.size : null,
  })
  if (!(roomImageFile instanceof File) || roomImageFile.size === 0) {
    return { status: 'error', error: '방 사진을 선택해 주세요.' }
  }
  // Loosened MIME check: some browsers/iOS send empty type for HEIC/HEIF
  if (roomImageFile.type && !roomImageFile.type.startsWith('image/')) {
    return { status: 'error', error: '이미지 파일(JPG, PNG 등)만 업로드할 수 있습니다.' }
  }
  if (roomImageFile.size > MAX_ROOM_FILE_SIZE) {
    return { status: 'error', error: '방 사진은 10MB 이하여야 합니다.' }
  }

  // Validate other fields
  const parsed = MockupSchema.safeParse({
    artworkId: String(formData.get('artworkId') ?? '').trim(),
    roomWidthCm: Number(formData.get('roomWidthCm')),
  })

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { status: 'error', error: firstError?.message ?? '입력값을 확인해 주세요.' }
  }

  const { artworkId, roomWidthCm } = parsed.data

  // Fetch artwork from DB (admin client to bypass RLS)
  const admin = createAdminClient()
  const { data: artwork, error: artworkError } = await admin
    .from('artworks')
    .select('id, title, width_cm, height_cm, mockup_url, storage_path')
    .eq('id', artworkId)
    .single()

  if (artworkError || !artwork) {
    return { status: 'error', error: '작품 정보를 불러올 수 없습니다.' }
  }

  // Resolve artwork image source: prefer mockup_url, fallback to signed storage URL
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

  // Load room image buffer
  const roomArrayBuffer = await roomImageFile.arrayBuffer()
  const roomBuffer = Buffer.from(roomArrayBuffer)

  // Get room dimensions
  let roomPxW = 0
  let roomPxH = 0
  try {
    const roomMeta = await sharp(roomBuffer).rotate().metadata()
    roomPxW = roomMeta.width ?? 0
    roomPxH = roomMeta.height ?? 0
  } catch (err) {
    console.error('[mockup] room metadata failed:', err)
    return { status: 'error', error: '방 사진을 처리할 수 없습니다. 다른 사진을 시도해 주세요.' }
  }

  if (roomPxW === 0 || roomPxH === 0) {
    return { status: 'error', error: '방 사진의 크기를 확인할 수 없습니다.' }
  }

  // Fetch artwork image — follow redirects (e.g. picsum 302 → fastly)
  let artworkBuffer: Buffer
  try {
    const artworkResponse = await fetch(artworkImageUrl, { cache: 'no-store' })
    if (!artworkResponse.ok) {
      throw new Error(`HTTP ${artworkResponse.status}`)
    }
    const artworkArrayBuffer = await artworkResponse.arrayBuffer()
    artworkBuffer = Buffer.from(artworkArrayBuffer)
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

  // Compute composite position: center horizontally, 30% from top
  const left = Math.round((roomPxW - artworkPxW) / 2)
  let top = Math.round(roomPxH * 0.3)
  top = Math.min(top, roomPxH - artworkPxH - 16)
  top = Math.max(0, top)

  // Resize artwork + composite onto room image (auto-rotate so EXIF orientation is honored)
  let compositeBuffer: Buffer
  try {
    const resizedArtworkBuffer = await sharp(artworkBuffer)
      .resize(artworkPxW, artworkPxH, { fit: 'fill' })
      .png()
      .toBuffer()

    compositeBuffer = await sharp(roomBuffer)
      .rotate()
      .composite([{ input: resizedArtworkBuffer, left, top }])
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
