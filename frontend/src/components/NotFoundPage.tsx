import { Link } from "@tanstack/react-router";
import { House, LogIn, SearchX } from "lucide-react";
import { CustomerBackground } from "./customer/CustomerBackground";

export function NotFoundPage() {
	return (
		<div className="relative min-h-screen overflow-x-hidden bg-[#0a0a12] font-['Hiragino_Sans','Yu_Gothic',sans-serif] text-white selection:bg-pink-500/30 [color-scheme:dark]">
			<CustomerBackground />
			<main className="relative z-10 mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-12 sm:py-16">
				<header className="mb-8 text-center">
					<div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-pink-500/40 bg-pink-500/15 px-3.5 py-1.5 text-[11px] font-bold tracking-[0.12em] text-[#f472b6]">
						<span className="h-1.5 w-1.5 rounded-full bg-pink-400" />
						MUSIC LOUNGE
					</div>
					<p className="mb-3 bg-gradient-to-r from-[#a78bfa] via-[#ec4899] to-[#fb923c] bg-clip-text text-5xl font-extrabold leading-[1.05] tracking-tight text-transparent sm:text-[64px]">
						Tech Club
					</p>
					<p className="text-sm font-medium text-gray-100">
						音楽とテクノロジーが織りなす新しい体験を。
					</p>
				</header>
				<section
					aria-labelledby="not-found-title"
					className="rounded-2xl border border-emerald-500/20 bg-[#14141e]/60 p-6 text-center backdrop-blur-sm sm:p-8"
				>
					<div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
						<SearchX size={24} aria-hidden="true" />
					</div>
					<p className="mb-3 text-6xl font-extrabold tracking-tight text-emerald-400">
						404
					</p>
					<h1 id="not-found-title" className="text-xl font-bold">
						ページが見つかりません
					</h1>
					<p className="mt-3 text-sm leading-7 text-zinc-400">
						お探しのページは移動または削除されたか、
						<br className="hidden sm:block" />
						URLが間違っている可能性があります。
					</p>
					<div className="mt-7 flex flex-col gap-3">
						<Link
							to="/"
							className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-5 py-3.5 text-sm font-semibold !text-white no-underline shadow-[0_4px_20px_rgba(16,185,129,0.35)] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400"
						>
							<House size={18} aria-hidden="true" />
							トップページへ戻る
						</Link>
						<Link
							to="/login"
							className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/4 px-5 py-3.5 text-sm font-semibold !text-zinc-200 no-underline transition hover:bg-white/8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400"
						>
							<LogIn size={18} aria-hidden="true" />
							スタッフログイン
						</Link>
					</div>
				</section>
			</main>
		</div>
	);
}
