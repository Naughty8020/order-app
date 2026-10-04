import { createFileRoute } from "@tanstack/react-router";
import { OperationsPage } from "../components/operations/OperationsPage";
export const Route = createFileRoute("/monitor")({ component: Monitor });
function Monitor() {
	return <OperationsPage initialMode="monitor" />;
}
