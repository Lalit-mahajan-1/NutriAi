import { useSectionAnimation } from "@/hooks/useSectionAnimation";
import SectionTitle from "@/components/SectionTitle";
import { IndianRupee } from "lucide-react";

const plans = [
  {
    title: "₹100/Day Hostel Plan",
    meals: ["Poha + Chai", "Dal Rice + Sabzi", "Roti + Egg Curry"],
    protein: "55g protein/day",
    color: "bg-primary/10",
  },
  {
    title: "₹150 Gym Beginner Plan",
    meals: ["Oats + Banana", "Rajma Chawal + Curd", "Paneer Bhurji + Roti + Salad"],
    protein: "85g protein/day",
    color: "bg-accent/10",
  },
];

const groceryList = ["Rice 2kg — ₹80", "Dal 1kg — ₹120", "Eggs 12 — ₹84", "Paneer 200g — ₹60", "Onion 1kg — ₹30", "Milk 2L — ₹90"];

const BudgetPage = () => {
  const ref = useSectionAnimation(true);

  return (
    <section ref={ref} className="section-fade min-h-screen px-6 py-20">
      <div className="container mx-auto max-w-5xl">
        <SectionTitle title="Budget" highlight="Optimizer" subtitle="Eat smart within your hostel budget." />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {plans.map((p) => (
            <div key={p.title} className="card-hover bg-card rounded-2xl p-8 border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full ${p.color} flex items-center justify-center`}>
                  <IndianRupee className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-heading text-xl font-bold text-foreground">{p.title}</h3>
              </div>
              <ul className="space-y-2 mb-4">
                {p.meals.map((m) => (
                  <li key={m} className="text-sm text-muted-foreground bg-secondary rounded-xl px-4 py-2">{m}</li>
                ))}
              </ul>
              <p className="text-primary font-heading font-semibold">{p.protein}</p>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-2xl p-8 border border-border">
          <h3 className="font-heading text-xl font-bold mb-4 text-foreground">📋 Weekly Grocery List Preview</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {groceryList.map((item) => (
              <div key={item} className="bg-secondary rounded-xl px-4 py-3 text-sm text-secondary-foreground">{item}</div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default BudgetPage;
