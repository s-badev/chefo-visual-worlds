// Editable site settings.
import aiPortrait from "@/assets/about-ai-wide.webp";
import realPortrait from "@/assets/about-real-framed.webp";

export const siteConfig = {
  // TODO: добавете вашия имейл, напр. "name@example.com". Докато е празно, линкът „Имейл" не се показва.
  contactEmail: "",
  // TODO: добавете линка към вашия Instagram профил, напр. "https://instagram.com/username".
  // Докато е празно, линкът „Instagram" не се показва.
  instagramUrl: "",
  portrait: {
    real: realPortrait as string | undefined,
    ai: aiPortrait as string | undefined,
  },
};
