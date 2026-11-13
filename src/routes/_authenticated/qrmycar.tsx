import { redirect, createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/asset360/workspace";
import { workspaceQueryOptions } from "@/lib/workspace-query";
export const Route = createFileRoute("/_authenticated/qrmycar")({
  // Administrator-set initial passwords must be replaced before the app opens (server enforces it too).
  beforeLoad: ({ context }) => { if (context.user.app_metadata?.["must_change_password"] === true) throw redirect({ to: "/reset-password" }); },
 loader: async ({ context }) => { await context.queryClient.ensureQueryData(workspaceQueryOptions(context.user.id)); },
 head: () => ({ meta: [{ title: "Vehicle register | QRmyCAR" }, { name: "description", content: "Manage cars, owner details, private QR contact labels and parking messages." }, { property: "og:title", content: "Vehicle register | QRmyCAR" }, { property: "og:description", content: "Car registration and private QR parking contact." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
 component: () => <Workspace carPage/>,
});
