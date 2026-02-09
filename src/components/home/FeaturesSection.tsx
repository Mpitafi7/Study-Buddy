import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Brain, Zap, Target, TrendingUp, Mic, GitBranch } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Understanding",
    description:
      "Gemini AI breaks down complex concepts into simple, digestible explanations tailored to your learning level.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: GitBranch,
    title: "Auto Diagrams",
    description:
      "Every explanation comes with an auto-generated Mermaid flowchart — subgraphs, decision nodes, and labeled arrows.",
    gradient: "from-indigo-500 to-violet-500",
  },
  {
    icon: Mic,
    title: "Live Tutor Mode",
    description:
      "Talk to your AI tutor hands-free with voice input, real-time captions, and auto-loop — like having a private tutor.",
    gradient: "from-rose-500 to-pink-500",
  },
  {
    icon: TrendingUp,
    title: "Smart Quizzes",
    description:
      "Auto-generated practice questions that test your understanding and help reinforce key concepts with progress tracking.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Target,
    title: "Adaptive Learning",
    description:
      "The AI adapts to your knowledge level — simple analogies for beginners, technical depth for advanced students.",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    icon: Zap,
    title: "100% Client-Side",
    description:
      "Your files and data never leave your browser. No backend, no tracking — bring your own Gemini API key.",
    gradient: "from-yellow-500 to-orange-500",
  },
];

export function FeaturesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Why Students <span className="text-gradient">Love Us</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to transform how you study and learn from textbooks.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full bg-card/50 border-border/50 hover-glow group cursor-pointer">
                <CardContent className="p-6">
                  {/* Icon */}
                  <div
                    className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} mb-4 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-semibold mb-2 text-foreground">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
