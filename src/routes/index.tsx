import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/dash/Dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FMCG Supply Chain & Revenue Analytics" },
      {
        name: "description",
        content: "FY2023-24 FMCG supply chain, plant, distributor and revenue analytics dashboard.",
      },
    ],
  }),
  component: Dashboard,
});
