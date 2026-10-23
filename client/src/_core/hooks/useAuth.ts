import { trpc } from "@/lib/trpc";
import { supabaseAuth } from "@/lib/supabaseAuth";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

let globalSessionReady = false;

export function useAuth(options?: UseAuthOptions) {
  // Login is started via startLogin() in the effect below, only when we actually
  // navigate — never during render. startLogin() mints a one-time nonce + writes
  // the state cookie, so calling it per render would overwrite the cookie and
  // desync it from an in-flight login's `state`.
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const utils = trpc.useUtils();
  const [sessionReady, setSessionReady] = useState(false);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: sessionReady,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    let mounted = true;
    if (globalSessionReady && mounted) {
      setSessionReady(true);
    }
    void supabaseAuth.auth
      .getSession()
      .then(({ data }) => {
        if (data?.session) globalSessionReady = true;
      })
      .catch(() => ({ data: { session: null }, error: null }))
      .finally(() => {
        if (mounted) setSessionReady(true);
      });
    const { data } = supabaseAuth.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      globalSessionReady = Boolean(session);
      setSessionReady(true);
      void utils.auth.me.invalidate();
    });
    return () => {
      mounted = false;
      data?.subscription?.unsubscribe();
    };
  }, [utils]);

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      await supabaseAuth.auth.signOut();
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    localStorage.setItem(
      "manus-runtime-user-info",
      JSON.stringify(meQuery.data)
    );
    const hasData = Boolean(meQuery.data);
    return {
      user: meQuery.data ?? null,
      loading: (!sessionReady && !hasData) || (meQuery.isLoading && !hasData) || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: hasData,
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    sessionReady,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    // Wait until the Supabase session has been restored and auth.me has
    // actually resolved; a disabled/in-flight query is not "unauthenticated".
    if (!sessionReady) return;
    if (meQuery.isLoading || meQuery.isFetching || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (redirectPath && window.location.pathname === redirectPath) return;

    window.location.href = redirectPath || "/access";
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    sessionReady,
    logoutMutation.isPending,
    meQuery.isLoading,
    meQuery.isFetching,
    state.user,
  ]);

  const refresh = useCallback(async () => {
    const res = await meQuery.refetch();
    if (res.data) {
      utils.auth.me.setData(undefined, res.data);
    }
    return res;
  }, [meQuery, utils]);

  return {
    ...state,
    refresh,
    logout,
  };
}
