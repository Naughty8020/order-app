// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import QRCode from "qrcode";
import { afterEach, expect, it, vi } from "vitest";
import { useOrderQR } from "./useOrderQR";

vi.mock("qrcode", () => ({
	default: { toDataURL: vi.fn(async () => "data:image/png;base64,qr") },
}));
afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

it("refreshes the QR after expiration and cancels its timer on unmount", async () => {
	vi.useFakeTimers();
	const fetchMock = vi.fn(async () =>
		Response.json({
			token: "token",
			expires_at: new Date(Date.now() + 600_000).toISOString(),
		}),
	);
	vi.stubGlobal("fetch", fetchMock);
	const showToast = vi.fn();
	const { result, unmount } = renderHook(() => useOrderQR(showToast));
	await act(async () => {
		await vi.advanceTimersByTimeAsync(0);
	});
	expect(result.current.qrUrl).toContain("order_token=token");
	expect(QRCode.toDataURL).toHaveBeenCalledWith(result.current.qrUrl, {
		width: 280,
		margin: 2,
	});
	await act(async () => {
		await vi.advanceTimersByTimeAsync(601_000);
	});
	expect(fetchMock).toHaveBeenCalledTimes(2);
	unmount();
	await vi.advanceTimersByTimeAsync(601_000);
	expect(fetchMock).toHaveBeenCalledTimes(2);
});
