import { Controller, useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { useUserPreferences } from "../../app/preferences/UserPreferencesProvider.jsx";
import { Button } from "../ui/Button.jsx";
import { Input } from "../ui/Input.jsx";
import { Textarea } from "../ui/Textarea.jsx";
import { useNotification } from "../../hooks/useNotification.js";
import { sendContactMessage } from "../../features/landing/services/contact.service.js";

export const PublicFooter = () => {
  const { t } = useUserPreferences();
  const currentYear = new Date().getFullYear();
  const { showError, showSuccess } = useNotification();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: {
      fullName: "",
      email: "",
      subject: "",
      message: ""
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await sendContactMessage(values);
      showSuccess("Votre message a bien ete envoye.");
      reset();
    } catch (error) {
      showError(error?.response?.data?.message || error?.message || "Impossible d'envoyer le message.");
    }
  });

  return (
    <footer id="contact" className="border-t border-white/10 bg-[linear-gradient(180deg,rgba(10,10,10,0.86),rgba(10,10,10,0.98))]">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#c9a66b]">{t("layout", "footer.eyebrow", "Contact")}</p>
            <h2 className="font-serif text-4xl text-white">{t("layout", "footer.title", "Parlons de votre projet immobilier.")}</h2>
            <p className="max-w-xl text-sm leading-7 text-stone-300">
              {t("layout", "footer.description", "Une question, une demande de demo ou un besoin d'accompagnement? Ecrivez-nous depuis cette section et le message sera transmis a l'equipe Yopii.")}
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-stone-400">
            <Link to="/" className="transition hover:text-white">{t("layout", "footer.home", "Accueil")}</Link>
            <a href="#contact" className="transition hover:text-white">{t("layout", "footer.contact", "Contact")}</a>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 lg:p-8">
          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <Controller
                name="fullName"
                control={control}
                rules={{ required: "Le nom est requis." }}
                render={({ field }) => <Input label={t("layout", "footer.fullName", "Nom complet")} error={errors.fullName?.message} placeholder={t("layout", "footer.fullNamePlaceholder", "Votre nom")} {...field} />}
              />
              <Controller
                name="email"
                control={control}
                rules={{ required: "L'email est requis." }}
                render={({ field }) => <Input label={t("layout", "footer.email", "Email")} type="email" error={errors.email?.message} placeholder={t("layout", "footer.emailPlaceholder", "contact@yopii.app")} {...field} />}
              />
            </div>
            <Controller
              name="subject"
              control={control}
              rules={{ required: "Le sujet est requis." }}
              render={({ field }) => <Input label={t("layout", "footer.subject", "Sujet")} error={errors.subject?.message} placeholder={t("layout", "footer.subjectPlaceholder", "Objet de votre message")} {...field} />}
            />
            <Controller
              name="message"
              control={control}
              rules={{ required: "Le message est requis." }}
              render={({ field }) => <Textarea label={t("layout", "footer.message", "Message")} rows={6} error={errors.message?.message} placeholder={t("layout", "footer.messagePlaceholder", "Expliquez votre besoin...")} {...field} />}
            />
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-stone-400">{t("layout", "footer.helper", "Le message est envoye directement vers l'email de contact configure sur le backend.")}</p>
              <Button type="submit" disabled={isSubmitting} className="bg-[#c9a66b] text-stone-950 hover:bg-[#d9b983]">
                {isSubmitting ? t("layout", "footer.submitting", "Envoi...") : t("layout", "footer.submit", "Envoyer")}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-5 text-sm text-stone-500 md:flex-row md:items-center md:justify-between">
          <p>{t("layout", "footer.copyright", "Copyright {year} Yopii. Tous droits reserves.").replace("{year}", String(currentYear))}</p>
          <p>{t("layout", "footer.tagline", "Experience immobiliere synchronisee, vitrine publique et gestion temps reel.")}</p>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
