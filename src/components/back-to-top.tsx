import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useT } from "@/i18n";

export function BackToTop() {
  const { t } = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > Math.max(600, window.innerHeight * 0.75));
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  if (!visible) return null;
  return (
    <button
      type="button"
      aria-label={t.common.backToTop}
      title={t.common.backToTop}
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        })
      }
      data-theme="dark"
      className="interaction-icon fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-5 z-30 inline-flex size-12 items-center justify-center rounded-full border border-gold bg-navy text-gold shadow-soft sm:right-8"
    >
      <ArrowUp className="size-5" aria-hidden="true" />
    </button>
  );
}
