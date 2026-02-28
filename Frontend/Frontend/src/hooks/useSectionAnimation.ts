import { useEffect, useRef } from "react";

export const useSectionAnimation = (immediate = false) => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (immediate) {
      el.classList.add("visible");
      return;
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            el.classList.add("visible");
          }
        },
        { threshold: 0.05, rootMargin: "0px 0px -50px 0px" }
      );

      observer.observe(el);
      return () => observer.disconnect();
    }, 100);

    return () => clearTimeout(timer);
  }, [immediate]);

  return ref;
};
