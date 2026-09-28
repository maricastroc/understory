import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "@/test/axe";
import { AppHeader } from "./AppHeader";

const repo = {
  name: "acme/payments-service",
  detail: "main · a1b2c3d",
  url: "https://github.com/acme/payments-service",
  connected: true,
};

function renderHeader(overrides: Partial<Parameters<typeof AppHeader>[0]> = {}) {
  const props: Parameters<typeof AppHeader>[0] = {
    repo,
    onNewInRepo: vi.fn(),
    cases: [],
    onSelectCase: vi.fn(),
    fileSearch: null,
    onNewInvestigation: vi.fn(),
    user: null,
    onMenuClick: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<AppHeader {...props} />) };
}

describe("AppHeader", () => {
  it("shows the repository the case is pinned to and starts a new investigation there", async () => {
    const user = userEvent.setup();
    const { props } = renderHeader();
    const selector = screen.getByRole("button", { name: /acme\/payments-service/ });
    expect(selector.textContent).toContain("main · a1b2c3d");
    await user.click(selector);
    expect(screen.getByRole("link", { name: "Open repository ↗" }).getAttribute("href")).toBe(
      repo.url,
    );
    await user.click(screen.getByRole("button", { name: "New investigation here" }));
    expect(props.onNewInRepo).toHaveBeenCalledOnce();
  });

  it("offers a new investigation and a signed-in account menu", async () => {
    const user = userEvent.setup();
    const { props, container } = renderHeader({
      user: { login: "synthetic", name: "Synthetic User", avatarUrl: "" },
    });
    await user.click(screen.getByRole("button", { name: "New investigation" }));
    expect(props.onNewInvestigation).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Account: Synthetic User" }));
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeTruthy();
    expect((await axe(container)).violations).toEqual([]);
  });

  it("omits the repository selector before a repository is open", () => {
    renderHeader({ repo: null });
    expect(screen.queryByRole("button", { name: /payments-service/ })).toBeNull();
  });
});
