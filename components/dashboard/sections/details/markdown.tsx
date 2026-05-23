"use client";

import ReactMarkdown from "react-markdown";

export function MarkdownSection({
  title,
  subtitle,
  markdown,
}: {
  title: string;
  subtitle?: string;
  markdown: string;
}) {
  return (
    <section className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle ? <p className="mt-1 truncate text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      <MarkdownBlock markdown={markdown} />
    </section>
  );
}

export function MarkdownBlock({ markdown }: { markdown: string }) {
  return (
    <div className="space-y-3 px-4 py-3 text-sm leading-6 text-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-foreground/90 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_ul]:space-y-1">
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  );
}
