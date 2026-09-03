export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      demo_accounts: {
        Row: {
          active: boolean
          created_at: string
          email: string
          id: string
          last_login: string | null
          name: string
          nip: string
          password: string
          role: string
          role_label: string
          session_expires_at: string | null
          session_token: string | null
          unit_kerja: string
          updated_at: string
          username: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          id?: string
          last_login?: string | null
          name: string
          nip: string
          password: string
          role: string
          role_label: string
          session_expires_at?: string | null
          session_token?: string | null
          unit_kerja: string
          updated_at?: string
          username: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          last_login?: string | null
          name?: string
          nip?: string
          password?: string
          role?: string
          role_label?: string
          session_expires_at?: string | null
          session_token?: string | null
          unit_kerja?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      kegiatan: {
        Row: {
          aktif: boolean
          created_at: string
          deskripsi: string | null
          id: string
          nama: string
          updated_at: string
        }
        Insert: {
          aktif?: boolean
          created_at?: string
          deskripsi?: string | null
          id?: string
          nama: string
          updated_at?: string
        }
        Update: {
          aktif?: boolean
          created_at?: string
          deskripsi?: string | null
          id?: string
          nama?: string
          updated_at?: string
        }
        Relationships: []
      }
      peminjam: {
        Row: {
          aktif: boolean
          created_at: string
          email: string | null
          id: string
          jenis: string
          kode: string
          nama: string
          telepon: string | null
          updated_at: string
        }
        Insert: {
          aktif?: boolean
          created_at?: string
          email?: string | null
          id?: string
          jenis: string
          kode: string
          nama: string
          telepon?: string | null
          updated_at?: string
        }
        Update: {
          aktif?: boolean
          created_at?: string
          email?: string | null
          id?: string
          jenis?: string
          kode?: string
          nama?: string
          telepon?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      peminjaman: {
        Row: {
          catatan: string | null
          created_at: string
          created_by: string | null
          desa: string | null
          dikonfirmasi_oleh: string | null
          email: string | null
          file_pengamanan_url: string | null
          id: string
          jenis_hak: string
          jenis_peminjaman: string | null
          kecamatan: string | null
          kegiatan: string
          no_berkas_pnbp: string | null
          no_hak: string
          no_ht: string | null
          no_register: string
          no_su: string | null
          no_warkah: string | null
          peminjam: string
          status: string
          tahun: string | null
          tgl_konfirmasi: string | null
          tgl_pengajuan: string
          tgl_update: string
          tipe: string
          updated_at: string
        }
        Insert: {
          catatan?: string | null
          created_at?: string
          created_by?: string | null
          desa?: string | null
          dikonfirmasi_oleh?: string | null
          email?: string | null
          file_pengamanan_url?: string | null
          id?: string
          jenis_hak: string
          jenis_peminjaman?: string | null
          kecamatan?: string | null
          kegiatan: string
          no_berkas_pnbp?: string | null
          no_hak: string
          no_ht?: string | null
          no_register: string
          no_su?: string | null
          no_warkah?: string | null
          peminjam: string
          status?: string
          tahun?: string | null
          tgl_konfirmasi?: string | null
          tgl_pengajuan?: string
          tgl_update?: string
          tipe?: string
          updated_at?: string
        }
        Update: {
          catatan?: string | null
          created_at?: string
          created_by?: string | null
          desa?: string | null
          dikonfirmasi_oleh?: string | null
          email?: string | null
          file_pengamanan_url?: string | null
          id?: string
          jenis_hak?: string
          jenis_peminjaman?: string | null
          kecamatan?: string | null
          kegiatan?: string
          no_berkas_pnbp?: string | null
          no_hak?: string
          no_ht?: string | null
          no_register?: string
          no_su?: string | null
          no_warkah?: string | null
          peminjam?: string
          status?: string
          tahun?: string | null
          tgl_konfirmasi?: string | null
          tgl_pengajuan?: string
          tgl_update?: string
          tipe?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
