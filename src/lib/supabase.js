// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://gwpwntdwogxzmtegaaom.supabase.co';

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3cHdudGR3b2d4em10ZWdhYW9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2NzAyMjAsImV4cCI6MjA2MDI0NjIyMH0.kN83W-jHuNS6GX7kYCaBxx-1k3X964rkhdKAGaza8G4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: window.localStorage,
  },
});

/**
 * Obtiene una sesión válida, renovando el token automáticamente si está expirado o próximo a expirar.
 */
export async function ensureAuthenticatedSession() {
  try {
    const isLoggedOut = localStorage.getItem('app_logged_out');
    if (isLoggedOut === 'true') {
      return null;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      const nowSec = Math.floor(Date.now() / 1000);
      if (session.expires_at && session.expires_at < nowSec + 120) {
        const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
        if (!refreshErr && refreshData?.session) {
          return refreshData.session;
        }
      }
      return session;
    }

    const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
    if (!refreshErr && refreshData?.session) {
      return refreshData.session;
    }
  } catch (err) {
    console.warn('ensureAuthenticatedSession error:', err);
  }
  return null;
}

