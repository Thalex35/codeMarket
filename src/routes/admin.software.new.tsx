import { createFileRoute } from "@tanstack/react-router";

import { SoftwareForm } from "@/components/admin/SoftwareForm";

export const Route = createFileRoute("/admin/software/new")({
  head: () => ({
    meta: [
      { title: "Add software — CodeMarket admin" },
      { name: "description", content: "Publish a new application to the CodeMarket catalog." },
      { property: "og:title", content: "Add software — CodeMarket admin" },
      { property: "og:description", content: "Publish a new application to CodeMarket." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Add software</h1>
        <p className="text-muted-foreground">Create a new listing for the CodeMarket catalog.</p>
      </div>
      <SoftwareForm />
    </div>
  ),
});
