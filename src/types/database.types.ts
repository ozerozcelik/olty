export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          instagram_url: string | null;
          x_url: string | null;
          youtube_url: string | null;
          tiktok_url: string | null;
          website_url: string | null;
          city: string | null;
          fishing_type: string[];
          total_xp: number;
          level: number;
          follower_count: number;
          following_count: number;
          catch_count: number;
          is_verified: boolean;
          kvkk_consent: boolean;
          marketing_consent: boolean;
          onboarding_completed: boolean;
          notif_likes: boolean;
          notif_comments: boolean;
          notif_follows: boolean;
          notif_weather: boolean;
          location_private: boolean;
          is_private: boolean;
          show_city_public: boolean;
          show_bio_public: boolean;
          show_fishing_types_public: boolean;
          show_social_links_public: boolean;
          show_gear_public: boolean;
          show_fishdex_public: boolean;
          is_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          instagram_url?: string | null;
          x_url?: string | null;
          youtube_url?: string | null;
          tiktok_url?: string | null;
          website_url?: string | null;
          city?: string | null;
          fishing_type?: string[];
          total_xp?: number;
          level?: number;
          follower_count?: number;
          following_count?: number;
          catch_count?: number;
          is_verified?: boolean;
          kvkk_consent?: boolean;
          marketing_consent?: boolean;
          onboarding_completed?: boolean;
          notif_likes?: boolean;
          notif_comments?: boolean;
          notif_follows?: boolean;
          notif_weather?: boolean;
          location_private?: boolean;
          is_private?: boolean;
          show_city_public?: boolean;
          show_bio_public?: boolean;
          show_fishing_types_public?: boolean;
          show_social_links_public?: boolean;
          show_gear_public?: boolean;
          show_fishdex_public?: boolean;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          instagram_url?: string | null;
          x_url?: string | null;
          youtube_url?: string | null;
          tiktok_url?: string | null;
          website_url?: string | null;
          city?: string | null;
          fishing_type?: string[];
          total_xp?: number;
          level?: number;
          follower_count?: number;
          following_count?: number;
          catch_count?: number;
          is_verified?: boolean;
          kvkk_consent?: boolean;
          marketing_consent?: boolean;
          onboarding_completed?: boolean;
          notif_likes?: boolean;
          notif_comments?: boolean;
          notif_follows?: boolean;
          notif_weather?: boolean;
          location_private?: boolean;
          is_private?: boolean;
          show_city_public?: boolean;
          show_bio_public?: boolean;
          show_fishing_types_public?: boolean;
          show_social_links_public?: boolean;
          show_gear_public?: boolean;
          show_fishdex_public?: boolean;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      fish_species: {
        Row: {
          id: number;
          name_tr: string;
          name_en: string | null;
          name_scientific: string | null;
          category: string | null;
          image_url: string | null;
          description_tr: string | null;
          habitat_tr: string | null;
          best_season_tr: string | null;
          bait_tr: string | null;
          is_active: boolean;
        };
        Insert: {
          id?: number;
          name_tr: string;
          name_en?: string | null;
          name_scientific?: string | null;
          category?: string | null;
          image_url?: string | null;
          description_tr?: string | null;
          habitat_tr?: string | null;
          best_season_tr?: string | null;
          bait_tr?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: number;
          name_tr?: string;
          name_en?: string | null;
          name_scientific?: string | null;
          category?: string | null;
          image_url?: string | null;
          description_tr?: string | null;
          habitat_tr?: string | null;
          best_season_tr?: string | null;
          bait_tr?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      catches: {
        Row: {
          id: string;
          user_id: string;
          species_id: number | null;
          species_custom: string | null;
          length_cm: number | null;
          weight_g: number | null;
          photo_url: string | null;
          photo_blur_hash: string | null;
          location: string | null;
          location_name: string | null;
          show_exact_location: boolean;
          show_measurements_public: boolean;
          show_location_public: boolean;
          show_method_public: boolean;
          show_notes_public: boolean;
          show_conditions_public: boolean;
          is_catch_release: boolean;
          fishing_type: string | null;
          bait_name: string | null;
          notes: string | null;
          xp_earned: number;
          like_count: number;
          comment_count: number;
          is_public: boolean;
          captured_at: string | null;
          air_temp_c: number | null;
          pressure_hpa: number | null;
          humidity_pct: number | null;
          weather_code: number | null;
          weather_label: string | null;
          wind_speed_kmh: number | null;
          wind_direction_deg: number | null;
          wind_direction_label: string | null;
          uv_index: number | null;
          wave_height_m: number | null;
          wave_direction_deg: number | null;
          sea_temp_c: number | null;
          sea_depth_m: number | null;
          sea_depth_source: string | null;
          sea_depth_is_approximate: boolean;
          moon_phase_label: string | null;
          moon_phase_emoji: string | null;
          fishing_score: number | null;
          fishing_score_label: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          species_id?: number | null;
          species_custom?: string | null;
          length_cm?: number | null;
          weight_g?: number | null;
          photo_url?: string | null;
          photo_blur_hash?: string | null;
          location?: string | null;
          location_name?: string | null;
          show_exact_location?: boolean;
          show_measurements_public?: boolean;
          show_location_public?: boolean;
          show_method_public?: boolean;
          show_notes_public?: boolean;
          show_conditions_public?: boolean;
          is_catch_release?: boolean;
          fishing_type?: string | null;
          bait_name?: string | null;
          notes?: string | null;
          xp_earned?: number;
          like_count?: number;
          comment_count?: number;
          is_public?: boolean;
          captured_at?: string | null;
          air_temp_c?: number | null;
          pressure_hpa?: number | null;
          humidity_pct?: number | null;
          weather_code?: number | null;
          weather_label?: string | null;
          wind_speed_kmh?: number | null;
          wind_direction_deg?: number | null;
          wind_direction_label?: string | null;
          uv_index?: number | null;
          wave_height_m?: number | null;
          wave_direction_deg?: number | null;
          sea_temp_c?: number | null;
          sea_depth_m?: number | null;
          sea_depth_source?: string | null;
          sea_depth_is_approximate?: boolean;
          moon_phase_label?: string | null;
          moon_phase_emoji?: string | null;
          fishing_score?: number | null;
          fishing_score_label?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          species_id?: number | null;
          species_custom?: string | null;
          length_cm?: number | null;
          weight_g?: number | null;
          photo_url?: string | null;
          photo_blur_hash?: string | null;
          location?: string | null;
          location_name?: string | null;
          show_exact_location?: boolean;
          show_measurements_public?: boolean;
          show_location_public?: boolean;
          show_method_public?: boolean;
          show_notes_public?: boolean;
          show_conditions_public?: boolean;
          is_catch_release?: boolean;
          fishing_type?: string | null;
          bait_name?: string | null;
          notes?: string | null;
          xp_earned?: number;
          like_count?: number;
          comment_count?: number;
          is_public?: boolean;
          captured_at?: string | null;
          air_temp_c?: number | null;
          pressure_hpa?: number | null;
          humidity_pct?: number | null;
          weather_code?: number | null;
          weather_label?: string | null;
          wind_speed_kmh?: number | null;
          wind_direction_deg?: number | null;
          wind_direction_label?: string | null;
          uv_index?: number | null;
          wave_height_m?: number | null;
          wave_direction_deg?: number | null;
          sea_temp_c?: number | null;
          sea_depth_m?: number | null;
          sea_depth_source?: string | null;
          sea_depth_is_approximate?: boolean;
          moon_phase_label?: string | null;
          moon_phase_emoji?: string | null;
          fishing_score?: number | null;
          fishing_score_label?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      follows: {
        Row: {
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      likes: {
        Row: {
          user_id: string;
          catch_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          catch_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          catch_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          catch_id: string;
          user_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          catch_id: string;
          user_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          catch_id?: string;
          user_id?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      xp_transactions: {
        Row: {
          id: number;
          user_id: string;
          amount: number;
          reason: string;
          ref_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          amount: number;
          reason: string;
          ref_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          amount?: number;
          reason?: string;
          ref_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      badge_definitions: {
        Row: {
          id: number;
          slug: string;
          name_tr: string;
          description_tr: string | null;
          icon_url: string | null;
          xp_reward: number;
          category: string | null;
        };
        Insert: {
          id?: number;
          slug: string;
          name_tr: string;
          description_tr?: string | null;
          icon_url?: string | null;
          xp_reward?: number;
          category?: string | null;
        };
        Update: {
          id?: number;
          slug?: string;
          name_tr?: string;
          description_tr?: string | null;
          icon_url?: string | null;
          xp_reward?: number;
          category?: string | null;
        };
        Relationships: [];
      };
      user_badges: {
        Row: {
          user_id: string;
          badge_id: number;
          earned_at: string;
        };
        Insert: {
          user_id: string;
          badge_id: number;
          earned_at?: string;
        };
        Update: {
          user_id?: string;
          badge_id?: number;
          earned_at?: string;
        };
        Relationships: [];
      };
      user_consents: {
        Row: {
          id: number;
          user_id: string | null;
          consent_type: string;
          granted: boolean;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id?: string | null;
          consent_type: string;
          granted: boolean;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string | null;
          consent_type?: string;
          granted?: boolean;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      gear_categories: {
        Row: {
          id: number;
          slug: string;
          name_tr: string;
          icon: string;
        };
        Insert: {
          id?: number;
          slug: string;
          name_tr: string;
          icon: string;
        };
        Update: {
          id?: number;
          slug?: string;
          name_tr?: string;
          icon?: string;
        };
        Relationships: [];
      };
      gear_items: {
        Row: {
          id: string;
          user_id: string;
          category: string;
          name: string;
          category_slug: string;
          brand: string | null;
          model: string | null;
          tier: number;
          photo_url: string | null;
          purchase_date: string | null;
          purchase_price: number | null;
          notes: string | null;
          is_favorite: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category: string;
          name: string;
          category_slug: string;
          brand?: string | null;
          model?: string | null;
          tier?: number;
          photo_url?: string | null;
          purchase_date?: string | null;
          purchase_price?: number | null;
          notes?: string | null;
          is_favorite?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category?: string;
          name?: string;
          category_slug?: string;
          brand?: string | null;
          model?: string | null;
          tier?: number;
          photo_url?: string | null;
          purchase_date?: string | null;
          purchase_price?: number | null;
          notes?: string | null;
          is_favorite?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          catch_id: string;
          reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          catch_id: string;
          reason: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          catch_id?: string;
          reason?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: Database["public"]["Enums"]["notification_type"];
          actor_id: string | null;
          ref_id: string | null;
          ref_type: string | null;
          title: string;
          body: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: Database["public"]["Enums"]["notification_type"];
          actor_id?: string | null;
          ref_id?: string | null;
          ref_type?: string | null;
          title: string;
          body: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: Database["public"]["Enums"]["notification_type"];
          actor_id?: string | null;
          ref_id?: string | null;
          ref_type?: string | null;
          title?: string;
          body?: string;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      deletion_requests: {
        Row: {
          id: number;
          user_id: string;
          requested_at: string;
          scheduled_at: string;
          completed_at: string | null;
          status: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          requested_at?: string;
          scheduled_at?: string;
          completed_at?: string | null;
          status?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          requested_at?: string;
          scheduled_at?: string;
          completed_at?: string | null;
          status?: string;
        };
        Relationships: [];
      };
      user_push_tokens: {
        Row: {
          user_id: string;
          token: string;
          platform: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          token: string;
          platform?: string | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          token?: string;
          platform?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      daily_questions: {
        Row: {
          id: string;
          date: string;
          question_tr: string;
          options: Json;
          correct_index: number | null;
          question_type: string;
          reveal_at: string;
          source_note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          question_tr: string;
          options: Json;
          correct_index?: number | null;
          question_type: string;
          reveal_at: string;
          source_note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          date?: string;
          question_tr?: string;
          options?: Json;
          correct_index?: number | null;
          question_type?: string;
          reveal_at?: string;
          source_note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      daily_question_answers: {
        Row: {
          id: number;
          user_id: string;
          question_id: string;
          chosen_index: number;
          is_correct: boolean | null;
          xp_earned: number;
          answered_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          question_id: string;
          chosen_index: number;
          is_correct?: boolean | null;
          xp_earned?: number;
          answered_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          question_id?: string;
          chosen_index?: number;
          is_correct?: boolean | null;
          xp_earned?: number;
          answered_at?: string;
        };
        Relationships: [];
      };
      daily_fish_challenges: {
        Row: {
          id: string;
          date: string;
          catch_id: string | null;
          photo_url: string;
          correct_species_id: number | null;
          correct_species_name: string;
          options: Json;
          fun_fact_tr: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          catch_id?: string | null;
          photo_url: string;
          correct_species_id?: number | null;
          correct_species_name: string;
          options: Json;
          fun_fact_tr?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          date?: string;
          catch_id?: string | null;
          photo_url?: string;
          correct_species_id?: number | null;
          correct_species_name?: string;
          options?: Json;
          fun_fact_tr?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      daily_fish_answers: {
        Row: {
          id: number;
          user_id: string;
          challenge_id: string;
          chosen_option: string;
          is_correct: boolean;
          xp_earned: number;
          answered_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          challenge_id: string;
          chosen_option: string;
          is_correct: boolean;
          xp_earned?: number;
          answered_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          challenge_id?: string;
          chosen_option?: string;
          is_correct?: boolean;
          xp_earned?: number;
          answered_at?: string;
        };
        Relationships: [];
      };
      weekly_challenges: {
        Row: {
          id: string;
          week_start: string;
          title_tr: string;
          description_tr: string;
          challenge_type: string;
          target_species_id: number | null;
          min_length_cm: number | null;
          xp_reward: number;
          badge_slug: string | null;
          ends_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          week_start: string;
          title_tr: string;
          description_tr: string;
          challenge_type: string;
          target_species_id?: number | null;
          min_length_cm?: number | null;
          xp_reward?: number;
          badge_slug?: string | null;
          ends_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          week_start?: string;
          title_tr?: string;
          description_tr?: string;
          challenge_type?: string;
          target_species_id?: number | null;
          min_length_cm?: number | null;
          xp_reward?: number;
          badge_slug?: string | null;
          ends_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      weekly_challenge_entries: {
        Row: {
          id: number;
          challenge_id: string;
          user_id: string;
          catch_id: string | null;
          value: number | null;
          rank: number | null;
          xp_earned: number;
          completed_at: string;
        };
        Insert: {
          id?: number;
          challenge_id: string;
          user_id: string;
          catch_id?: string | null;
          value?: number | null;
          rank?: number | null;
          xp_earned?: number;
          completed_at?: string;
        };
        Update: {
          id?: number;
          challenge_id?: string;
          user_id?: string;
          catch_id?: string | null;
          value?: number | null;
          rank?: number | null;
          xp_earned?: number;
          completed_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          participant_1: string;
          participant_2: string;
          last_message: string | null;
          last_message_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          participant_1: string;
          participant_2: string;
          last_message?: string | null;
          last_message_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          participant_1?: string;
          participant_2?: string;
          last_message?: string | null;
          last_message_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          body?: string;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      tournaments: {
        Row: {
          id: string;
          created_by: string;
          title: string;
          description: string | null;
          cover_image_url: string | null;
          status: Database["public"]["Enums"]["tournament_status"];
          starts_at: string;
          ends_at: string;
          city: string | null;
          fishing_type: string | null;
          scoring_type: string;
          max_participants: number | null;
          entry_fee: number;
          prize_description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          created_by: string;
          title: string;
          description?: string | null;
          cover_image_url?: string | null;
          status?: Database["public"]["Enums"]["tournament_status"];
          starts_at: string;
          ends_at: string;
          city?: string | null;
          fishing_type?: string | null;
          scoring_type?: string;
          max_participants?: number | null;
          entry_fee?: number;
          prize_description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          created_by?: string;
          title?: string;
          description?: string | null;
          cover_image_url?: string | null;
          status?: Database["public"]["Enums"]["tournament_status"];
          starts_at?: string;
          ends_at?: string;
          city?: string | null;
          fishing_type?: string | null;
          scoring_type?: string;
          max_participants?: number | null;
          entry_fee?: number;
          prize_description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      tournament_participants: {
        Row: {
          id: string;
          tournament_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          user_id?: string;
          joined_at?: string;
        };
        Relationships: [];
      };
      tournament_catches: {
        Row: {
          id: string;
          tournament_id: string;
          catch_id: string;
          user_id: string;
          score: number;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          catch_id: string;
          user_id: string;
          score?: number;
          submitted_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          catch_id?: string;
          user_id?: string;
          score?: number;
          submitted_at?: string;
        };
        Relationships: [];
      };
      catch_highlights: {
        Row: {
          id: string;
          user_id: string;
          catch_id: string;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          catch_id: string;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          catch_id?: string;
          display_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          type: Database['public']['Enums']['post_type'];
          title: string;
          body: string;
          cover_image_url: string | null;
          images: string[];
          like_count: number;
          comment_count: number;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type?: Database['public']['Enums']['post_type'];
          title: string;
          body: string;
          cover_image_url?: string | null;
          images?: string[];
          like_count?: number;
          comment_count?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: Database['public']['Enums']['post_type'];
          title?: string;
          body?: string;
          cover_image_url?: string | null;
          images?: string[];
          like_count?: number;
          comment_count?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      post_likes: {
        Row: {
          post_id: string;
          user_id: string;
        };
        Insert: {
          post_id: string;
          user_id: string;
        };
        Update: {
          post_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      post_comments: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      fishing_locations: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          type: Database['public']['Enums']['location_type'];
          location: string;
          photo_url: string | null;
          is_public: boolean;
          fish_species: string[];
          best_season: string | null;
          like_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          type?: Database['public']['Enums']['location_type'];
          location: string;
          photo_url?: string | null;
          is_public?: boolean;
          fish_species?: string[];
          best_season?: string | null;
          like_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          type?: Database['public']['Enums']['location_type'];
          location?: string;
          photo_url?: string | null;
          is_public?: boolean;
          fish_species?: string[];
          best_season?: string | null;
          like_count?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      location_likes: {
        Row: {
          location_id: string;
          user_id: string;
        };
        Insert: {
          location_id: string;
          user_id: string;
        };
        Update: {
          location_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      catches_public: {
        Row: {
          id: string;
          user_id: string;
          species_id: number | null;
          species_custom: string | null;
          length_cm: number | null;
          weight_g: number | null;
          photo_url: string | null;
          photo_blur_hash: string | null;
          location_name: string | null;
            location: string | null;
            is_catch_release: boolean;
            fishing_type: string | null;
            bait_name: string | null;
            notes: string | null;
          like_count: number;
          comment_count: number;
          xp_earned: number;
          created_at: string;
        };
        Relationships: [];
      };
      catches_public_detail: {
        Row: {
          id: string;
          user_id: string;
          species_id: number | null;
          species_custom: string | null;
          length_cm: number | null;
          weight_g: number | null;
          photo_url: string | null;
          photo_blur_hash: string | null;
          location: string | null;
          location_name: string | null;
          show_exact_location: boolean;
          show_measurements_public: boolean;
          show_location_public: boolean;
          show_method_public: boolean;
          show_notes_public: boolean;
          show_conditions_public: boolean;
          is_catch_release: boolean;
          fishing_type: string | null;
          bait_name: string | null;
          notes: string | null;
          xp_earned: number;
          like_count: number;
          comment_count: number;
          is_public: boolean;
          captured_at: string | null;
          air_temp_c: number | null;
          pressure_hpa: number | null;
          humidity_pct: number | null;
          weather_code: number | null;
          weather_label: string | null;
          wind_speed_kmh: number | null;
          wind_direction_deg: number | null;
          wind_direction_label: string | null;
          uv_index: number | null;
          wave_height_m: number | null;
          wave_direction_deg: number | null;
          sea_temp_c: number | null;
          sea_depth_m: number | null;
          sea_depth_source: string | null;
          sea_depth_is_approximate: boolean;
          moon_phase_label: string | null;
          moon_phase_emoji: string | null;
          fishing_score: number | null;
          fishing_score_label: string | null;
          created_at: string;
        };
        Relationships: [];
      };
      profile_stats: {
        Row: {
          user_id: string;
          catch_count: number;
          total_xp: number;
          level: number;
          biggest_catch_cm: number;
          biggest_catch_g: number;
          unique_species_count: number;
          release_count: number;
          catches_last_30_days: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      increment_xp: {
        Args: {
          p_user_id: string;
          p_amount: number;
        };
        Returns: void;
      };
      get_user_streak: {
        Args: {
          p_user_id: string;
        };
        Returns: number;
      };
      finalize_weekly_challenge: {
        Args: {
          challenge_id: string;
        };
        Returns: void;
      };
      get_top_species: {
        Args: {
          p_user_id: string;
          p_limit?: number;
        };
        Returns: {
          species_name: string;
          catch_count: number;
        }[];
      };
      mark_conversation_read: {
        Args: {
          p_conversation_id: string;
        };
        Returns: void;
      };
    };
    Enums: {
      location_type: "spot" | "marina" | "shop" | "hazard" | "other";
      notification_type:
        | "like"
        | "comment"
        | "follow"
        | "badge"
        | "level_up"
        | "weekly_challenge"
        | "daily_game"
        | "tournament";
      post_type: "tip" | "story" | "gear_review" | "spot_guide";
      tournament_status: "draft" | "active" | "finished";
    };
    CompositeTypes: Record<never, never>;
  };
};

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type Updates<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row'];
