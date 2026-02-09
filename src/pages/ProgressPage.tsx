import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function ProgressPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <h1 className="text-3xl font-bold mb-4">Your Progress</h1>
        <p className="text-muted-foreground">Coming in Phase 5...</p>
      </main>
      <Footer />
    </div>
  );
}
