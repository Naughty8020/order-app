// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { Menu } from "../../../cart";
import { MocktailOptionsModal } from "./MocktailOptionsModal";

afterEach(cleanup);

const menu = (name: string): Menu => ({
	id: 7,
	name,
	price: 300,
	is_available: true,
});

it("選択したジュースをオプションとして追加する", () => {
	const onAdd = vi.fn();
	render(
		<MocktailOptionsModal
			menu={menu("シャーリー・テンプル風")}
			onClose={vi.fn()}
			onAdd={onAdd}
		/>,
	);

	fireEvent.click(screen.getByText("リンゴジュース"));
	fireEvent.click(screen.getByRole("button", { name: "この内容で追加する" }));

	expect(onAdd).toHaveBeenCalledWith(
		expect.objectContaining({ name: "シャーリー・テンプル風" }),
		"ジュース：リンゴジュース",
	);
});

it("サンライズ風のコーラ垂らしを切り替えられる", () => {
	const onAdd = vi.fn();
	render(
		<MocktailOptionsModal
			menu={menu("サンライズ風モクテル")}
			onClose={vi.fn()}
			onAdd={onAdd}
		/>,
	);

	fireEvent.click(screen.getByRole("checkbox"));
	fireEvent.click(screen.getByRole("button", { name: "この内容で追加する" }));

	expect(onAdd).toHaveBeenCalledWith(
		expect.objectContaining({ name: "サンライズ風モクテル" }),
		"コーラ垂らし：あり",
	);
});
