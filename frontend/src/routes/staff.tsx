import { createFileRoute } from "@tanstack/react-router";
import { requireSession } from "../auth/requireSession";
import { SessionControls } from "../components/auth/SessionControls";
import { SessionError } from "../components/auth/SessionError";
import { OperationsPage } from "../components/operations/OperationsPage";
export const Route = createFileRoute("/staff")({
	ssr: false,
	beforeLoad: ({ abortController }) =>
		requireSession("/staff", abortController.signal),
	errorComponent: SessionError,
	component: Staff,
});
function Staff() {
	return (
		<SessionControls user={Route.useRouteContext().user} returnTo="/staff">
			<OperationsPage initialMode="staff" />
		</SessionControls>
	);
}
