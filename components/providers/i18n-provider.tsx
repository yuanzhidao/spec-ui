"use client";

import { NextIntlClientProvider } from "next-intl";
import type { LanguageMode } from "@/lib/dashboard-types";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";

const messages = {
  en,
  zh,
} as const;

export function I18nProvider({
  locale,
  children,
}: {
  locale: LanguageMode;
  children: React.ReactNode;
}) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages[locale]}
      timeZone="Asia/Shanghai"
    >
      {children}
    </NextIntlClientProvider>
  );
}
