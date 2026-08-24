import phoneMockup from "@/assets/phone-mockup.png";
import { useSectionAnimation } from "@/hooks/useSectionAnimation";

const Hero = () => {
  const ref = useSectionAnimation(true);

  return (
    <section
      ref={ref}
      className="section-animate relative min-h-screen flex items-center justify-center overflow-hidden px-6"
    >
      {/* Background glows */}
      <div className="bg-glow-green top-20 -left-40" />
      <div className="bg-glow-coral bottom-20 -right-32" />

      <div className="container mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
        {/* Left content */}
        <div className="space-y-8">
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
            AI-Powered Personalized{" "}
            <span className="text-primary">Indian Nutrition</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-lg leading-relaxed">
            Smart diet planning using computer vision and budget optimization — 
            designed for hostel students and PG residents.
          </p>
          <div className="flex flex-wrap gap-4">
            <button className="btn-glow bg-primary text-primary-foreground px-8 py-3 rounded-lg font-heading font-semibold text-base">
              Start Analysis
            </button>
            <button className="glass-card px-8 py-3 rounded-lg font-heading font-semibold text-base text-foreground hover:bg-secondary transition-colors">
              Watch Demo
            </button>
          </div>
        </div>

        {/* Right phone mockup */}
        <div className="flex justify-center lg:justify-end">
          <div className="animate-float">
            <img
              src={phoneMockup}
              alt="Indian food nutrition app showing Rajma, Paneer, Dal and more"
              className="w-64 md:w-80 lg:w-96 drop-shadow-2xl rounded-3xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
