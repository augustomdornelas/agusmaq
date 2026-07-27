import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { PortalStoreProvider, loadAuth } from "@/lib/portal/store";

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "Portal Agusmaq" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: ({ location }) => {
    if (typeof window === "undefined") return;
    const auth = loadAuth();
    const isLogin = location.pathname === "/portal/login";
    if (!auth && !isLogin) {
      throw redirect({ to: "/portal/login" });
    }
    if (auth && isLogin) {
      throw redirect({ to: "/portal/dashboard" });
    }
  },
  component: PortalRoot,
});

function PortalRoot() {
  const pathname = useRouterState({ select: s => s.location.pathname });
  // login não usa provider (não precisa) — mas provider é barato; envolve tudo
  return (
    <PortalStoreProvider>
      <Outlet />
    </PortalStoreProvider>
  );
}
