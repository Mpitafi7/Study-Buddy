import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Upload, BookOpen, MessageSquare, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: Upload,
    step: "01",
    title: "Upload Your PDF",
    description:
      "Drag and drop any textbook PDF. We process it 100% locally in your browser—your data never leaves your device.",
  },
  {
    icon: BookOpen,
    step: "02",
    title: "AI Reads Everything",
    description:
      "Our AI instantly analyzes every page, understanding concepts, formulas, and key topics from your textbook.",
  },
  {
    icon: MessageSquare,
    step: "03",
    title: "Ask Anything",
    description:
      "Start chatting! Ask questions, request summaries, or generate practice quizzes. Get instant, contextual answers.",
  },
];

export function HowItWorksSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            How It <span className="text-gradient">Works</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Three simple steps to transform your study sessions forever.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative max-w-5xl mx-auto">
          {/* Connection line (desktop) */}
          <div className="hidden lg:block absolute top-24 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-primary via-secondary to-accent opacity-30" />

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="relative text-center"
              >
                {/* Step number */}
                <div className="relative z-10 mx-auto mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto glow-primary">
                    <step.icon className="h-8 w-8 text-white" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center text-xs font-bold text-primary">
                    {step.step}
                  </span>
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold mb-3 text-foreground">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>

                {/* Arrow (mobile/tablet) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:flex lg:hidden absolute -right-4 top-10 text-primary/50">
                    <ArrowRight className="h-6 w-6" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
