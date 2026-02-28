import { useSectionAnimation } from "@/hooks/useSectionAnimation";
import SectionTitle from "@/components/SectionTitle";
import { HeartPulse } from "lucide-react";

const conditions = [
  {
    title: "PCOS Diet",
    desc: "Anti-inflammatory Indian meals with whole grains, seeds, and low-GI foods.",
    meals: ["Methi Paratha", "Palak Dal", "Quinoa Khichdi"],
    emoji: "🌿",
  },
  {
    title: "Iron Deficiency Plan",
    desc: "Iron-rich Indian foods paired with Vitamin C for better absorption.",
    meals: ["Poha with Lemon", "Spinach Dal", "Jaggery Ladoo"],
    emoji: "🩸",
  },
  {
    title: "Diabetes-Friendly Meals",
    desc: "Low-GI Indian meals with balanced portions and fiber-rich ingredients.",
    meals: ["Ragi Roti", "Bitter Gourd Sabzi", "Moong Dal Chilla"],
    emoji: "🩺",
  },
  {
    title: "Hypertension Diet",
    desc: "Low-sodium Indian meals with potassium-rich vegetables.",
    meals: ["Lauki Sabzi", "Dal Tadka (low salt)", "Banana Raita"],
    emoji: "💓",
  },
];

const HealthPage = () => {
  const ref = useSectionAnimation(true);

  return (
    <section ref={ref} className="section-fade min-h-screen px-6 py-20">
      <div className="container mx-auto max-w-5xl">
        <SectionTitle title="Health" highlight="Conditions" subtitle="Specialized Indian diet plans for common health needs." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {conditions.map((c) => (
            <div key={c.title} className="card-hover bg-card rounded-2xl p-8 border border-border">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{c.emoji}</span>
                <h3 className="font-heading text-xl font-bold text-foreground">{c.title}</h3>
              </div>
              <p className="text-muted-foreground text-sm mb-4">{c.desc}</p>
              <div className="space-y-2">
                {c.meals.map((m) => (
                  <div key={m} className="flex items-center gap-2 text-sm">
                    <HeartPulse className="w-4 h-4 text-primary" />
                    <span className="text-foreground">{m}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HealthPage;
