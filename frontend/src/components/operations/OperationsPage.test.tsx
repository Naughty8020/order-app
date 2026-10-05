// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Order } from "../../api/order";
import { requireLogin } from "../../api/auth";
import type { Menu } from "../../cart";
import { OperationsPage } from "./OperationsPage";

vi.mock("qrcode", () => ({
	default: { toDataURL: vi.fn(async () => "data:image/png;base64,qr") },
}));
vi.mock("../../api/auth", async (importOriginal) => ({
	...(await importOriginal<typeof import("../../api/auth")>()),
	requireLogin: vi.fn(),
}));
let menus: Menu[];
let orders: Order[];
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
	window.history.replaceState({}, "", "/");
	window.sessionStorage.clear();
	window.localStorage.setItem(
		"token",
		`e30.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`,
	);
	menus = [{ id: 1, name: "コーラ", price: 200, is_available: true }];
	orders = [
		{
			id: 7,
			status: "pending",
			created_at: "2026-10-04T12:00:00Z",
			order_items: [],
		},
	];
	vi.stubGlobal("fetch", fetchMock);
	fetchMock.mockImplementation(async (input, init) => {
		const url = String(input);
		if (url.endsWith("/order-access/qr"))
			return Response.json({
				token: "qr-token",
				expires_at: new Date(Date.now() + 600_000).toISOString(),
			});
		if (url.endsWith("/orders/7/status")) {
			orders = [
				{ ...orders[0], status: JSON.parse(String(init?.body)).status },
			];
			return Response.json({});
		}
		if (url.endsWith("/orders")) return Response.json({ orders });
		if (url.endsWith("/menus/1")) {
			menus =
				init?.method === "DELETE"
					? []
					: [{ ...menus[0], ...JSON.parse(String(init?.body)) }];
			return Response.json({});
		}
		if (url.endsWith("/menus")) {
			if (init?.method === "POST")
				menus = [...menus, { id: 2, ...JSON.parse(String(init.body)) }];
			return Response.json({ data: menus });
		}
		throw new Error(`Unexpected request: ${url}`);
	});
});

afterEach(() => {
	cleanup();
	window.localStorage.clear();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	fetchMock.mockReset();
	vi.mocked(requireLogin).mockClear();
});

it("requires login when switching from monitor to staff without a JWT", async () => {
	window.localStorage.clear();
	render(<OperationsPage initialMode="monitor" />);
	fireEvent.click(await screen.findByRole("button", { name: /スタッフ画面/ }));
	expect(requireLogin).toHaveBeenCalled();
	expect(screen.queryByRole("button", { name: /準備完了/ })).toBeNull();
});

it("processes pending orders through ready and completed, keeping history", async () => {
	render(<OperationsPage initialMode="staff" />);
	fireEvent.click(await screen.findByRole("button", { name: /準備完了/ }));
	fireEvent.click(await screen.findByRole("button", { name: /お渡し完了/ }));
	expect(await screen.findByText("処理待ちの注文はありません")).toBeTruthy();
	expect(screen.getByText("#7")).toBeTruthy();
	expect(fetchMock).toHaveBeenCalledWith(
		expect.stringMatching(/\/orders\/7\/status$/),
		expect.objectContaining({
			method: "PUT",
			body: JSON.stringify({ status: "completed" }),
		}),
	);
});

it("adds menus, changes availability and respects deletion cancellation", async () => {
	render(<OperationsPage initialMode="staff" />);
	fireEvent.click(await screen.findByTitle("販売を一時停止する"));
	expect(await screen.findByTitle("販売を再開する")).toBeTruthy();
	const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
	fireEvent.click(screen.getByTitle("削除"));
	expect(
		fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE"),
	).toBe(false);
	confirm.mockReturnValue(true);
	fireEvent.click(screen.getByTitle("削除"));
	await waitFor(() => expect(screen.queryByText("コーラ")).toBeNull());
	fireEvent.change(screen.getByLabelText("メニュー名"), {
		target: { value: "お茶" },
	});
	fireEvent.change(screen.getByLabelText("価格 (¥)"), {
		target: { value: "150" },
	});
	fireEvent.click(screen.getByRole("button", { name: "メニューリストに登録" }));
	expect(await screen.findByText("お茶")).toBeTruthy();
	expect(fetchMock).toHaveBeenCalledWith(
		expect.stringMatching(/\/menus$/),
		expect.objectContaining({
			method: "POST",
			body: JSON.stringify({ name: "お茶", price: 150, is_available: true }),
		}),
	);
});

it("shows the monitor's QR link and pending numbers", async () => {
	render(<OperationsPage initialMode="monitor" />);
	expect(await screen.findByAltText("QR Code")).toBeTruthy();
	expect(await screen.findByText("7")).toBeTruthy();
	expect(screen.getByText("お呼び出し中のオーダーはありません")).toBeTruthy();
	expect(screen.getByRole("link").getAttribute("href")).toBe(
		`${window.location.origin}/?order_token=qr-token`,
	);
});

it("retains the customer cart when switching between staff and customer modes", async () => {
	render(<OperationsPage initialMode="staff" />);
	await screen.findByText("コーラ");
	fireEvent.click(screen.getByRole("button", { name: /顧客メニュー/ }));
	fireEvent.click(
		await screen.findByRole("button", { name: "＋ カートに追加" }),
	);
	fireEvent.click(screen.getByRole("button", { name: /スタッフ画面/ }));
	fireEvent.click(screen.getByRole("button", { name: /顧客メニュー/ }));
	expect(screen.getByText("合計")).toBeTruthy();
	expect(screen.queryByText("トレイは空です")).toBeNull();
});
