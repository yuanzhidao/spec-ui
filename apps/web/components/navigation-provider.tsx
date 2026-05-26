"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NavigationProvider, type NavigationAdapter } from "@spec-ui/core/navigation/provider";

export function WebNavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const adapter: NavigationAdapter = {
    push: router.push,
    replace: router.replace,
    back: router.back,
    pathname,
    searchParams: new URLSearchParams(searchParams.toString()),
    prefetch: router.prefetch,
  };

  return <NavigationProvider value={adapter}>{children}</NavigationProvider>;
}
