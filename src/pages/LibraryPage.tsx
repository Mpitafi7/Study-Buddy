
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { getDocuments, subscribeToEvents, type DocumentRow } from "@/lib/storage";
import { BookOpen, Upload, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LibraryPage() {
  const [books, setBooks] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function fetchBooks() {
      setLoading(true);
      getDocuments()
        .then(setBooks)
        .finally(() => setLoading(false));
    }

    fetchBooks();

    const unsubscribe = subscribeToEvents((event) => {
      if (event.type === "document-added") {
        fetchBooks();
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex flex-1 pt-16 min-h-0">
        {/* Left glassmorphic sidebar - books */}
        <aside
          className="w-64 shrink-0 border-r border-border/50 flex flex-col"
          style={{
            background: "hsl(var(--card) / 0.6)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
          }}
        >
          <div className="p-4 border-b border-border/50">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Your Books
            </h2>
          </div>
          <nav className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : books.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-4">
                No books yet. Upload a PDF to get started.
              </p>
            ) : (
              <ul className="space-y-1">
                {books.map((book) => (
                  <li key={book.id}>
                    <Link
                      to={`/chat/${book.id}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors truncate"
                      title={book.name}
                    >
                      <BookOpen className="h-4 w-4 shrink-0" />
                      <span className="truncate">{book.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </nav>
          <div className="p-3 border-t border-border/50">
            <Link to="/onboarding" className="block">
              <Button variant="outline" className="w-full gap-2" size="sm">
                <Upload className="h-4 w-4" />
                Upload PDF
              </Button>
            </Link>
          </div>
        </aside>

        {/* Main content - same layout whether loading or not to avoid shift */}
        <main className="flex-1 overflow-auto container mx-auto px-6 py-8 min-h-0">
          <h1 className="text-3xl font-bold mb-2">Your Library</h1>
          <p className="text-muted-foreground mb-6">
            All your uploaded textbooks in one place. Open any book to chat with StudyBuddy.
          </p>
          {loading ? (
            <div className="flex items-center justify-center py-16" aria-label="Loading library">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            </div>
          ) : books.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {books.map((book) => (
                <Link
                  key={book.id}
                  to={`/chat/${book.id}`}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card/80 hover:bg-muted/30 transition-colors"
                >
                  <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{book.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Added {new Date(book.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button size="sm" className="gap-1 shrink-0">
                    <MessageSquare className="h-4 w-4" />
                    Chat
                  </Button>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">No textbooks in your library yet.</p>
              <Link to="/onboarding">
                <Button className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload your first PDF
                </Button>
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
