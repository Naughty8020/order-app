import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LoaderCircle, LogIn, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { isCurrentToken } from "../api/auth";
import { createSession } from "../api/login";
import { CustomerBackground } from "../components/customer/CustomerBackground";

export const Route = createFileRoute("/login")({
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handleLogin = async () => {
		if (loading) return;
		try {
			setLoading(true);
			setError("");

			const data = await createSession({
				username,
				password,
			});

			if (!isCurrentToken(data.token))
				throw new Error("無効なログイントークンです");
			localStorage.setItem("token", data.token);

			await navigate({ to: "/staff" });
		} catch (error) {
			console.error(error);
			setError("ユーザーネームまたはパスワードが違います");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="relative min-h-screen bg-[#0a0a12] text-white overflow-x-hidden font-['Hiragino_Sans','Yu_Gothic',sans-serif] selection:bg-pink-500/30 [color-scheme:dark]">
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
					aria-labelledby="login-title"
					className="rounded-2xl border border-emerald-500/20 bg-[#14141e]/60 p-6 backdrop-blur-sm sm:p-8"
				>
					<div className="mb-6">
						<div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
							<ShieldCheck size={22} aria-hidden="true" />
						</div>
						<h1 id="login-title" className="text-xl font-bold">
							スタッフログイン
						</h1>
						<p className="mt-2 text-sm leading-relaxed text-zinc-400">
							アカウント情報を入力して、スタッフ画面へ。
						</p>
					</div>
					<form
						onSubmit={(event) => {
							event.preventDefault();
							void handleLogin();
						}}
						className="space-y-5"
						aria-busy={loading}
					>
						<div>
							<label
								htmlFor="username"
								className="mb-2 block text-xs font-bold text-zinc-400"
							>
								ユーザーネーム
							</label>
							<input
								id="username"
								name="username"
								autoComplete="username"
								required
								disabled={loading}
								aria-describedby={error ? "login-error" : undefined}
								className="w-full rounded-xl border border-white/10 bg-[#0a0a12] px-4 py-3 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60 transition"
								type="text"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								placeholder="ユーザーネームを入力"
							/>
						</div>

						<div>
							<label
								htmlFor="password"
								className="mb-2 block text-xs font-bold text-zinc-400"
							>
								パスワード
							</label>
							<input
								id="password"
								name="password"
								autoComplete="current-password"
								required
								disabled={loading}
								aria-describedby={error ? "login-error" : undefined}
								className="w-full rounded-xl border border-white/10 bg-[#0a0a12] px-4 py-3 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60 transition"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="パスワードを入力"
							/>
						</div>

						{error && (
							<p
								id="login-error"
								role="alert"
								className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-relaxed text-red-300"
							>
								{error}
							</p>
						)}
						<button
							type="submit"
							disabled={loading}
							className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(16,185,129,0.35)] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none cursor-pointer"
						>
							{loading ? (
								<LoaderCircle
									size={18}
									className="animate-spin motion-reduce:animate-none"
									aria-hidden="true"
								/>
							) : (
								<LogIn size={18} aria-hidden="true" />
							)}
							{loading ? "ログイン中..." : "ログイン"}
						</button>
					</form>
				</section>
			</main>
		</div>
	);
}
