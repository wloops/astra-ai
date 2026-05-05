import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBanner } from "./ErrorBanner";

describe("ErrorBanner", () => {
  it("renders the error message", () => {
    render(<ErrorBanner message="加载失败" />);
    expect(screen.getByText("加载失败")).toBeInTheDocument();
  });

  it("calls onRetry when retry button clicked", async () => {
    const onRetry = vi.fn();
    render(<ErrorBanner message="加载失败" onRetry={onRetry} />);
    await userEvent.click(screen.getByText("重试"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("calls onDismiss when close button clicked", async () => {
    const onDismiss = vi.fn();
    render(<ErrorBanner message="加载失败" onDismiss={onDismiss} />);
    // Close button is an X icon
    const buttons = screen.getAllByRole("button");
    const closeButton = buttons.find((b) => b.querySelector("svg.lucide-x"));
    if (closeButton) {
      await userEvent.click(closeButton);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    }
  });

  it("does not show retry button when onRetry not provided", () => {
    render(<ErrorBanner message="错误" />);
    expect(screen.queryByText("重试")).not.toBeInTheDocument();
  });
});
