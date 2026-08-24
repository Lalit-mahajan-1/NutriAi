import { useSectionAnimation } from "@/hooks/useSectionAnimation";

const CTA = () => {
  const ref = useSectionAnimation();

  return (
    <section
      ref={ref}
      className="section-animate relative min-h-screen flex items-center justify-center px-6 py-24"
    >
      <div className="bg-glow-green top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      <div className="text-center relative z-10 max-w-3xl mx-auto">
        <h2 className="font-heading text-3xl md:text-5xl font-bold mb-6 leading-tight">
          Achieve the Perfect Body with{" "}
          <span className="text-primary">Smart Indian Nutrition</span>
        </h2>
        <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
          Join thousands of hostel students already eating smarter, spending less, and feeling better.
        </p>
        <button className="btn-glow bg-primary text-primary-foreground px-10 py-4 rounded-xl font-heading font-bold text-lg">
          Launch My Plan
        </button>
      </div>
    </section>
  );
};

export default CTA;
