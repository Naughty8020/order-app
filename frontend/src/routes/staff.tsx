import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAuthToken } from "../api/auth";
import { OperationsPage } from "../components/operations/OperationsPage";
export const Route = createFileRoute("/staff")({
	ssr: false,
	beforeLoad: () => {
		if (typeof window !== "undefined" && !getAuthToken()) {
			throw redirect({ to: "/login" });
		}
	},
	component: Staff,
});
function Staff() {
	return <OperationsPage initialMode="staff" />;
}
