import { Link } from "react-router-dom";
import rajma from "@/assets/rajma.jpg";
import paneer from "@/assets/paneer.jpg";
import egg from "@/assets/egg.jpg";
import dal from "@/assets/dal.jpg";

const meals = [
  { name: "Rajma Chawal", price: "₹40", image: rajma },
  { name: "Paneer Bhurji", price: "₹60", image: paneer },
  { name: "Egg Curry", price: "₹45", image: egg },
  { name: "Dal Rice", price: "₹30", image: dal },
];

/* Decorative SVG icons for background scatter */
const LeafDecor = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M40 10C40 10 55 25 55 45C55 65 40 70 40 70C40 70 25 65 25 45C25 25 40 10 40 10Z" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
    <path d="M40 20V60" stroke="currentColor" strokeWidth="1" opacity="0.2"/>
    <path d="M40 35C45 30 50 32 50 32" stroke="currentColor" strokeWidth="1" opacity="0.2"/>
    <path d="M40 45C35 40 30 42 30 42" stroke="currentColor" strokeWidth="1" opacity="0.2"/>
  </svg>
);

const CitrusDecor = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="1.5" opacity="0.15"/>
    <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="1" opacity="0.1"/>
    <line x1="50" y1="15" x2="50" y2="85" stroke="currentColor" strokeWidth="0.8" opacity="0.1"/>
    <line x1="15" y1="50" x2="85" y2="50" stroke="currentColor" strokeWidth="0.8" opacity="0.1"/>
    <line x1="25" y1="25" x2="75" y2="75" stroke="currentColor" strokeWidth="0.8" opacity="0.1"/>
    <line x1="75" y1="25" x2="25" y2="75" stroke="currentColor" strokeWidth="0.8" opacity="0.1"/>
  </svg>
);

const FlowerDecor = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="40" cy="40" r="8" stroke="currentColor" strokeWidth="1" opacity="0.2"/>
    {[0, 60, 120, 180, 240, 300].map((angle) => (
      <ellipse
        key={angle}
        cx="40"
        cy="22"
        rx="8"
        ry="14"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.15"
        transform={`rotate(${angle} 40 40)`}
      />
    ))}
  </svg>
);

