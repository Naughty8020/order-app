import { redirect } from "@tanstack/react-router";
import {
	AuthError,
	getCurrentUser,
	type ProtectedDestination,
} from "../api/auth";

/** Runs before protected route loaders and components. */
export async function requireSession(
	returnTo: ProtectedDestination,
	signal?: AbortSignal,
) {
	try {
		window.localStorage.removeItem("token");
	} catch {
		// Storage may be disabled; authentication uses the HttpOnly cookie.
	}
	try {
		return { user: await getCurrentUser(signal) };
	} catch (error) {
		if (error instanceof AuthError && error.status === 401) {
			throw redirect({
				to: "/login",
				search: { redirect: returnTo },
				replace: true,
			});
		}
		throw error;
	}
}
