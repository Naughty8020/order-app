// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useOrderData } from "./useOrderData";

afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

it("polls every four seconds, announces only newly ready orders, and stops on unmount", async () => {
	vi.useFakeTimers();
	let status = "pending";
	const fetchMock = vi.fn(async (input: RequestInfo | URL) =>
		Response.json(
			String(input).endsWith("/menus")
				? { data: [] }
				: { orders: [{ id: 7, status, order_items: [] }] },
		),
	);
	const speak = vi.fn();
	vi.stubGlobal("fetch", fetchMock);
	vi.stubGlobal("speechSynthesis", { speak });
	vi.stubGlobal(
		"SpeechSynthesisUtterance",
		class {
			lang = "";
			constructor(public text: string) {}
		},
	);
	const { result, unmount } = renderHook(() => useOrderData());
	await act(async () => {
		await vi.advanceTimersByTimeAsync(0);
	});
	expect(speak).not.toHaveBeenCalled();
	status = "ready";
	await act(async () => {
		await vi.advanceTimersByTimeAsync(4000);
	});
	expect(result.current.orders[0].status).toBe("ready");
	expect(speak).toHaveBeenCalledWith(
		expect.objectContaining({
			lang: "ja-JP",
			text: "オーダー番号、7、できあがりました。",
		}),
	);
	await act(async () => {
		await vi.advanceTimersByTimeAsync(4000);
	});
	expect(speak).toHaveBeenCalledTimes(1);
	const requests = fetchMock.mock.calls.length;
	unmount();
	await vi.advanceTimersByTimeAsync(4000);
	expect(fetchMock).toHaveBeenCalledTimes(requests);
});
