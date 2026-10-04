import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { loginDestination } from "../api/auth";
import { createSession } from "../api/login";

export const Route = createFileRoute("/login")({
	validateSearch: (search: Record<string, unknown>) => ({
		redirect: loginDestination(search.redirect),
	}),
	component: Login,
});

function Login() {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const navigate = useNavigate();
	const { redirect } = Route.useSearch();

	const handleLogin = async (event: FormEvent) => {
		event.preventDefault();
		if (loading) return;
		setLoading(true);
		setError("");
		try {
			try {
				localStorage.removeItem("token");
			} catch {
				/* Storage may be disabled. */
			}
			await createSession({ username, password });
			setPassword("");
			await navigate({ to: redirect, replace: true });
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "ログインできませんでした。接続を確認してください",
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<main className="min-h-screen bg-[#0a0a12] text-white grid place-items-center p-6">
			<form
				onSubmit={handleLogin}
				className="w-full max-w-sm space-y-5 rounded-2xl border border-white/10 bg-white/5 p-7"
			>
				<h1 className="text-2xl font-bold">スタッフログイン</h1>
				<p className="text-sm text-zinc-400">
					スタッフ画面・店頭モニターを利用するにはログインしてください。
				</p>
				<div className="space-y-2">
					<label htmlFor="username" className="block">
						ユーザー名
					</label>
					<input
						id="username"
						name="username"
						autoComplete="username"
						required
						value={username}
						onChange={(event) => setUsername(event.target.value)}
						className="w-full rounded-lg border border-white/20 bg-black/20 p-3"
					/>
				</div>
				<div className="space-y-2">
					<label htmlFor="password" className="block">
						パスワード
					</label>
					<input
						id="password"
						name="password"
						type="password"
						autoComplete="current-password"
						required
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						className="w-full rounded-lg border border-white/20 bg-black/20 p-3"
					/>
				</div>
				<button
					type="submit"
					disabled={loading}
					className="w-full rounded-lg bg-pink-600 p-3 font-bold disabled:opacity-50"
				>
					{loading ? "ログイン中…" : "ログイン"}
				</button>
				{error && (
					<p role="alert" className="text-sm text-rose-300">
						{error}
					</p>
				)}
				<a href="/" className="block text-sm text-zinc-400 underline">
					顧客メニューへ戻る
				</a>
			</form>
		</main>
	);
}
