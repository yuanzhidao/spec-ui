import { describe, expect, it } from "vitest";
import {
  desktopRouteHandles,
  formatDesktopDocumentTitle,
  readDesktopRouteHandle,
} from "./route-handles";

describe("desktop route handles", () => {
  it("uses the deepest desktop route handle", () => {
    expect(
      readDesktopRouteHandle([
        { handle: desktopRouteHandles.specs },
        { handle: desktopRouteHandles.specDetail },
      ]),
    ).toBe(desktopRouteHandles.specDetail);
  });

  it("falls back to the product title when a route has no handle", () => {
    expect(readDesktopRouteHandle([{ handle: { other: true } }])).toEqual({
      title: "spec-ui",
      label: "spec-ui",
    });
  });

  it("formats document titles with a stable app suffix", () => {
    expect(formatDesktopDocumentTitle(desktopRouteHandles.changes)).toBe(
      "Changes - spec-ui",
    );
    expect(
      formatDesktopDocumentTitle({ title: "spec-ui", label: "spec-ui" }),
    ).toBe("spec-ui");
  });
});
