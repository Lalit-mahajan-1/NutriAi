import { useSectionAnimation } from "@/hooks/useSectionAnimation";
import SectionTitle from "@/components/SectionTitle";
import MealCard from "@/components/MealCard";

const meals = [
  { name: "Rajma Chawal", protein: "18g protein", calories: "320 kcal", price: "₹40", emoji: "🫘" },
  { name: "Paneer Bhurji", protein: "22g protein", calories: "380 kcal", price: "₹60", emoji: "🧀" },
  { name: "Egg Curry", protein: "20g protein", calories: "290 kcal", price: "₹45", emoji: "🥚" },
  { name: "Dal Rice", protein: "15g protein", calories: "350 kcal", price: "₹30", emoji: "🍛" },
  { name: "Soya Pulao", protein: "24g protein", calories: "310 kcal", price: "₹35", emoji: "🍚" },
  { name: "Chole Roti", protein: "16g protein", calories: "340 kcal", price: "₹35", emoji: "🥘" },
  { name: "Poha", protein: "8g protein", calories: "250 kcal", price: "₹20", emoji: "🍲" },
  { name: "Idli Sambar", protein: "12g protein", calories: "280 kcal", price: "₹25", emoji: "🥣" },
];

const MealPlansPage = () => {
  const ref = useSectionAnimation(true);

  return (
    <section ref={ref} className="section-fade min-h-screen px-6 py-20">
      <div className="container mx-auto">
        <SectionTitle
          title="Indian Hostel"
          highlight="Meal Plans"
          subtitle="Protein-rich, budget-friendly meals designed for hostel students."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {meals.map((m) => (
            <MealCard key={m.name} {...m} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default MealPlansPage;
