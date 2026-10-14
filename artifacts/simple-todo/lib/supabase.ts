import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

function resolveProjectUrl(project: string | undefined): string | null {
  const value = project?.trim();
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      return url.toString().replace(/\/$/, '');
    } catch {
      return null;
    }
  }

  if (/^[a-z0-9-]+$/i.test(value)) {
    return `https://${value}.supabase.co`;
  }

  return null;
}

const supabaseUrl = resolveProjectUrl(process.env.EXPO_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigError = !supabaseUrl
  ? 'The Supabase project URL is missing or invalid. Check the PROJECT secret.'
  : !supabaseAnonKey
    ? 'The Supabase publishable or anon key is missing. Check the ANON_KEY secret.'
    : null;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
