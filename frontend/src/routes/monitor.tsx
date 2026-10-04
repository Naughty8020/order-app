import { createFileRoute } from "@tanstack/react-router";
import { requireSession } from "../auth/requireSession";
import { SessionControls } from "../components/auth/SessionControls";
import { SessionError } from "../components/auth/SessionError";
import { OperationsPage } from "../components/operations/OperationsPage";
export const Route = createFileRoute("/monitor")({
	ssr: false,
	beforeLoad: ({ abortController }) =>
		requireSession("/monitor", abortController.signal),
	errorComponent: SessionError,
	component: Monitor,
});
function Monitor() {
	return (
		<SessionControls user={Route.useRouteContext().user} returnTo="/monitor">
			<OperationsPage initialMode="monitor" />
		</SessionControls>
	);
}
