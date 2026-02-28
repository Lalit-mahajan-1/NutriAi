import { useSectionAnimation } from "@/hooks/useSectionAnimation";
import SectionTitle from "@/components/SectionTitle";
import { Upload, Brain, Search, CalendarCheck, ShoppingCart } from "lucide-react";

const steps = [
  { icon: Upload, title: "Upload Body Photo", desc: "Share meal or body images for AI analysis." },
  { icon: Brain, title: "AI Body Analysis", desc: "Our model identifies body composition & BMI." },
  { icon: Search, title: "Detect Nutrient Deficiencies", desc: "Spot gaps in vitamins, iron, and protein." },
  { icon: CalendarCheck, title: "Budget-Friendly Diet Plan", desc: "Get a weekly Indian diet plan under ₹100/day." },
  { icon: ShoppingCart, title: "Weekly Grocery List", desc: "Auto-generated list from local markets." },
];

const HowItWorksPage = () => {
  const ref = useSectionAnimation(true);

  return (
    <section ref={ref} className="section-fade min-h-screen px-6 py-20">
      <div className="container mx-auto">
        <SectionTitle title="How It" highlight="Works" subtitle="Five simple steps to smarter nutrition." />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="card-hover bg-card rounded-2xl p-8 border border-border text-center"
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <step.icon className="w-7 h-7 text-primary" />
              </div>
              <span className="text-xs font-heading font-semibold text-primary tracking-widest uppercase">
                Step {i + 1}
              </span>
              <h3 className="font-heading text-lg font-semibold mt-2 mb-2 text-foreground">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksPage;
