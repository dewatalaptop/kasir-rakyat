// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BugBoundary } from "../BugBoundary";

afterEach(() => {
  cleanup();
  delete window.BugReporter;
});

function Boom(): never {
  throw new Error("render exploded");
}

describe("BugBoundary", () => {
  it("reports a render crash to the bug reporter and shows a recovery screen instead of a blank page", () => {
    const captureException = vi.fn(() => true);
    window.BugReporter = { captureException, openDialog: vi.fn() };
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <BugBoundary>
        <Boom />
      </BugBoundary>
    );
    expect(screen.getByText("Ada yang tidak beres")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Muat ulang" })).toBeTruthy();
    expect(captureException).toHaveBeenCalledTimes(1);
    const [err, ctx, kind] = captureException.mock.calls[0] as unknown as [Error, Record<string, string>, string];
    expect(err.message).toBe("render exploded");
    expect(kind).toBe("crash");
    expect(typeof ctx.componentStack).toBe("string");
  });

  it("still shows the recovery screen when the reporter script is not present", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <BugBoundary>
        <Boom />
      </BugBoundary>
    );
    expect(screen.getByText("Ada yang tidak beres")).toBeTruthy();
  });

  it("renders children untouched when nothing throws", () => {
    render(
      <BugBoundary>
        <p>halo</p>
      </BugBoundary>
    );
    expect(screen.getByText("halo")).toBeTruthy();
  });
});
