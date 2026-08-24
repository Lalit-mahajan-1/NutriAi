import { useSectionAnimation } from "@/hooks/useSectionAnimation";
import SectionTitle from "@/components/SectionTitle";
import { Progress } from "@/components/ui/progress";
import { Upload } from "lucide-react";

const nutrients = [
  { name: "Protein", value: 68, target: "85g" },
  { name: "Iron", value: 45, target: "18mg" },
  { name: "Calcium", value: 72, target: "1000mg" },
  { name: "Vitamin D", value: 30, target: "600 IU" },
];

const weeklyPlan = [
  { day: "Mon", meal: "Poha + Dal Rice + Paneer Roti" },
  { day: "Tue", meal: "Idli + Rajma Chawal + Egg Curry" },
  { day: "Wed", meal: "Upma + Chole Roti + Dal Rice" },
  { day: "Thu", meal: "Paratha + Soya Pulao + Dahi" },
  { day: "Fri", meal: "Oats + Dal Rice + Paneer Bhurji" },
  { day: "Sat", meal: "Poha + Rajma Chawal + Egg Bhurji" },
  { day: "Sun", meal: "Chole Bhature + Fruit Salad" },
];

const DashboardPage = () => {
  const ref = useSectionAnimation(true);

  return (
    <section ref={ref} className="section-fade min-h-screen px-6 py-20">
      <div className="container mx-auto max-w-5xl">
        <SectionTitle title="Your" highlight="Dashboard" subtitle="Track your nutrition progress and weekly plan." />

        {/* Progress */}
        <div className="bg-card rounded-2xl p-8 border border-border mb-8">
          <h3 className="font-heading text-lg font-bold mb-6 text-foreground">📊 Nutrition Progress</h3>
          <div className="space-y-5">
            {nutrients.map((n) => (
              <div key={n.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-foreground">{n.name}</span>
                  <span className="text-muted-foreground">{n.value}% of {n.target}</span>
                </div>
                <Progress value={n.value} className="h-3 bg-secondary [&>div]:bg-primary [&>div]:rounded-full rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Weekly plan */}
        <div className="bg-card rounded-2xl p-8 border border-border mb-8">
          <h3 className="font-heading text-lg font-bold mb-4 text-foreground">📅 Weekly Meal Plan</h3>
          <div className="space-y-3">
            {weeklyPlan.map((d) => (
              <div key={d.day} className="flex items-center gap-4 bg-secondary rounded-xl px-4 py-3">
                <span className="font-heading font-bold text-primary w-10">{d.day}</span>
                <span className="text-sm text-secondary-foreground">{d.meal}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upload */}
        <div className="bg-card rounded-2xl p-8 border border-border text-center">
          <Upload className="w-10 h-10 text-primary mx-auto mb-3" />
          <h3 className="font-heading text-lg font-bold mb-2 text-foreground">Upload Meal Image</h3>
          <p className="text-muted-foreground text-sm mb-4">Snap a photo of your meal for instant AI analysis.</p>
          <button className="btn-hover bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-heading font-semibold text-sm">
            Upload Photo
          </button>
        </div>
      </div>
    </section>
  );
};

export default DashboardPage;
