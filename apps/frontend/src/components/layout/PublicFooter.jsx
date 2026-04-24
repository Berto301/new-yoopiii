import { useState } from "react";
import { Link } from "react-router-dom";
import { useUserPreferences } from "../../app/preferences/UserPreferencesProvider.jsx";
import { useNotification } from "../../hooks/useNotification.js";

export const PublicFooter = () => {
  const { preferences, t } = useUserPreferences();
  const { showSuccess } = useNotification();
  const currentYear = new Date().getFullYear();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const logoSrc = preferences.theme === "dark" ? "/assets/favicon-dark.png" : "/assets/favicon-light.png";
  const isLightTheme = preferences.theme === "light";
  const footerSurface = isLightTheme ? "#f1ece8" : "#191617";
  const footerText = isLightTheme ? "#191617" : "#f7f9f8";
  const footerMuted = isLightTheme ? "#5c504d" : "#d7cdca";
  const footerBorder = isLightTheme ? "rgba(157,93,67,0.14)" : "rgba(247,249,248,0.1)";
  const footerLinkHover = isLightTheme ? "#9d5d43" : "#f7f9f8";

  return (
    <footer id="contact" className="mt-16" style={{ backgroundColor: footerSurface, color: footerText }}>
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <img src={logoSrc} alt="Yopii" className="h-7 w-7 object-contain" />
            <span className="text-3xl font-bold text-brand-300">Yopii</span>
          </div>
          <p className="max-w-xs text-sm leading-7" style={{ color: footerMuted }}>
            {t("layout", "footer.description", "Plateforme immobiliere pour trouver, publier et gerer biens, terrains et prises de contact dans un univers plus premium.")}
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-2xl font-bold">{t("layout", "footer.contactTitle", "Get In Touch")}</h3>
          <div className="space-y-2 text-sm" style={{ color: footerMuted }}>
            <p>ANTSIRABE 110, Bira</p>
            <p>+261 20 22 000 11</p>
            <p>Yopii@gmail.com</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-2xl font-bold">{t("layout", "footer.linksTitle", "Quick Links")}</h3>
          <div className="grid gap-2 text-sm" style={{ color: footerMuted }}>
            <Link to="/" className="transition" style={{ color: footerMuted }} onMouseEnter={(event) => { event.currentTarget.style.color = footerLinkHover; }} onMouseLeave={(event) => { event.currentTarget.style.color = footerMuted; }}>{t("layout", "publicNav.home", "Home")}</Link>
            <a href="/#about" className="transition" style={{ color: footerMuted }} onMouseEnter={(event) => { event.currentTarget.style.color = footerLinkHover; }} onMouseLeave={(event) => { event.currentTarget.style.color = footerMuted; }}>{t("layout", "publicNav.about", "About")}</a>
            <a href="/#properties" className="transition" style={{ color: footerMuted }} onMouseEnter={(event) => { event.currentTarget.style.color = footerLinkHover; }} onMouseLeave={(event) => { event.currentTarget.style.color = footerMuted; }}>{t("layout", "publicNav.properties", "Property")}</a>
            <a href="/#types" className="transition" style={{ color: footerMuted }} onMouseEnter={(event) => { event.currentTarget.style.color = footerLinkHover; }} onMouseLeave={(event) => { event.currentTarget.style.color = footerMuted; }}>{t("layout", "publicNav.terrain", "Terrain")}</a>
            <a href="/#agents" className="transition" style={{ color: footerMuted }} onMouseEnter={(event) => { event.currentTarget.style.color = footerLinkHover; }} onMouseLeave={(event) => { event.currentTarget.style.color = footerMuted; }}>{t("layout", "publicNav.agents", "Agents")}</a>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-2xl font-bold">{t("layout", "footer.newsletterTitle", "Newsletter")}</h3>
          <p className="text-sm" style={{ color: footerMuted }}>{t("layout", "footer.newsletterDescription", "Send your recommendation")}</p>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setNewsletterEmail("");
              showSuccess("Merci, votre email a bien ete enregistre.");
            }}
          >
            <input
              type="email"
              value={newsletterEmail}
              onChange={(event) => setNewsletterEmail(event.target.value)}
              placeholder="Your email"
              className="h-11 flex-1 rounded-md border border-white/10 bg-white px-4 text-sm text-stone-950 outline-none"
            />
            <button type="submit" className="rounded-md bg-brand-500 px-4 text-sm font-medium text-white transition hover:bg-brand-700">
              Suscribe
            </button>
          </form>
        </div>
      </div>

      <div className="border-t" style={{ borderColor: footerBorder }}>
        <div className="mx-auto max-w-7xl px-6 py-5 text-center text-xs" style={{ color: footerMuted }}>
          {t("layout", "footer.copyright", "Copyright {year} Yopii. Tous droits reserves.").replace("{year}", String(currentYear))}
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
