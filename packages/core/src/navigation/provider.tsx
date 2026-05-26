"use client";

import { createContext, useContext, useMemo, useTransition } from "react";

export type NavigationAdapter = {
  push(path: string): void;
  replace(path: string): void;
  back(): void;
  pathname: string;
  searchParams: URLSearchParams;
  prefetch?(path: string): void;
};

const NavigationContext = createContext<NavigationAdapter | null>(null);
const NavigationPendingContext = createContext(false);

export function NavigationProvider({
  value,
  children,
}: {
  value: NavigationAdapter;
  children: React.ReactNode;
}) {
  const [isPending, startTransition] = useTransition();
  const wrapped = useMemo<NavigationAdapter>(
    () => ({
      ...value,
      push: (path: string) => startTransition(() => value.push(path)),
      replace: (path: string) => startTransition(() => value.replace(path)),
    }),
    [value],
  );

  return (
    <NavigationContext.Provider value={wrapped}>
      <NavigationPendingContext.Provider value={isPending}>
        {children}
      </NavigationPendingContext.Provider>
    </NavigationContext.Provider>
  );
}

export function useNavigation(): NavigationAdapter {
  const navigation = useContext(NavigationContext);
  if (!navigation) {
    throw new Error("useNavigation must be used within NavigationProvider");
  }

  return navigation;
}

export function useIsNavigating(): boolean {
  return useContext(NavigationPendingContext);
}
