import { Check, X } from "lucide-react";
import { useState } from "react";
import type { Menu } from "../../../cart";

const getMocktailDetails = (name: string) => {
	if (name.startsWith("シャーリー・テンプル風"))
		return {
			recipe: "コーラ＋ジュース",
			label: "ジュースを選択",
			choices: ["オレンジジュース", "リンゴジュース"],
		};
	if (name.startsWith("フルーツ・サイダーポンチ"))
		return {
			recipe: "三ツ矢サイダー＋ジュース",
			label: "ジュースを選択",
			choices: ["アップルジュース", "オレンジジュース"],
		};
	if (name.startsWith("オレンジ・グレープ・フィズ"))
		return {
			recipe: "三ツ矢サイダー＋ファンタオレンジ＋ファンタグレープ",
		};
	return {
		recipe: "オレンジジュース＋ファンタグレープ",
		toggle: true,
	};
};

export function MocktailOptionsModal({
	menu,
	onClose,
	onAdd,
}: {
	menu: Menu;
	onClose: () => void;
	onAdd: (menu: Menu, option?: string) => void;
}) {
	const details = getMocktailDetails(menu.name);
	const [choice, setChoice] = useState(details.choices?.[0] ?? "");
	const [addCola, setAddCola] = useState(false);

	const confirm = () => {
		const option = details.choices
			? `ジュース：${choice}`
			: details.toggle
				? `コーラ垂らし：${addCola ? "あり" : "なし"}`
				: undefined;
		onAdd(menu, option);
		onClose();
	};

	return (
		<div
			className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
			role="presentation"
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="mocktail-options-title"
				className="w-full max-w-md rounded-[24px] border border-[#f05bd5]/35 bg-[#17111f] p-6 text-white shadow-[0_0_45px_rgba(236,72,153,0.22)]"
			>
				<div className="mb-5 flex items-start justify-between gap-4">
					<div>
						<p className="mb-1 text-xs font-bold tracking-widest text-[#f472b6]">
							NON-ALCOHOLIC
						</p>
						<h2 id="mocktail-options-title" className="text-xl font-bold">
							{menu.name}
						</h2>
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label="オプション画面を閉じる"
						className="rounded-full p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
					>
						<X size={20} />
					</button>
				</div>

				<div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4">
					<p className="mb-1 text-xs text-zinc-400">ベース</p>
					<p className="text-sm font-semibold leading-relaxed">
						{details.recipe}
					</p>
				</div>

				{details.choices && (
					<fieldset className="mb-6">
						<legend className="mb-3 text-sm font-bold">{details.label}</legend>
						<div className="grid grid-cols-2 gap-3">
							{details.choices.map((item) => (
								<label
									key={item}
									className={`cursor-pointer rounded-2xl border p-3 text-center text-sm font-semibold transition ${choice === item ? "border-[#ff76d7] bg-[#a918a5]/35 text-white" : "border-white/10 bg-white/5 text-zinc-300"}`}
								>
									<input
										type="radio"
										name="mocktail-juice"
										value={item}
										checked={choice === item}
										onChange={() => setChoice(item)}
										className="sr-only"
									/>
									{item}
								</label>
							))}
						</div>
					</fieldset>
				)}

				{details.toggle && (
					<label className="mb-6 flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
						<span>
							<span className="block text-sm font-bold">コーラ垂らし</span>
							<span className="text-xs text-zinc-400">
								少量のコーラを加えます
							</span>
						</span>
						<input
							type="checkbox"
							checked={addCola}
							onChange={(event) => setAddCola(event.target.checked)}
							className="h-5 w-5 accent-[#ec4899]"
						/>
					</label>
				)}

				<button
					type="button"
					onClick={confirm}
					className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#8b24c6] to-[#ec4899] px-5 py-3.5 font-bold shadow-lg transition hover:brightness-110"
				>
					<Check size={19} />
					この内容で追加する
				</button>
			</div>
		</div>
	);
}
