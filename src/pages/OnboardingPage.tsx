import { Navbar } from "@/components/layout/Navbar";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <h1 className="text-3xl font-bold mb-4">Get Started</h1>
        <p className="text-muted-foreground">Coming in Phase 6...</p>
      </main>
    </div>
  );
}
