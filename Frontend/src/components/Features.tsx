import { useSectionAnimation } from "@/hooks/useSectionAnimation";
import { Camera, Wallet, HeartPulse, ShoppingCart } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface FeatureCard {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: FeatureCard[] = [
  {
    icon: Camera,
    title: "AI Body Scanning",
    description: "Upload photos for instant body composition analysis using computer vision.",
  },
  {
    icon: Wallet,
    title: "Budget Meal Optimization",
    description: "Get nutrient-dense meal plans optimized for hostel and PG budgets.",
  },
  {
    icon: HeartPulse,
    title: "Nutrient Deficiency Detection",
    description: "Identify potential vitamin and mineral gaps in your daily Indian diet.",
  },
  {
    icon: ShoppingCart,
    title: "Smart Indian Grocery List",
    description: "Auto-generated weekly grocery lists from local Indian markets.",
  },
];

const Features = () => {
  const ref = useSectionAnimation();

  return (
    <section
      ref={ref}
      className="section-animate relative min-h-screen flex items-center justify-center px-6 py-24"
    >
      <div className="bg-glow-coral top-1/4 left-10" />
      <div className="bg-glow-green bottom-10 right-10" />

      <div className="container mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
            Powered by <span className="text-primary">Intelligence</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Four core AI features designed to transform how Indian students approach nutrition.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="card-3d glow-border glass-card rounded-xl p-8 cursor-default"
            >
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-heading text-xl font-semibold mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
