'use server'

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

export async function generateMockup(
  _prev: MockupState,
  _formData: FormData,
): Promise<MockupState> {
  return { status: 'error', error: 'AI Room 합성은 곧 오픈됩니다.' }
}
