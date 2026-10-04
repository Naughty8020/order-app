import { createFileRoute, redirect } from "@tanstack/react-router";
import { OperationsPage } from "../components/operations/OperationsPage";
export const Route = createFileRoute("/staff")({
	ssr: false,
	beforeLoad: () => {
		if (typeof window !== "undefined" && !window.localStorage.getItem("token")) {
			throw redirect({ to: "/login" });
		}
	},
	component: Staff,
});
function Staff() {
	return <OperationsPage initialMode="staff" />;
}
