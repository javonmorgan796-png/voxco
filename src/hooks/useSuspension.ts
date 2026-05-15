import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useSuspension = () => {
  const [isSuspended, setIsSuspended] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        if (mounted) { setIsSuspended(false); setLoading(false); }
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("is_suspended")
        .eq("id", session.user.id)
        .maybeSingle();
      if (!mounted) return;
      setIsSuspended(!!data?.is_suspended);
      setLoading(false);
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());

    // Realtime subscription so admin suspending takes effect immediately
    const channel = supabase
      .channel("profile_suspension_self")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const row = payload.new as { id: string; is_suspended: boolean };
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user.id === row.id) setIsSuspended(!!row.is_suspended);
          });
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  return { isSuspended, loading };
};
