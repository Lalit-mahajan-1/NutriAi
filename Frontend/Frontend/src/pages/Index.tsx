import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import MealShowcase from "@/components/MealShowcase";
import CTA from "@/components/CTA";

const Index = () => {
  return (
    <main className="relative overflow-hidden">
      <Hero />
      <Features />
      <HowItWorks />
      <MealShowcase />
      <CTA />
    </main>
  );
};

export default Index;
