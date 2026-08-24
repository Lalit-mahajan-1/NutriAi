interface SectionTitleProps {
  title: string;
  highlight?: string;
  subtitle?: string;
}

const SectionTitle = ({ title, highlight, subtitle }: SectionTitleProps) => (
  <div className="text-center mb-12">
    <h2 className="font-heading text-3xl md:text-4xl font-bold mb-3 text-foreground">
      {title}{" "}
      {highlight && <span className="text-primary">{highlight}</span>}
    </h2>
    {subtitle && (
      <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{subtitle}</p>
    )}
  </div>
);

export default SectionTitle;
