
import { createClient } from '@supabase/supabase-js';
import { User, ChatMessage } from '../types';

// Extended Database types to cover the new schema
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
            id: string;
            username: string;
            user_type: User['userType'];
            role: User['role'];
            is_silenced: boolean;
            profile: any; // jsonb
        };
        Insert: {
            id: string;
            username?: string;
            user_type?: User['userType'];
            role?: User['role'];
            is_silenced?: boolean;
            profile?: any;
        };
        Update: {
            id?: string;
            username?: string;
            user_type?: User['userType'];
            role?: User['role'];
            is_silenced?: boolean;
            profile?: any;
        };
      };
      chat_histories: {
        Row: { user_id: string; character_id: string; messages: any; updated_at: string };
        Insert: { user_id: string; character_id: string; messages: any; updated_at?: string };
        Update: { user_id?: string; character_id?: string; messages?: any; updated_at?: string };
      };
      characters: {
        Row: {
            id: string;
            creator_id: string;
            name: string;
            avatar_url: string | null;
            gender: string;
            description: string;
            personality: string;
            story: string | null;
            situation: string | null;
            feeling: string | null;
            appearance: string | null;
            is_beyond_the_haven: boolean;
            model: string;
            greeting: string;
            is_public: boolean;
            is_silenced_by_admin: boolean;
            categories: string[] | null;
            likes: string[] | null;
            comments: any;
            stats: any;
            stats_visible: boolean;
            summary: any;
            created_at: string;
        }; 
        Insert: any;
        Update: any;
      };
      app_settings: {
        Row: { key: string; value: any };
        Insert: { key: string; value: any };
        Update: { key?: string; value?: any };
      };
      global_settings: {
          Row: { id: boolean; settings: any };
          Insert: { id?: boolean; settings: any };
          Update: { id?: boolean; settings?: any };
      };
      api_connections: {
        Row: { id: string; name: string; provider: string; api_key: string; base_url: string; models: string[]; is_active: boolean };
        Insert: any;
        Update: any;
      };
      user_character_data: {
        Row: { user_id: string; character_id: string; settings: any; stats: any; narrative_state: any };
        Insert: any;
        Update: any;
      };
      forum_categories: {
        Row: { id: string; name: string; description: string; parent_id: string | null; is_locked: boolean; created_at: string };
        Insert: { name: string; description: string; parent_id?: string | null; is_locked?: boolean };
        Update: { name?: string; description?: string; parent_id?: string | null; is_locked?: boolean };
      };
      forum_threads: {
        Row: { id: string; category_id: string; author_id: string; title: string; created_at: string; is_locked: boolean; is_pinned: boolean; is_silenced: boolean; view_count: number; tags: any };
        Insert: { category_id: string; author_id: string; title: string; is_locked?: boolean; is_pinned?: boolean; is_silenced?: boolean; view_count?: number; tags?: any };
        Update: { category_id?: string; author_id?: string; title?: string; is_locked?: boolean; is_pinned?: boolean; is_silenced?: boolean; view_count?: number; tags?: any };
      };
      forum_posts: {
        Row: { id: string; thread_id: string; author_id: string; is_character_post: boolean; content: string; created_at: string; is_edited: boolean; is_silenced: boolean; upvotes: string[]; downvotes: string[] };
        Insert: { thread_id: string; author_id: string; is_character_post?: boolean; content: string; is_edited?: boolean; is_silenced?: boolean; upvotes?: string[]; downvotes?: string[] };
        Update: { thread_id?: string; author_id?: string; is_character_post?: boolean; content?: string; is_edited?: boolean; is_silenced?: boolean; upvotes?: string[]; downvotes?: string[] };
      };
      comments: {
        Row: { id: string; character_id: string; user_id: string; text: string; parent_id: string | null; created_at: number; is_silenced: boolean };
        Insert: any;
        Update: any;
      };
      character_likes: {
        Row: { user_id: string; character_id: string };
        Insert: any;
        Update: any;
      };
      reports: {
        Row: { id: string; reporter_id: string; entity_type: string; entity_id: string; reason: string; description: string; timestamp: string; is_resolved: boolean; notes: string[]; content_snapshot: string; entity_creator_id: string };
        Insert: any;
        Update: any;
      };
      tickets: {
        Row: { id: string; submitter_id: string; subject: string; description: string; email: string; status: string; created_at: string; folder_id: string | null };
        Insert: any;
        Update: any;
      };
      ai_alerts: {
         Row: { id: string; entity_type: string; entity_id: string; category: string; confidence: number; explanation: string; flagged_text: string; created_at: string; status: string; folder_id: string | null; entity_creator_id: string; notes: string[]; feedback: string };
         Insert: any;
         Update: any;
      };
      direct_messages: {
        Row: { id: string; conversation_user_id: string; sender_id: string; text: string; image_url: string; timestamp: number; is_read_by_user: boolean; is_read_by_admin: boolean; folder_id: string | null };
        Insert: any;
        Update: any;
      };
      dm_conversations: {
          Row: { user_id: string; has_unread_by_user: boolean; has_unread_by_admin: boolean; folder_id: string | null };
          Insert: any;
          Update: any;
      };
      admin_folders: {
          Row: { id: string; type: string; name: string };
          Insert: any;
          Update: any;
      };
      notifications: {
        Row: { id: string; user_id: string; type: string; message: string; related_id: string; from_user_id: string; is_read: boolean; created_at: string };
        Insert: any;
        Update: any;
      };
    };
  };
}

const supabaseUrl = 'https://pxnyzyefedpzognrhjqt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4bnl6eWVmZWRwem9nbnJoanF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MzMzMTYsImV4cCI6MjA3OTAwOTMxNn0.h8hCO0wqO5O4r-nzMsNqlOcK0q-DRENwmlSQyBVKiPc';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
