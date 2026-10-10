import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/asset360/workspace";
import { workspaceQueryOptions } from "@/lib/workspace-query";
export const Route = createFileRoute("/_authenticated/qrmycar")({
 loader: async ({ context }) => { await context.queryClient.ensureQueryData(workspaceQueryOptions(context.user.id)); },
 head: () => ({ meta: [{ title: "Vehicle register | QRmyCAR" }, { name: "description", content: "Manage cars, owner details, private QR contact labels and parking messages." }, { property: "og:title", content: "Vehicle register | QRmyCAR" }, { property: "og:description", content: "Car registration and private QR parking contact." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
 component: () => <Workspace carPage/>,
});
