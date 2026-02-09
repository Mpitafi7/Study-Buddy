import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { User, Bot, Sparkles } from "lucide-react";

const mockConversation = [
  {
    role: "user",
    content: "Can you explain Newton's Second Law of Motion?",
  },
  {
    role: "assistant",
    content:
      "Newton's Second Law states that **F = ma** (Force equals mass times acceleration). This means:\n\n• The acceleration of an object is directly proportional to the net force acting on it\n• The acceleration is inversely proportional to the object's mass\n\n**Example:** If you push a shopping cart (low mass) and a car (high mass) with the same force, the cart accelerates more because it has less mass.",
  },
  {
    role: "user",
    content: "Give me a practice problem",
  },
  {
    role: "assistant",
    content:
      "**Practice Problem:**\n\nA 5 kg box is pushed with a force of 20 N. What is its acceleration?\n\nUsing F = ma:\n• a = F/m = 20 N / 5 kg = **4 m/s²**\n\n✅ The box accelerates at 4 meters per second squared!",
  },
];

export function DemoPreviewSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-24 bg-background overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            See It In <span className="text-gradient">Action</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Watch how StudyBuddy AI helps you understand complex topics in seconds.
          </p>
        </motion.div>

        {/* Browser Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={
            isInView
              ? { opacity: 1, y: 0, scale: 1 }
              : { opacity: 0, y: 40, scale: 0.95 }
          }
          transition={{ duration: 0.7, delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden shadow-2xl glow-primary">
            {/* Browser Chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <div className="w-3 h-3 rounded-full bg-accent" />
                <div className="w-3 h-3 rounded-full bg-primary" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-background/50 rounded-lg px-4 py-1.5 text-sm text-muted-foreground text-center">
                  studybuddy.ai/chat
                </div>
              </div>
            </div>

            {/* Chat Interface */}
            <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
              {/* Current textbook indicator */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 mb-6">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm text-primary">
                  Physics_Fundamentals_Chapter5.pdf
                </span>
              </div>

              {/* Messages */}
              {mockConversation.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                  transition={{ duration: 0.4, delay: 0.4 + index * 0.15 }}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-gradient-primary text-white"
                        : "bg-muted/50 border border-border/50 text-foreground"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-line">{message.content}</p>
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Typing indicator */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.3, delay: 1.2 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-muted/50 border border-border/50 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground animate-typing-dot" />
                    <span
                      className="w-2 h-2 rounded-full bg-muted-foreground animate-typing-dot"
                      style={{ animationDelay: "0.2s" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-muted-foreground animate-typing-dot"
                      style={{ animationDelay: "0.4s" }}
                    />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
