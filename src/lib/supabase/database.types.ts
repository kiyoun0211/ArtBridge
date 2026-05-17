export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      artists: {
        Row: {
          id: string
          name: string
          name_kr: string | null
          location: string | null
          born: number | null
          active_since: number | null
          bio_kr: string | null
          bio_en: string | null
          medium: string | null
          portrait_url: string | null
          works_count: number | null
          sold_count: number | null
          followers: string | null
          created_at: string
        }
        Insert: {
          id: string
          name: string
          name_kr?: string | null
          location?: string | null
          born?: number | null
          active_since?: number | null
          bio_kr?: string | null
          bio_en?: string | null
          medium?: string | null
          portrait_url?: string | null
          works_count?: number | null
          sold_count?: number | null
          followers?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['artists']['Insert']>
        Relationships: []
      }
      artworks: {
        Row: {
          id: string
          artist_id: string
          title: string
          title_kr: string | null
          year: number | null
          medium: string | null
          medium_kr: string | null
          width_cm: number | null
          height_cm: number | null
          depth_cm: number | null
          weight_kg: number | null
          body_text: string | null
          image_url: string | null
          placeholder_class: string | null
          mode: 'sale' | 'auction'
          price_krw: number | null
          status: 'available' | 'reserved' | 'sold' | null
          start_bid_krw: number | null
          current_bid_krw: number | null
          estimate_low_krw: number | null
          estimate_high_krw: number | null
          bid_count: number | null
          auction_ends_at: string | null
          created_at: string
        }
        Insert: {
          id: string
          artist_id: string
          title: string
          title_kr?: string | null
          year?: number | null
          medium?: string | null
          medium_kr?: string | null
          width_cm?: number | null
          height_cm?: number | null
          depth_cm?: number | null
          weight_kg?: number | null
          body_text?: string | null
          image_url?: string | null
          placeholder_class?: string | null
          mode: 'sale' | 'auction'
          price_krw?: number | null
          status?: 'available' | 'reserved' | 'sold' | null
          start_bid_krw?: number | null
          current_bid_krw?: number | null
          estimate_low_krw?: number | null
          estimate_high_krw?: number | null
          bid_count?: number | null
          auction_ends_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['artworks']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'artworks_artist_id_fkey'
            columns: ['artist_id']
            referencedRelation: 'artists'
            referencedColumns: ['id']
          },
        ]
      }
      bids: {
        Row: {
          id: string
          artwork_id: string
          bidder_name: string
          amount_krw: number
          placed_at: string
        }
        Insert: {
          id?: string
          artwork_id: string
          bidder_name: string
          amount_krw: number
          placed_at?: string
        }
        Update: Partial<Database['public']['Tables']['bids']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'bids_artwork_id_fkey'
            columns: ['artwork_id']
            referencedRelation: 'artworks'
            referencedColumns: ['id']
          },
        ]
      }
      room_presets: {
        Row: {
          id: string
          label: string
          image_url: string
          wall_x: number | null
          wall_y: number | null
          wall_w: number | null
          wall_h: number | null
          skew_y: number | null
          rot_y: number | null
          is_active: boolean | null
        }
        Insert: {
          id: string
          label: string
          image_url: string
          wall_x?: number | null
          wall_y?: number | null
          wall_w?: number | null
          wall_h?: number | null
          skew_y?: number | null
          rot_y?: number | null
          is_active?: boolean | null
        }
        Update: Partial<Database['public']['Tables']['room_presets']['Insert']>
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          role: 'artist' | 'buyer'
          email: string
          display_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: 'artist' | 'buyer'
          email: string
          display_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
  graphql_public: {
    Tables: { [_ in never]: never }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export const Constants = {
  graphql_public: { Enums: {} },
  public: { Enums: {} },
} as const
