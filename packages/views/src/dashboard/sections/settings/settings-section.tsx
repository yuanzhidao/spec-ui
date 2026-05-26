"use client";

import { Activity, CheckCircle2, SlidersHorizontal } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import type { DashboardData, LanguageMode, RuntimeSettings, ThemeMode } from "@spec-ui/core/dashboard/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@spec-ui/ui/tabs";
import { useNavigation } from "@spec-ui/core/navigation/provider";
import { isSettingsTab, paths } from "@spec-ui/core/navigation/routes";
import { cn } from "@spec-ui/core/shared/utils";
import { KeyValue } from "../shared/section-shared";

export function SettingsSection({
  data,
  settings,
  onThemeChange,
  onLanguageChange,
}: {
  data: DashboardData;
  settings?: RuntimeSettings;
  onThemeChange: (mode: ThemeMode) => void;
  onLanguageChange: (language: LanguageMode) => void;
}) {
  const t = useTranslations("settings");
  const navigation = useNavigation();
  const tabParam = navigation.searchParams.get("tab");
  const activeTab = tabParam && isSettingsTab(tabParam) ? tabParam : "preferences";

  function changeTab(tab: string) {
    if (!isSettingsTab(tab)) {
      return;
    }
    navigation.replace(paths.settings(tab));
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={changeTab}
      orientation="vertical"
      className="flex min-h-[calc(100dvh-3rem)] flex-col gap-0 md:flex-row md:overflow-hidden"
    >
      <div className="shrink-0 border-b p-3 md:w-52 md:border-b-0 md:border-r md:p-4">
        <h1 className="mb-4 px-2 text-sm font-semibold">{t("title")}</h1>
        <TabsList variant="line" className="w-full flex-col items-stretch">
          <span className="px-2 pb-1 pt-2 text-xs font-medium text-muted-foreground">
            {t("personal")}
          </span>
          <TabsTrigger value="preferences">
            <SlidersHorizontal className="size-4" />
            {t("tabs.preferences")}
          </TabsTrigger>

          <span className="truncate px-2 pb-1 pt-4 text-xs font-medium text-muted-foreground">
            {t("runtime")}
          </span>
          <TabsTrigger value="validation">
            <CheckCircle2 className="size-4" />
            {t("tabs.validation")}
          </TabsTrigger>
          <TabsTrigger value="system">
            <Activity className="size-4" />
            {t("tabs.system")}
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="min-w-0 flex-1 md:overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
          <TabsContent value="preferences">
            <PreferencesPanel
              settings={settings}
              onThemeChange={onThemeChange}
              onLanguageChange={onLanguageChange}
            />
          </TabsContent>
          <TabsContent value="validation">
            <SettingsValidationPanel data={data} />
          </TabsContent>
          <TabsContent value="system">
            <SettingsSystemPanel data={data} settings={settings} />
          </TabsContent>
        </div>
      </div>
    </Tabs>
  );
}

