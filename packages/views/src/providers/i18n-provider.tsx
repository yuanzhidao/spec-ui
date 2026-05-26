"use client";

import { NextIntlClientProvider } from "next-intl";
import type { LanguageMode } from "@spec-ui/core/dashboard/types";
import en from "@spec-ui/core/i18n/messages/en.json";
import zh from "@spec-ui/core/i18n/messages/zh.json";

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