const Index = () => {
  return (
    <div className="bg-background text-foreground overflow-hidden">

      {/* ================= NAV ================= */}
      <nav className="absolute top-0 left-0 right-0 z-50 py-5">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-primary text-2xl">🍃</span>
            <span className="font-heading font-bold text-lg text-foreground">SmartMeals</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition">Home</a>
            <a href="#" className="hover:text-foreground transition">Menu</a>
            <a href="#" className="hover:text-foreground transition">Products</a>
            <a href="#" className="hover:text-foreground transition">Contact</a>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-sm text-muted-foreground hover:text-foreground transition">🔍</button>
            <button className="text-sm text-muted-foreground hover:text-foreground transition">🛒</button>
          </div>
        </div>
      </nav>

      {/* ================= HERO SECTION ================= */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Layered gradient background */}
        {/* Premium Deep Teal Gradient Background */}
<div
  
  className="absolute inset-0 bg-noise"
  style={{
    background: `
      radial-gradient(circle at 75% 40%, rgba(0, 255, 255, 0.08) 0%, transparent 40%),
      radial-gradient(circle at 30% 60%, rgba(0, 255, 255, 0.05) 0%, transparent 45%),
      linear-gradient(
        135deg,
        #0a1624 0%,
        #0f1f2e 25%,
        #0e2a3a 55%,
        #083040 75%,
        #062d3b 100%
      )
    `
  }}
/>

        {/* Subtle wavy lines overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 80 Q50 60 100 80 T200 80' stroke='%2367e8f9' fill='none' stroke-width='1'/%3E%3Cpath d='M0 120 Q50 100 100 120 T200 120' stroke='%2367e8f9' fill='none' stroke-width='1'/%3E%3Cpath d='M0 160 Q50 140 100 160 T200 160' stroke='%2367e8f9' fill='none' stroke-width='1'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px'
        }} />

        {/* Decorative botanical elements */}
        <CitrusDecor className="absolute top-20 right-[15%] w-32 h-32 text-primary" />
        <CitrusDecor className="absolute bottom-32 left-[8%] w-24 h-24 text-primary" />
        <FlowerDecor className="absolute top-[15%] left-[5%] w-20 h-20 text-primary" />
        <FlowerDecor className="absolute bottom-[20%] right-[5%] w-28 h-28 text-primary" />
        <LeafDecor className="absolute top-[40%] left-[12%] w-16 h-16 text-primary" />
        <LeafDecor className="absolute top-[10%] right-[30%] w-14 h-14 text-primary rotate-45" />

        <div className="container mx-auto px-6 grid lg:grid-cols-2 items-center relative z-10 pt-20">
          {/* LEFT TEXT */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-primary text-xl">🍃</span>
              <span className="text-primary text-sm font-medium tracking-wider uppercase">Sustainable food</span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-extrabold leading-[1.1] font-heading">
              Healthy Food <br />
              <span className="text-gradient-cyan">& Lifestyle</span>
            </h1>

            <p className="mt-6 text-muted-foreground max-w-md text-base leading-relaxed">
              Smart AI-powered Indian hostel meals that balance protein, calories and budget — all under ₹60.
            </p>

            {/* Stats pills */}
            <div className="flex gap-4 mt-8">
              {[
                { value: "52", label: "Protein (g)", color: "bg-primary/20 text-primary" },
                { value: "619", label: "Calories", color: "bg-primary/20 text-primary" },
                { value: "3.27", label: "Rating", color: "bg-primary/20 text-primary" },
              ].map((stat) => (
                <div key={stat.label} className={`${stat.color} rounded-full px-5 py-3 text-center`}>
                  <div className="text-lg font-bold font-heading">{stat.value}</div>
                  <div className="text-[10px] opacity-70 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-4 mt-10">
              <Link
                to="/dashboard"
                className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3.5 rounded-full shadow-lg shadow-primary/20 transition-all duration-300 font-semibold hover:shadow-primary/40 hover:scale-105"
              >
                Get Started
              </Link>
              <button className="px-8 py-3.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all duration-300 font-medium">
                Explore →
              </button>
            </div>
          </div>

          {/* RIGHT — large food plate with decorative ring */}
          <div className="flex justify-center mt-16 lg:mt-0 relative">
            {/* Outer decorative ring */}
            <div className="absolute w-[420px] h-[420px] lg:w-[500px] lg:h-[500px] rounded-full border border-primary/20" />
            <div className="absolute w-[460px] h-[460px] lg:w-[540px] lg:h-[540px] rounded-full border border-primary/10" />

            {/* Main image */}
            <div className="relative">
              <img
                src={rajma}
                alt="Rajma Chawal - balanced Indian meal"
                className="w-[360px] h-[360px] lg:w-[420px] lg:h-[420px] object-cover rounded-full shadow-2xl"
              />
              {/* Cyan glow behind */}
              <div className="absolute inset-0 rounded-full glow-cyan -z-10 scale-125" />
            </div>

            {/* Floating small food images */}
            <div className="absolute -left-6 top-8 p-1 rounded-full bg-card/50 backdrop-blur-sm border border-border shadow-xl">
              <img src={paneer} alt="Paneer Bhurji" className="w-20 h-20 rounded-full object-cover" />
            </div>
            <div className="absolute -right-2 bottom-12 p-1 rounded-full bg-card/50 backdrop-blur-sm border border-border shadow-xl">
              <img src={egg} alt="Egg Curry" className="w-16 h-16 rounded-full object-cover" />
            </div>
            <div className="absolute left-4 -bottom-4 p-1 rounded-full bg-card/50 backdrop-blur-sm border border-border shadow-xl">
              <img src={dal} alt="Dal Rice" className="w-14 h-14 rounded-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* ================= FEATURES SECTION ================= */}
      <section className="relative py-24 bg-section-alt overflow-hidden">
        {/* Decorative elements */}
        <CitrusDecor className="absolute top-12 left-[5%] w-28 h-28 text-primary" />
        <LeafDecor className="absolute bottom-12 right-[8%] w-20 h-20 text-primary" />

        <div className="container mx-auto px-6 relative z-10">
          <h2 className="text-3xl lg:text-4xl font-bold text-center font-heading mb-4">
            Why Choose <span className="text-gradient-cyan">Smart Meals</span>?
          </h2>
          <p className="text-muted-foreground text-center max-w-lg mx-auto mb-16">
            Every meal is optimized by AI for your health and wallet.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "Balanced Nutrition", desc: "AI calculates perfect protein and calorie ratio for every meal.", icon: "🥗" },
              { title: "Budget Friendly", desc: "Optimized meals under ₹60 designed for hostel students.", icon: "💰" },
              { title: "Smart Planning", desc: "Personalized meal suggestions tailored to your goals daily.", icon: "🧠" },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-card/60 backdrop-blur-sm p-8 rounded-2xl border border-border hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center text-2xl mb-5">{f.icon}</div>
                <h3 className="text-xl font-semibold text-primary font-heading mb-3">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CAROUSEL ================= */}
      <section className="py-20 bg-background overflow-hidden relative">
        <FlowerDecor className="absolute top-8 right-[10%] w-24 h-24 text-primary" />
        <h2 className="text-3xl font-bold text-center font-heading mb-12">
          Today's <span className="text-gradient-cyan">Menu</span>
        </h2>
        <div className="relative w-full">
          <div className="flex gap-14 animate-scroll whitespace-nowrap">
            {meals.concat(meals).concat(meals).map((meal, index) => (
              <div key={index} className="flex-shrink-0 flex flex-col items-center gap-3">
                <img
                  src={meal.image}
                  alt={meal.name}
                  className="w-40 h-40 object-cover rounded-full shadow-xl border-4 border-primary/30 hover:border-primary hover:scale-110 transition-all duration-300"
                />
                <span className="text-sm font-medium">{meal.name}</span>
                <span className="text-xs text-primary font-semibold">{meal.price}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="py-12 bg-section-alt border-t border-border">
        <div className="container mx-auto px-6 text-center text-muted-foreground text-sm">
          <p>© 2026 Smart Meals · AI-powered nutrition for hostel life</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
