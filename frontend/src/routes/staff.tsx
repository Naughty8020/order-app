import { createFileRoute } from "@tanstack/react-router";
import { OperationsPage } from "../components/operations/OperationsPage";
export const Route = createFileRoute("/staff")({ component: Staff });
function Staff() {
	return <OperationsPage initialMode="staff" />;
}