function PreferencesPanel({
  settings,
  onThemeChange,
  onLanguageChange,
}: {
  settings?: RuntimeSettings;
  onThemeChange: (mode: ThemeMode) => void;
  onLanguageChange: (language: LanguageMode) => void;
}) {
  const t = useTranslations("settings.preferences");
  const { theme } = useTheme();
  const activeTheme = (theme || settings?.themeMode || "light") as ThemeMode;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold">{t("theme")}</h2>
        <div className="flex flex-wrap gap-6" role="radiogroup">
          {(["light", "dark", "system"] as const).map((mode) => (
            <ThemePreviewChoice
              key={mode}
              mode={mode}
              active={activeTheme === mode}
              onSelect={() => onThemeChange(mode)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">{t("language")}</h2>
        <LanguageControl value={settings?.language || "en"} onChange={onLanguageChange} />
      </section>
    </div>
  );
}

function ThemePreviewChoice({
  mode,
  active,
  onSelect,
}: {
  mode: ThemeMode;
  active: boolean;
  onSelect: () => void;
}) {
  const t = useTranslations("settings.preferences");
  const label = t(mode);

  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className="group flex flex-col items-center gap-2"
    >
      <div
        className={cn(
          "aspect-[4/3] w-36 overflow-hidden rounded-lg ring-1 transition-all",
          active ? "ring-2 ring-brand" : "ring-border hover:ring-2 hover:ring-border",
        )}
      >
        {mode === "system" ? (
          <div className="relative size-full">
            <WindowMockup variant="light" className="absolute inset-0" />
            <WindowMockup variant="dark" className="absolute inset-0 [clip-path:inset(0_0_0_50%)]" />
          </div>
        ) : (
          <WindowMockup variant={mode} />
        )}
      </div>
      <span className={cn("text-sm transition-colors", active ? "font-medium text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
    </button>
  );
}

function WindowMockup({
  variant,
  className,
}: {
  variant: "light" | "dark";
  className?: string;
}) {
  const colors =
    variant === "light"
      ? {
          titleBar: "#e8e8e8",
          content: "#ffffff",
          sidebar: "#f4f4f5",
          bar: "#e4e4e7",
          barMuted: "#d4d4d8",
        }
      : {
          titleBar: "#333338",
          content: "#27272a",
          sidebar: "#1e1e21",
          bar: "#3f3f46",
          barMuted: "#52525b",
        };

  return (
    <div className={cn("flex size-full flex-col", className)}>
      <div className="flex items-center gap-[3px] px-2 py-1.5" style={{ backgroundColor: colors.titleBar }}>
        <span className="size-[6px] rounded-full bg-[#ff5f57]" />
        <span className="size-[6px] rounded-full bg-[#febc2e]" />
        <span className="size-[6px] rounded-full bg-[#28c840]" />
      </div>
      <div className="flex flex-1" style={{ backgroundColor: colors.content }}>
        <div className="w-[30%] space-y-1 p-2" style={{ backgroundColor: colors.sidebar }}>
          <div className="h-1 w-3/4 rounded-full" style={{ backgroundColor: colors.bar }} />
          <div className="h-1 w-1/2 rounded-full" style={{ backgroundColor: colors.bar }} />
        </div>
        <div className="flex-1 space-y-1.5 p-2">
          <div className="h-1.5 w-4/5 rounded-full" style={{ backgroundColor: colors.bar }} />
          <div className="h-1 w-full rounded-full" style={{ backgroundColor: colors.barMuted }} />
          <div className="h-1 w-3/5 rounded-full" style={{ backgroundColor: colors.barMuted }} />
        </div>
      </div>
    </div>
  );
}

function SettingsValidationPanel({ data }: { data: DashboardData }) {
  const t = useTranslations("settings");

  return (
    <div className="space-y-4">
      <SettingsPanelHeader title={t("panels.validationTitle")} description={t("panels.validationDescription")} />
      <div className="divide-y rounded-lg border">
        <KeyValue label={t("keys.status")} value={data.validation.status} />
        <KeyValue label={t("keys.command")} value={data.validation.command || t("values.notRun")} />
        <KeyValue label={t("keys.exitCode")} value={String(data.validation.exitCode ?? t("values.none"))} />
        <KeyValue label={t("keys.started")} value={data.validation.startedAt || t("values.none")} />
        <KeyValue label={t("keys.ended")} value={data.validation.endedAt || t("values.none")} />
      </div>
    </div>
  );
}

function SettingsSystemPanel({
  data,
  settings,
}: {
  data: DashboardData;
  settings?: RuntimeSettings;
}) {
  const t = useTranslations("settings");
  const discovery = data.project?.discovery;

  return (
    <div className="space-y-4">
      <SettingsPanelHeader title={t("panels.systemTitle")} description={t("panels.systemDescription")} />
      <div className="divide-y rounded-lg border">
        <KeyValue label={t("keys.settingsVersion")} value={String(settings?.version ?? 2)} />
        <KeyValue label={t("keys.watcher")} value={data.realtime.watcher} />
        <KeyValue label={t("keys.connection")} value={data.realtime.connection} />
        <KeyValue label={t("keys.dialect")} value={data.project?.dialect || t("values.mixed")} />
        <KeyValue label={t("keys.openspecDirectory")} value={String(Boolean(discovery?.hasOpenSpecDir))} />
        <KeyValue label={t("keys.scopes")} value={String(discovery?.scopes.length ?? 0)} />
        <KeyValue label={t("keys.config")} value={String(Boolean(discovery?.hasConfig))} />
        <KeyValue label={t("keys.specsDirectory")} value={String(Boolean(discovery?.hasSpecsDir))} />
        <KeyValue label={t("keys.changesDirectory")} value={String(Boolean(discovery?.hasChangesDir))} />
      </div>
    </div>
  );
}

function SettingsPanelHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function LanguageControl({
  value,
  onChange,
}: {
  value: LanguageMode;
  onChange: (language: LanguageMode) => void;
}) {
  const t = useTranslations("settings.preferences");

  return (
    <div className="flex flex-wrap gap-3" role="radiogroup">
      {(["en", "zh"] as const).map((language) => (
        <button
          key={language}
          type="button"
          role="radio"
          aria-checked={value === language}
          className={cn(
            "rounded-md border px-4 py-2 text-sm transition-colors",
            value === language
              ? "border-brand bg-brand/10 font-medium text-foreground"
              : "border-border text-muted-foreground hover:border-foreground/30",
          )}
          onClick={() => onChange(language)}
        >
          {language === "en" ? t("english") : t("chinese")}
        </button>
      ))}
    </div>
  );
}
