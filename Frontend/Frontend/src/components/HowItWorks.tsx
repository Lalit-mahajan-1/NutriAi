import { useSectionAnimation } from "@/hooks/useSectionAnimation";
import { Upload, Brain, Search, CalendarCheck } from "lucide-react";

const steps = [
  { icon: Upload, title: "Upload Photos", description: "Share your meal photos or body images" },
  { icon: Brain, title: "AI Analysis", description: "Our model identifies nutrients & composition" },
  { icon: Search, title: "Deficiency Detection", description: "Spot gaps in vitamins and minerals" },
  { icon: CalendarCheck, title: "Weekly Plan", description: "Receive a personalized diet schedule" },
];

const HowItWorks = () => {
  const ref = useSectionAnimation();

  return (
    <section
      ref={ref}
      className="section-animate relative min-h-screen flex items-center justify-center px-6 py-24"
    >
      <div className="bg-glow-green top-1/3 right-0" />

      <div className="container mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
            How It <span className="text-primary">Works</span>
          </h2>
          <p className="text-muted-foreground text-lg">Four simple steps to better nutrition.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className={`section-animate visible step-${i + 1} glass-card rounded-xl p-8 text-center`}
              style={{ transitionDelay: `${i * 0.15}s` }}
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <step.icon className="w-7 h-7 text-primary" />
              </div>
              <div className="text-xs font-heading font-semibold text-primary mb-2 tracking-widest uppercase">
                Step {i + 1}
              </div>
              <h3 className="font-heading text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
