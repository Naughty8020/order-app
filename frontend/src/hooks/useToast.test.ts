// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useToast } from "./useToast";

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

it("keeps the latest notification visible for three seconds and cleans up on unmount", () => {
	vi.useFakeTimers();
	const { result, unmount } = renderHook(() => useToast());
	act(() => result.current.showToast("最初"));
	act(() => vi.advanceTimersByTime(2000));
	act(() => result.current.showToast("最新"));
	act(() => vi.advanceTimersByTime(1000));
	expect(result.current.toast?.message).toBe("最新");
	act(() => vi.advanceTimersByTime(2000));
	expect(result.current.toast).toBeNull();
	act(() => result.current.showToast("終了前"));
	unmount();
	expect(vi.getTimerCount()).toBe(0);
});
