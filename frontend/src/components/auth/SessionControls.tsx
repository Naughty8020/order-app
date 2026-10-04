import { useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import {
	type AuthUser,
	logout,
	type ProtectedDestination,
	SESSION_EXPIRED_EVENT,
} from "../../api/auth";

/** Session UI only; access is checked by the route's beforeLoad. */
export function SessionControls({
	user,
	returnTo,
	children,
}: {
	user: AuthUser;
	returnTo: ProtectedDestination;
	children: ReactNode;
}) {
	const navigate = useNavigate();
	const [expired, setExpired] = useState(false);
	const [loggingOut, setLoggingOut] = useState(false);
	const [error, setError] = useState("");
	useEffect(() => {
		const onExpired = () => {
			setExpired(true);
			void navigate({
				to: "/login",
				search: { redirect: returnTo },
				replace: true,
			});
		};
		window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
		return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
	}, [navigate, returnTo]);
	const handleLogout = async () => {
		if (loggingOut) return;
		setLoggingOut(true);
		setError("");
		try {
			await logout();
		} catch (cause) {
			setError(
				cause instanceof Error ? cause.message : "ログアウトできませんでした",
			);
		} finally {
			setLoggingOut(false);
		}
	};
	if (expired)
		return <output className="block p-6">ログイン画面へ移動しています…</output>;
	return (
		<>
			{children}
			<div className="fixed top-2 right-2 z-[60] rounded-xl bg-slate-950/95 border border-white/20 text-white p-2 shadow-lg">
				<div className="flex items-center gap-3">
					<span className="text-xs">{user.username}</span>
					<button
						type="button"
						onClick={handleLogout}
						disabled={loggingOut}
						className="rounded-lg border border-white/20 px-3 py-2 text-sm disabled:opacity-50"
					>
						{loggingOut ? "ログアウト中…" : "ログアウト"}
					</button>
				</div>
				{error && (
					<p role="alert" className="max-w-sm text-sm text-rose-300 mt-2">
						{error}
					</p>
				)}
			</div>
		</>
	);
}
