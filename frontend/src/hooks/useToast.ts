import { useCallback, useEffect, useRef, useState } from "react";
export interface ToastMessage {
	message: string;
	type: "success" | "error" | "info";
}
export type ShowToast = (message: string, type?: ToastMessage["type"]) => void;
export function useToast() {
	const [toast, setToast] = useState<ToastMessage | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const showToast = useCallback<ShowToast>((message, type = "success") => {
		if (timer.current !== null) clearTimeout(timer.current);
		setToast({ message, type });
		timer.current = setTimeout(() => setToast(null), 3000);
	}, []);
	useEffect(
		() => () => {
			if (timer.current !== null) clearTimeout(timer.current);
		},
		[],
	);
	return { toast, showToast };
}
