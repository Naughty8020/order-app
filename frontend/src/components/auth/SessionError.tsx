import { useRouter } from "@tanstack/react-router";

export function SessionError() {
	const router = useRouter();
	return (
		<div className="p-6 space-y-4">
			<p role="alert">
				ログイン状態を確認できませんでした。接続を確認して再試行してください。
			</p>
			<button type="button" onClick={() => void router.invalidate()}>
				再試行
			</button>
			<a href="/">顧客メニューへ</a>
		</div>
	);
}
