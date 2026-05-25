import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_RUNTIME_HTTP = "http://127.0.0.1:4317";
const DEFAULT_RUNTIME_WS = "ws://127.0.0.1:4317";

export function GET() {
  return NextResponse.json({
    httpBase:
      process.env.SPEC_UI_RUNTIME_HTTP ||
      process.env.NEXT_PUBLIC_SPEC_UI_RUNTIME_HTTP ||
      DEFAULT_RUNTIME_HTTP,
    wsBase:
      process.env.SPEC_UI_RUNTIME_WS ||
      process.env.NEXT_PUBLIC_SPEC_UI_RUNTIME_WS ||
      DEFAULT_RUNTIME_WS,
  });
}
