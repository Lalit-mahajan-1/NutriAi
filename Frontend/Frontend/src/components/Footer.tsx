import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="bg-card border-t border-border py-10 px-6">
    <div className="container mx-auto text-center">
      <p className="font-heading font-bold text-primary text-lg mb-2">NutriAI 🍛</p>
      <p className="text-muted-foreground text-sm mb-4">
        AI-Powered Indian Nutrition for Hostel Students & Gym Beginners
      </p>
      <div className="flex justify-center gap-6 text-sm text-muted-foreground">
        <Link to="/about" className="hover:text-primary transition-colors">About</Link>
        <Link to="/health" className="hover:text-primary transition-colors">Health</Link>
        <Link to="/meal-plans" className="hover:text-primary transition-colors">Meals</Link>
      </div>
      <p className="text-xs text-muted-foreground mt-6">© 2026 NutriAI. Built for Hackathon.</p>
    </div>
  </footer>
);

export default Footer;
