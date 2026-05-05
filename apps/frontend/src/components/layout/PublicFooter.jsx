import { useState } from "react";
import { Link } from "react-router-dom";
import { useUserPreferences } from "../../app/preferences/UserPreferencesProvider.jsx";
import { useNotification } from "../../hooks/useNotification.js";
import { sendContactMessage } from "../../features/landing/services/contact.service.js";

const initialNewsletterForm = {
  objet: "",
  email: "",
  detail: ""
};

export const PublicFooter = () => {
  const { preferences, t } = useUserPreferences();
  const { showError, showSuccess } = useNotification();
  const currentYear = new Date().getFullYear();
  const [newsletterForm, setNewsletterForm] = useState(initialNewsletterForm);
  const [newsletterErrors, setNewsletterErrors] = useState({});
  const [isSubmittingNewsletter, setIsSubmittingNewsletter] = useState(false);
  const logoSrc = preferences.theme === "dark" ? "/assets/favicon-dark.png" : "/assets/favicon-light.png";
  const isLightTheme = preferences.theme === "light";
  const footerSurface = isLightTheme ? "#f1ece8" : "#191617";
  const footerText = isLightTheme ? "#191617" : "#f7f9f8";
  const footerMuted = isLightTheme ? "#5c504d" : "#d7cdca";
  const footerBorder = isLightTheme ? "rgba(157,93,67,0.14)" : "rgba(247,249,248,0.1)";
  const footerLinkHover = isLightTheme ? "#9d5d43" : "#f7f9f8";

  const updateNewsletterField = (field, value) => {
    setNewsletterForm((current) => ({ ...current, [field]: value }));
    setNewsletterErrors((current) => ({ ...current, [field]: "" }));
  };

  const validateNewsletter = () => {
    const nextErrors = {};

    if (newsletterForm.objet.trim().length < 2) {
      nextErrors.objet = t("layout", "footer.newsletterErrors.object", "Ajoutez un objet clair.");
    }

    if (!/^\S+@\S+\.\S+$/.test(newsletterForm.email.trim())) {
      nextErrors.email = t("layout", "footer.newsletterErrors.email", "Ajoutez un email valide.");
    }

    if (newsletterForm.detail.trim().length < 10) {
      nextErrors.detail = t("layout", "footer.newsletterErrors.detail", "Ajoutez un detail d'au moins 10 caracteres.");
    }

    setNewsletterErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNewsletterSubmit = async (event) => {
    event.preventDefault();

    if (!validateNewsletter()) {
      return;
    }

    setIsSubmittingNewsletter(true);

    try {
      await sendContactMessage({
        objet: newsletterForm.objet.trim(),
        email: newsletterForm.email.trim(),
        detail: newsletterForm.detail.trim(),
        source: "newsletter"
      });
      setNewsletterForm(initialNewsletterForm);
      showSuccess(t("layout", "footer.newsletterSuccess", "Merci, votre message newsletter a bien ete envoye."));
    } catch (error) {
      showError(error?.response?.data?.message || error?.message || t("layout", "footer.newsletterError", "Impossible d'envoyer le formulaire newsletter."));
    } finally {
      setIsSubmittingNewsletter(false);
    }
  };

  return (
    <footer id="contact" className="mt-16" style={{ backgroundColor: footerSurface, color: footerText }}>
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-2 xl:grid-cols-[1fr_0.75fr_0.75fr_1.25fr]">
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
          <h3 className="text-2xl font-bold">{t("layout", "footer.contactTitle", "Contact")}</h3>
          <div className="space-y-2 text-sm" style={{ color: footerMuted }}>
            <p>ANTSIRABE 110, Bira</p>
            <p>+261 20 22 000 11</p>
            <p>Yopii@gmail.com</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-2xl font-bold">{t("layout", "footer.linksTitle", "Liens rapides")}</h3>
          <div className="grid gap-2 text-sm" style={{ color: footerMuted }}>
            <Link to="/" className="transition" style={{ color: footerMuted }} onMouseEnter={(event) => { event.currentTarget.style.color = footerLinkHover; }} onMouseLeave={(event) => { event.currentTarget.style.color = footerMuted; }}>{t("layout", "publicNav.home", "Accueil")}</Link>
            <a href="/#about" className="transition" style={{ color: footerMuted }} onMouseEnter={(event) => { event.currentTarget.style.color = footerLinkHover; }} onMouseLeave={(event) => { event.currentTarget.style.color = footerMuted; }}>{t("layout", "publicNav.about", "A propos")}</a>
            <a href="/#properties" className="transition" style={{ color: footerMuted }} onMouseEnter={(event) => { event.currentTarget.style.color = footerLinkHover; }} onMouseLeave={(event) => { event.currentTarget.style.color = footerMuted; }}>{t("layout", "publicNav.properties", "Biens")}</a>
            <a href="/#types" className="transition" style={{ color: footerMuted }} onMouseEnter={(event) => { event.currentTarget.style.color = footerLinkHover; }} onMouseLeave={(event) => { event.currentTarget.style.color = footerMuted; }}>{t("layout", "publicNav.terrain", "Terrains")}</a>
            <a href="/#agents" className="transition" style={{ color: footerMuted }} onMouseEnter={(event) => { event.currentTarget.style.color = footerLinkHover; }} onMouseLeave={(event) => { event.currentTarget.style.color = footerMuted; }}>{t("layout", "publicNav.agents", "Agents")}</a>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-2xl font-bold">{t("layout", "footer.newsletterTitle", "Newsletter")}</h3>
            <p className="mt-2 text-sm leading-6" style={{ color: footerMuted }}>{t("layout", "footer.newsletterDescription", "Envoyez une recommandation, une demande ou un besoin immobilier.")}</p>
          </div>
          <form className="space-y-3" onSubmit={handleNewsletterSubmit}>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: footerMuted }}>{t("layout", "footer.newsletterObject", "Objet")}</span>
              <input
                type="text"
                value={newsletterForm.objet}
                onChange={(event) => updateNewsletterField("objet", event.target.value)}
                placeholder={t("layout", "footer.newsletterObjectPlaceholder", "Sujet de votre message")}
                className="h-11 w-full rounded-2xl border px-4 text-sm outline-none transition focus:border-brand-500"
                style={{ borderColor: footerBorder, backgroundColor: isLightTheme ? "#ffffff" : "rgba(255,255,255,0.06)", color: footerText }}
              />
              {newsletterErrors.objet ? <span className="text-xs text-red-400">{newsletterErrors.objet}</span> : null}
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: footerMuted }}>{t("layout", "footer.email", "Email")}</span>
              <input
                type="email"
                value={newsletterForm.email}
                onChange={(event) => updateNewsletterField("email", event.target.value)}
                placeholder={t("layout", "footer.emailPlaceholder", "contact@yopii.app")}
                className="h-11 w-full rounded-2xl border px-4 text-sm outline-none transition focus:border-brand-500"
                style={{ borderColor: footerBorder, backgroundColor: isLightTheme ? "#ffffff" : "rgba(255,255,255,0.06)", color: footerText }}
              />
              {newsletterErrors.email ? <span className="text-xs text-red-400">{newsletterErrors.email}</span> : null}
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: footerMuted }}>{t("layout", "footer.newsletterDetail", "Detail")}</span>
              <textarea
                rows={4}
                value={newsletterForm.detail}
                onChange={(event) => updateNewsletterField("detail", event.target.value)}
                placeholder={t("layout", "footer.newsletterDetailPlaceholder", "Votre message, besoin, recommandation ou question...")}
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-brand-500"
                style={{ borderColor: footerBorder, backgroundColor: isLightTheme ? "#ffffff" : "rgba(255,255,255,0.06)", color: footerText }}
              />
              {newsletterErrors.detail ? <span className="text-xs text-red-400">{newsletterErrors.detail}</span> : null}
            </label>
            <button type="submit" disabled={isSubmittingNewsletter} className="w-full rounded-full bg-brand-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmittingNewsletter ? t("layout", "footer.submitting", "Envoi...") : t("layout", "footer.submit", "Envoyer")}
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
