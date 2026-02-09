import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import { Upload, Sparkles, CreditCard, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";

const benefits = [
  { icon: CreditCard, text: "No credit card" },
  { icon: UserX, text: "No signup required" },
];

export function CTASection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-24 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      <div className="absolute inset-0">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl"
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-sm text-muted-foreground">
              Start learning in under 60 seconds
            </span>
          </div>

          {/* Headline */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
            Ready to <span className="text-gradient">ace your exams?</span>
          </h2>

          {/* Description */}
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Upload your textbook and start getting instant, AI-powered explanations.
            Your study buddy is waiting.
          </p>

          {/* CTA Button */}
          <Link to="/onboarding">
            <Button
              size="lg"
              className="bg-gradient-primary hover:opacity-90 animate-pulse-glow gap-2 text-lg px-10 py-7"
            >
              <Upload className="h-5 w-5" />
              Get Started — It's Free
            </Button>
          </Link>

          {/* Benefits */}
          <div className="flex items-center justify-center gap-6 mt-8">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <benefit.icon className="h-4 w-4 text-accent" />
                <span>{benefit.text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
