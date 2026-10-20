// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { OrderTracking } from "./OrderTracking";

afterEach(cleanup);

it("shows completed receipts with the original item name and order price", () => {
	render(
		<OrderTracking
			fetchData={vi.fn()}
			orders={[
				{
					id: 7,
					status: "completed",
					created_at: "2026-10-20T00:00:00Z",
					order_items: [
						{
							id: 1,
							order_id: 7,
							menu_id: 1,
							name: "注文時のお茶",
							option: "ジュース：オレンジジュース",
							price: 200,
							quantity: 2,
							menu: {
								id: 1,
								name: "変更後のお茶",
								price: 300,
								is_available: true,
							},
						},
					],
				},
			]}
		/>,
	);
	expect(screen.getByRole("heading", { name: "受け取り済み" })).toBeTruthy();
	expect(screen.getByText("注文時のお茶 × 2")).toBeTruthy();
	expect(screen.getByText("ジュース：オレンジジュース")).toBeTruthy();
	expect(screen.getByText("注文合計 ¥400")).toBeTruthy();
	expect(screen.queryByText("変更後のお茶")).toBeNull();
});
