import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PortalStoreProvider, getCurrentAuth } from "@/lib/portal/store";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "Portal Agusmaq" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PortalRoot,
});

function PortalRoot() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLogin = pathname === "/portal/login";
  const [state, setState] = useState<"loading" | "ok" | "denied">("loading");

  useEffect(() => {
    if (isLogin) { setState("ok"); return; }
    let alive = true;
    const check = async () => {
      const auth = await getCurrentAuth();
      if (!alive) return;
      if (!auth) {
        setState("denied");
        window.location.replace("/portal/login");
        return;
      }
      setState("ok");
    };
    check();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") window.location.replace("/portal/login");
      if (event === "SIGNED_IN" || event === "USER_UPDATED") check();
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [isLogin]);

  if (isLogin) return <Outlet />;

  if (state !== "ok") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F4F4] text-sm text-[#6E7280]">
        Carregando…
      </div>
    );
  }

  return (
    <PortalStoreProvider>
      <Outlet />
    </PortalStoreProvider>
  );
}

