import { Link } from "react-router-dom";
import { Github, Linkedin, Code2, Home, BookOpen, BarChart3 } from "lucide-react";

const quickLinks = [
  { to: "/", label: "Home", icon: Home },
  { to: "/library", label: "Library", icon: BookOpen },
  { to: "/progress", label: "Progress", icon: BarChart3 },
];

const socialLinks = [
  { href: "https://github.com/Mpitafi7/Study-Buddy", label: "GitHub", icon: Github },
  { href: "https://devpost.com/muntazirmahdi069", label: "Devpost", icon: Code2 },
];

export function Footer() {
  return (
    <footer
      className="mt-auto border-t border-border/60 bg-background/70 backdrop-blur-xl"
      style={{
        background: "hsl(var(--background) / 0.75)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Column 1: Logo & description */}
          <div className="flex flex-col gap-3">
            <Link to="/" className="flex items-center gap-2 w-fit">
              <img src="/logo.png" alt="StudyBuddy AI" className="h-8 w-8 object-contain" />
              <span className="text-lg font-bold text-foreground">
                StudyBuddy <span className="text-gradient">AI</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Empowering students with Gemini AI.
            </p>
          </div>

          {/* Column 2: Quick links */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Quick links</h4>
            <ul className="space-y-2">
              {quickLinks.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Social & hackathon */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Connect</h4>
            <ul className="space-y-2">
              {socialLinks.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border/50 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} StudyBuddy AI. Built for the Gemini Hackathon.
          </p>
        </div>
      </div>
    </footer>
  );
}
