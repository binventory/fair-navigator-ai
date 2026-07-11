import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ExpoAI — Trade fair management, GDPR-compliant" },
      {
        name: "description",
        content:
          "ExpoAI is a multi-tenant PWA for organizing trade fairs: exhibitors, floor-plan hotspots, schedules and AI-powered visitor guidance.",
      },
      { property: "og:title", content: "ExpoAI — Trade fair management" },
      {
        property: "og:description",
        content:
          "Multi-tenant, GDPR-compliant trade-fair platform with an AI visitor assistant.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <span className="text-lg font-semibold tracking-tight">ExpoAI</span>
        <Link to="/auth">
          <Button size="sm">Sign in</Button>
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Trade fairs, organized.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          A multi-tenant, GDPR-compliant platform for organizing exhibitors,
          floor plans and schedules — with an AI assistant for your visitors.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/auth">
            <Button size="lg">Get started</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
