// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useCustomerOrder } from "../../hooks/customer/useCustomerOrder";
import { CartTray } from "./CartTray";
import { MenuGrid } from "./MenuGrid";
import { OrderSuccessModal } from "./OrderSuccessModal";
import { OrderTracking } from "./OrderTracking";

function CustomerOrder() {
	const state = useCustomerOrder();
	return (
		<>
			<MenuGrid {...state} />
			<CartTray {...state} />
			<OrderTracking orders={state.orders} fetchData={state.fetchData} />
			<OrderSuccessModal
				orderId={state.successModal.show ? state.successModal.orderId : null}
				onClose={() => state.setSuccessModal({ show: false, orderId: null })}
			/>
		</>
	);
}

afterEach(() => {
	cleanup();
	window.sessionStorage.clear();
	vi.unstubAllGlobals();
});

it("connects menu selection, the cart and the order confirmation after splitting components", async () => {
	window.history.replaceState({}, "", "/");
	window.sessionStorage.setItem(
		"order_session",
		JSON.stringify({
			token: "session-token",
			expiresAt: new Date(Date.now() + 60_000).toISOString(),
		}),
	);
	const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
		if (String(input).endsWith("/menus")) {
			return Response.json({
				data: [
					{ id: 1, name: "コーラ", price: 200, is_available: true },
					{ id: 2, name: "オレンジ", price: 300, is_available: false },
				],
			});
		}
		if (String(input).endsWith("/orders")) {
			return Response.json(
				init?.method === "POST" ? { id: 42 } : { orders: [] },
			);
		}
		throw new Error(`Unexpected request: ${input}`);
	});
	vi.stubGlobal("fetch", fetchMock);
	render(<CustomerOrder />);
	fireEvent.click(
		await screen.findByRole("button", { name: "＋ カートに追加" }),
	);
	expect(screen.getByText("SOLD OUT")).toBeTruthy();
	expect(screen.getByText("合計")).toBeTruthy();
	fireEvent.click(screen.getByRole("button", { name: "注文を確定する" }));
	expect(await screen.findByText("ご注文ありがとうございます！")).toBeTruthy();
	expect(screen.getByText("#42")).toBeTruthy();
	expect(screen.getByText("トレイは空です")).toBeTruthy();
	fireEvent.click(screen.getByRole("button", { name: "確認して閉じる" }));
	await waitFor(() =>
		expect(screen.queryByText("ご注文ありがとうございます！")).toBeNull(),
	);
	expect(fetchMock).toHaveBeenCalledWith(
		expect.stringMatching(/\/orders$/),
		expect.objectContaining({
			method: "POST",
			body: JSON.stringify({ items: [{ menu_id: 1, quantity: 1 }] }),
		}),
	);
});
