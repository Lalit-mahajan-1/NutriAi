import { useSectionAnimation } from "@/hooks/useSectionAnimation";

const meals = [
  { name: "Rajma Chawal", protein: "18g protein", price: "₹40", emoji: "🫘" },
  { name: "Paneer Bhurji", protein: "22g protein", price: "₹60", emoji: "🧀" },
  { name: "Egg Curry", protein: "20g protein", price: "₹45", emoji: "🥚" },
  { name: "Dal Rice", protein: "15g protein", price: "₹30", emoji: "🍛" },
  { name: "Soya Pulao", protein: "24g protein", price: "₹35", emoji: "🍚" },
];

const MealShowcase = () => {
  const ref = useSectionAnimation();

  return (
    <section
      ref={ref}
      className="section-animate relative min-h-screen flex items-center justify-center px-6 py-24"
    >
      <div className="bg-glow-coral top-10 left-1/4" />

      <div className="container mx-auto relative z-10">
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
            Indian Meal <span className="text-accent">Showcase</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Affordable, protein-rich meals from your local kitchen.
          </p>
        </div>

        <div className="flex gap-6 overflow-x-auto pb-6 scroll-snap-x px-4">
          {meals.map((meal) => (
            <div
              key={meal.name}
              className="glass-card rounded-xl p-6 min-w-[240px] flex-shrink-0 hover:scale-105 transition-transform duration-300 cursor-default"
            >
              <div className="text-5xl mb-4">{meal.emoji}</div>
              <h3 className="font-heading text-lg font-semibold mb-1">{meal.name}</h3>
              <p className="text-primary text-sm font-medium mb-1">{meal.protein}</p>
              <p className="text-accent font-heading font-bold text-lg">{meal.price}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MealShowcase;
