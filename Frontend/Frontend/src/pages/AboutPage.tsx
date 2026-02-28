import { useSectionAnimation } from "@/hooks/useSectionAnimation";
import SectionTitle from "@/components/SectionTitle";
import { Mail, Github } from "lucide-react";

const AboutPage = () => {
  const ref = useSectionAnimation(true);

  return (
    <section ref={ref} className="section-fade min-h-screen px-6 py-20">
      <div className="container mx-auto max-w-4xl">
        <SectionTitle title="About" highlight="NutriAI" subtitle="Built with ❤️ for Indian students." />

        <div className="bg-card rounded-2xl p-8 border border-border mb-8">
          <h3 className="font-heading text-xl font-bold mb-3 text-foreground">🎓 Hackathon Project</h3>
          <p className="text-muted-foreground leading-relaxed mb-4">
            NutriAI is an AI-powered nutrition and diet recommendation platform designed specifically for Indian hostel students, PG residents, and gym beginners. It uses computer vision, nutrient analysis, and budget optimization to create personalized meal plans.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Our goal is to solve the problem of poor nutrition among Indian college students by providing affordable, culturally relevant diet plans that fit within tight budgets.
          </p>
        </div>

        <div className="bg-card rounded-2xl p-8 border border-border mb-8">
          <h3 className="font-heading text-xl font-bold mb-4 text-foreground">👥 Team</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {["Arjun Sharma", "Priya Patel", "Rohan Gupta", "Sneha Reddy"].map((name) => (
              <div key={name} className="bg-secondary rounded-xl px-5 py-4">
                <p className="font-heading font-semibold text-foreground">{name}</p>
                <p className="text-muted-foreground text-sm">Developer</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-2xl p-8 border border-border text-center">
          <h3 className="font-heading text-xl font-bold mb-4 text-foreground">📬 Contact Us</h3>
          <div className="flex justify-center gap-6">
            <a href="mailto:team@nutriai.dev" className="flex items-center gap-2 text-primary hover:underline">
              <Mail className="w-4 h-4" /> team@nutriai.dev
            </a>
            <a href="#" className="flex items-center gap-2 text-primary hover:underline">
              <Github className="w-4 h-4" /> GitHub
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutPage;
