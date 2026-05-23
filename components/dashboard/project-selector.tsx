"use client";

import { FolderOpen, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { FormEvent, useState } from "react";
import type { RuntimeIssue } from "@/lib/dashboard-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProjectSelector({
  issue,
  busy,
  onBind,
}: {
  issue?: RuntimeIssue;
  busy: boolean;
  onBind: (path: string) => void;
}) {
  const t = useTranslations("projectSelector");
  const [path, setPath] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!path.trim()) {
      return;
    }
    onBind(path);
    setPath("");
  }

  return (
    <form className="space-y-2" onSubmit={submit}>
      <div className="space-y-1">
        <p className="text-sm font-medium">{t("title")}</p>
        <p className="text-xs text-muted-foreground">
          {t("description")}
        </p>
      </div>
      <div className="flex gap-2">
        <Input
          value={path}
          onChange={(event) => setPath(event.target.value)}
          placeholder={t("placeholder")}
          className="h-8 bg-background shadow-none"
        />
        <Button type="submit" disabled={busy} className="h-8 shrink-0">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <FolderOpen className="size-4" />}
          {t("bind")}
        </Button>
      </div>
      {issue ? <IssueText issue={issue} /> : null}
    </form>
  );
}

function IssueText({ issue }: { issue: RuntimeIssue }) {
  return (
    <div className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive">
      <p className="font-medium">{issue.message}</p>
      {issue.detail ? <p className="mt-1 text-destructive/80">{issue.detail}</p> : null}
    </div>
  );
}
