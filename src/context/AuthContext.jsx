import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, ensureAuthenticatedSession } from '../lib/supabase';
import { appAlert } from '../components/AppAlert';
import { getBillingStatus } from '../services/billingService';
import {
  hasConfiguredPin,
  recordBackgroundTimestamp,
  shouldLockOnForeground,
  clearPin,
} from '../services/pinService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [billingStatus, setBillingStatus] = useState(null);
  const [isPinLocked, setIsPinLocked] = useState(true);
  const [hasPin, setHasPin] = useState(false);

  const fetchUserData = useCallback(async (userId) => {
    try {
      const { data: dbProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && dbProfile) {
        return dbProfile;
      }
    } catch (e) {
      console.warn('Error consultando profile en web:', e);
    }
    return null;
  }, []);

  const refreshProfile = useCallback(async () => {
    const sess = await ensureAuthenticatedSession();
    if (sess?.user) {
      const p = await fetchUserData(sess.user.id);
      if (p && p.activo === false) {
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        appAlert('Cuenta inhabilitada', 'Tu cuenta ha sido inhabilitada por el administrador.');
        return;
      }
      if (p) setProfile(p);
      try {
        const b = await getBillingStatus();
        setBillingStatus(b);
      } catch {}
    }
  }, [fetchUserData]);

  useEffect(() => {
    let mounted = true;

    const checkSessionAndBilling = async (sess) => {
      if (!sess?.user) {
        if (mounted) {
          setSession(null);
          setProfile(null);
          setBillingStatus(null);
          setLoading(false);
        }
        return;
      }

      const p = await fetchUserData(sess.user.id);
      if (p && p.activo === false) {
        await supabase.auth.signOut();
        if (mounted) {
          setSession(null);
          setProfile(null);
          setBillingStatus(null);
          setLoading(false);
          appAlert('Cuenta inhabilitada', 'Tu cuenta ha sido inhabilitada por el administrador.');
        }
        return;
      }

      if (mounted) {
        setProfile(p);
        setSession(sess);
        setLoading(false);
      }

      try {
        const b = await getBillingStatus();
        if (mounted) setBillingStatus(b);
      } catch (eB) {
        console.warn('Error cargando estado de facturación:', eB);
      }
    };

    const init = async () => {
      try {
        const pinExists = await hasConfiguredPin();
        if (mounted) {
          setHasPin(pinExists);
          setIsPinLocked(pinExists);
        }
      } catch {}

      try {
        const isLoggedOut = localStorage.getItem('app_logged_out');
        if (isLoggedOut === 'true') {
          if (mounted) {
            setSession(null);
            setProfile(null);
            setBillingStatus(null);
            setLoading(false);
          }
          return;
        }

        const sess = await ensureAuthenticatedSession();
        if (mounted) {
          await checkSessionAndBilling(sess);
        }
      } catch (err) {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'SIGNED_OUT') {
        localStorage.setItem('app_logged_out', 'true');
        if (mounted) {
          setSession(null);
          setProfile(null);
          setBillingStatus(null);
          setLoading(false);
        }
      } else if (newSession) {
        localStorage.removeItem('app_logged_out');
        await checkSessionAndBilling(newSession);
      }
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [fetchUserData]);

  // Listener de visibilidad de pestaña para bloqueo por inactividad
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        await recordBackgroundTimestamp();
      } else if (document.visibilityState === 'visible') {
        const mustLock = await shouldLockOnForeground();
        if (mustLock) {
          setIsPinLocked(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const unlockApp = useCallback(() => {
    setIsPinLocked(false);
  }, []);

  const lockApp = useCallback(() => {
    setIsPinLocked(true);
  }, []);

  const refreshPinStatus = useCallback(async () => {
    const configured = await hasConfiguredPin();
    setHasPin(configured);
    return configured;
  }, []);

  const setAuthSession = useCallback((sess, p) => {
    localStorage.removeItem('app_logged_out');
    setProfile(p || null);
    setSession(sess || null);
    setLoading(false);
    if (p) {
      localStorage.setItem('cached_profile', JSON.stringify(p));
    }
    hasConfiguredPin()
      .then((has) => {
        setHasPin(has);
        if (has) setIsPinLocked(false);
      })
      .catch(() => {});
  }, []);

  const signOut = useCallback(async () => {
    // 1. Limpiar PIN configurado
    try {
      await clearPin();
      setHasPin(false);
      setIsPinLocked(false);
    } catch {}

    // 2. Marcar cierre de sesión y desloguear
    localStorage.setItem('app_logged_out', 'true');
    try {
      await supabase.auth.signOut();
    } catch {}
    localStorage.removeItem('cached_profile');
    localStorage.removeItem('cached_billing_status');
    setSession(null);
    setProfile(null);
    setBillingStatus(null);
    return true;
  }, []);

  const refreshBillingStatus = useCallback(async () => {
    try {
      const bStatus = await getBillingStatus();
      if (bStatus) setBillingStatus(bStatus);
      return bStatus;
    } catch (e) {
      console.warn('Error refreshing billing status:', e);
      return null;
    }
  }, []);

  const value = {
    session,
    profile,
    rol: profile?.rol || (session ? 'vendedor' : null),
    userId: session?.user?.id || null,
    accessToken: session?.access_token || null,
    loading,
    refreshProfile,
    signOut,
    setAuthSession,
    billingStatus,
    billingConfig: billingStatus?.config || null,
    isReadOnly: billingStatus?.is_read_only === true,
    isSuspended: billingStatus?.is_suspended === true,
    refreshBillingStatus,
    isPinLocked,
    hasPin,
    unlockApp,
    lockApp,
    refreshPinStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
