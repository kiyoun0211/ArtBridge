'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export type ArtworkState = { error?: string } | undefined

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

const ArtworkSchema = z.object({
  title: z.string().min(1, '제목을 입력해 주세요.').max(120, '제목은 120자 이하로 입력해 주세요.'),
  description: z.string().max(500, '설명은 500자 이하로 입력해 주세요.').optional(),
  width_cm: z
    .number()
    .positive('가로 길이는 0보다 커야 합니다.')
    .max(1000, '가로 길이는 1000cm 이하로 입력해 주세요.'),
  height_cm: z
    .number()
    .positive('세로 길이는 0보다 커야 합니다.')
    .max(1000, '세로 길이는 1000cm 이하로 입력해 주세요.'),
  sale_type: z.enum(['fixed', 'auction'], { error: '판매 방식을 선택해 주세요.' }),
  price: z
    .number()
    .int('가격은 정수(원 단위)로 입력해 주세요.')
    .positive('가격은 0보다 커야 합니다.'),
})

export async function uploadArtwork(
  _prev: ArtworkState,
  formData: FormData,
): Promise<ArtworkState> {
  const supabase = await createClient()

  // Verify authenticated session
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) {
    return { error: '로그인이 필요합니다.' }
  }

  // Verify artist role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (!profile || profile.role !== 'artist') {
    return { error: '작가 계정만 작품을 등록할 수 있습니다.' }
  }

  // Validate image file
  const imageFile = formData.get('image')
  if (!(imageFile instanceof File) || imageFile.size === 0) {
    return { error: '이미지 파일을 선택해 주세요.' }
  }
  if (!imageFile.type.startsWith('image/')) {
    return { error: '이미지 파일(JPG, PNG, WebP 등)만 업로드할 수 있습니다.' }
  }
  if (imageFile.size > MAX_FILE_SIZE) {
    return { error: '이미지 파일은 25MB 이하여야 합니다.' }
  }

  // Parse and validate form fields
  const parsed = ArtworkSchema.safeParse({
    title: String(formData.get('title') ?? '').trim(),
    description: String(formData.get('description') ?? '').trim() || undefined,
    width_cm: Number(formData.get('width_cm')),
    height_cm: Number(formData.get('height_cm')),
    sale_type: String(formData.get('sale_type')),
    price: Number(formData.get('price')),
  })

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { error: firstError?.message ?? '입력값을 확인해 주세요.' }
  }

  const { title, description, width_cm, height_cm, sale_type, price } = parsed.data

  // Determine file extension
  const ext = imageFile.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const { randomUUID } = await import('crypto')
  const storagePath = `${userId}/${randomUUID()}.${ext}`

  // Upload image to artwork-originals bucket
  const arrayBuffer = await imageFile.arrayBuffer()
  const fileBuffer = new Uint8Array(arrayBuffer)

  const { error: uploadError } = await supabase.storage
    .from('artwork-originals')
    .upload(storagePath, fileBuffer, {
      contentType: imageFile.type,
      upsert: false,
    })

  if (uploadError) {
    return { error: '이미지 업로드에 실패했습니다. 다시 시도해 주세요.' }
  }

  // Insert artwork record
  const { error: insertError } = await supabase.from('artworks').insert({
    artist_id: userId,
    title,
    description: description ?? null,
    width_cm,
    height_cm,
    sale_type,
    price,
    storage_path: storagePath,
    status: 'available',
  })

  if (insertError) {
    // Clean up uploaded file on DB failure
    await supabase.storage.from('artwork-originals').remove([storagePath])
    return { error: '작품 등록에 실패했습니다. 다시 시도해 주세요.' }
  }

  revalidatePath('/artist')
  redirect('/artist')
}
