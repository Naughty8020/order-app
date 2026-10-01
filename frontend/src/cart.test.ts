import { describe, expect, it } from "vitest";
import {
	type Cart,
	changeCartQuantity,
	getCartSummary,
	type Menu,
} from "./cart";

const cola: Menu = { id: 1, name: "コーラ", price: 200, is_available: true };
const tea: Menu = { id: 2, name: "お茶", price: 150, is_available: true };

describe("changeCartQuantity", () => {
	it("数量を増減し、元のカートは変更しない", () => {
		const cart: Cart = { 1: { menu: cola, quantity: 2 } };
		const increased = changeCartQuantity(cart, 1, 1);
		const decreased = changeCartQuantity(increased, 1, -1);

		expect(increased[1].quantity).toBe(3);
		expect(decreased[1].quantity).toBe(2);
		expect(cart[1].quantity).toBe(2);
	});

	it("数量が0になった商品をカートから削除する", () => {
		const cart: Cart = {
			1: { menu: cola, quantity: 1 },
			2: { menu: tea, quantity: 2 },
		};

		expect(changeCartQuantity(cart, 1, -1)).toEqual({ 2: cart[2] });
		expect(cart[1]).toBeDefined();
	});

	it("存在しない商品は変更しない", () => {
		const cart: Cart = { 1: { menu: cola, quantity: 1 } };
		expect(changeCartQuantity(cart, 99, 1)).toBe(cart);
	});
});

describe("getCartSummary", () => {
	it("商品ごとの数量と価格から合計を計算する", () => {
		const cart: Cart = {
			1: { menu: cola, quantity: 2 },
			2: { menu: tea, quantity: 3 },
		};
		expect(getCartSummary(cart)).toEqual({ count: 5, total: 850 });
	});

	it("空のカートは0を返す", () => {
		expect(getCartSummary({})).toEqual({ count: 0, total: 0 });
	});
});
