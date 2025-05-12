export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          mobile_number: string | null
          avatar_url: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          id: string
          full_name?: string | null
          mobile_number?: string | null
          avatar_url?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          full_name?: string | null
          mobile_number?: string | null
          avatar_url?: string | null
          role?: string
          updated_at?: string | null
        }
      }
      tracks: {
        Row: {
          id: string
          name: string
          description: string | null
          status: string
          start_date: string | null
          end_date: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          status?: string
          start_date?: string | null
          end_date?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          status?: string
          start_date?: string | null
          end_date?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      tasks: {
        Row: {
          id: string
          track_id: string
          name: string
          caption: string | null
          deadline: string | null
          resources_url: string | null
          task_order: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          track_id: string
          name: string
          caption?: string | null
          deadline?: string | null
          resources_url?: string | null
          task_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          track_id?: string
          name?: string
          caption?: string | null
          deadline?: string | null
          resources_url?: string | null
          task_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      user_task_progress: {
        Row: {
          id: string
          user_id: string
          task_id: string
          status: string
          completed_at: string | null
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          task_id: string
          status?: string
          completed_at?: string | null
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          task_id?: string
          status?: string
          completed_at?: string | null
          notes?: string | null
          updated_at?: string | null
        }
      }
      admin_track_assignments: {
        Row: {
          id: string
          admin_user_id: string
          track_id: string
        }
        Insert: {
          id?: string
          admin_user_id: string
          track_id: string
        }
        Update: {
          id?: string
          admin_user_id?: string
          track_id?: string
        }
      }
    }
  }
} 