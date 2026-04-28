import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useUserPreferences } from "../../../app/preferences/UserPreferencesProvider.jsx";
import { loginSchema, registerSchema } from "../validators/auth.schemas.js";
import { useAuthMutations } from "../hooks/useAuthMutations.js";
import { Input } from "../../../components/ui/Input.jsx";
import { PasswordInput } from "../../../components/ui/PasswordInput.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Card } from "../../../components/ui/Card.jsx";
import { useNotification } from "../../../hooks/useNotification.js";

const normalizeValue = (value) => (typeof value === "string" ? value.trim() : value);

export const AuthForm = ({ mode = "login", title, subtitle }) => {
  const { t } = useUserPreferences();
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useNotification();
  const {
    loginMutation,
    registerMutation,
    socialLoginMutation,
    verifyTwoFactorMutation,
    resolveRedirectPath,
    extractApiErrorMessage
  } = useAuthMutations();
  const [twoFactorChallenge, setTwoFactorChallenge] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");

  const schema = mode === "login" ? loginSchema : registerSchema;
  const defaultValues = useMemo(
    () =>
      mode === "login"
        ? { email: "", password: "" }
        : {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            password: "",
            companyName: "",
            role: mode
          },
    [mode]
  );

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues
  });

  const mutation = mode === "login" ? loginMutation : registerMutation;
  const resolveAfterAuth = (result) => {
    const fallbackPath = resolveRedirectPath(result.user);
    const intendedPath = location.state?.from?.pathname;
    navigate(intendedPath || fallbackPath, { replace: true });
  };

  const onSubmit = async (values) => {
    try {
      const payload =
        mode === "login"
          ? {
              email: normalizeValue(values.email),
              password: values.password
            }
          : {
              firstName: normalizeValue(values.firstName),
              lastName: normalizeValue(values.lastName),
              email: normalizeValue(values.email),
              phone: normalizeValue(values.phone),
              password: values.password,
              role: values.role,
              ...(normalizeValue(values.companyName)
                ? { companyName: normalizeValue(values.companyName) }
                : {})
            };

      const result = await mutation.mutateAsync(payload);

      if (result.requires2FA) {
        setTwoFactorChallenge(result);
        showSuccess(t("auth", "messages.twoFactorRequired", "Code de verification requis."));
        return;
      }

      showSuccess(mode === "login" ? t("auth", "messages.loginSuccess", "Connexion reussie.") : t("auth", "messages.registerSuccess", "Compte cree avec succes."));
      resolveAfterAuth(result);
    } catch (error) {
      showError(
        extractApiErrorMessage(
          error,
          mode === "login" ? t("auth", "messages.loginError", "La connexion a echoue.") : t("auth", "messages.registerError", "La creation du compte a echoue.")
        )
      );
    }
  };

  const collectSocialPayload = (provider) => {
    const providerLabel = provider === "google" ? "Google" : "Facebook";
    const providerId = window.prompt(`${providerLabel} providerId`);

    if (!providerId) {
      return null;
    }

    const email = window.prompt(`${providerLabel} email`);

    if (!email) {
      return null;
    }

    return {
      providerId: providerId.trim(),
      email: email.trim()
    };
  };

  const handleSocialLogin = async (provider) => {
    try {
      const payload = collectSocialPayload(provider);

      if (!payload) {
        return;
      }

      const result = await socialLoginMutation.mutateAsync({ provider, payload });

      if (result.requires2FA) {
        setTwoFactorChallenge(result);
        showSuccess(t("auth", "messages.twoFactorRequired", "Code de verification requis."));
        return;
      }

      showSuccess(t("messages", "auth.success", "Compte connecte avec succes."));
      resolveAfterAuth(result);
    } catch (error) {
      const responseType = error?.response?.data?.type;
      showError(
        responseType === "auth.already_used"
          ? t("messages", "auth.already_used", "Ce compte est deja utilise")
          : extractApiErrorMessage(error, t("messages", "auth.error", "Erreur de connexion"))
      );
    }
  };

  const handleVerifyTwoFactor = async () => {
    if (!twoFactorChallenge?.twoFactorToken) {
      return;
    }

    try {
      const result = await verifyTwoFactorMutation.mutateAsync({
        challengeToken: twoFactorChallenge.twoFactorToken,
        code: twoFactorCode
      });

      showSuccess(t("auth", "messages.loginSuccess", "Connexion reussie."));
      setTwoFactorChallenge(null);
      setTwoFactorCode("");
      resolveAfterAuth(result);
    } catch (error) {
      showError(extractApiErrorMessage(error, t("auth", "messages.twoFactorError", "Code de verification invalide.")));
    }
  };

  const mutationError = mutation.isError
    ? extractApiErrorMessage(
        mutation.error,
        mode === "login" ? t("auth", "messages.loginError", "La connexion a echoue.") : t("auth", "messages.registerError", "La creation du compte a echoue.")
      )
    : null;

  return (
    <Card className="border-none  p-0 shadow-none !bg-transparent">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold text-white">{title}</h2>
        <p className="text-sm leading-7 text-stone-300">{subtitle}</p>
      </div>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        {mode !== "login" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Controller
              name="firstName"
              control={control}
              render={({ field }) => (
                <Input label={t("auth", "fields.firstName", "Prenom")} placeholder={t("auth", "placeholders.firstName", "Aminata")} error={errors.firstName?.message} {...field} />
              )}
            />
            <Controller
              name="lastName"
              control={control}
              render={({ field }) => (
                <Input label={t("auth", "fields.lastName", "Nom")} placeholder={t("auth", "placeholders.lastName", "Kone")} error={errors.lastName?.message} {...field} />
              )}
            />
          </div>
        ) : null}

        {mode !== "login" && mode === "agency" ? (
          <Controller
            name="companyName"
            control={control}
            render={({ field }) => (
              <Input
                label={t("auth", "fields.companyName", "Nom de l'agence")}
                placeholder={t("auth", "placeholders.companyName", "Yopii Immo")}
                error={errors.companyName?.message}
                {...field}
              />
            )}
          />
        ) : null}

        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <Input
              label={t("auth", "fields.email", "Email")}
              type="email"
              placeholder={t("auth", "placeholders.email", "contact@yopii.app")}
              error={errors.email?.message}
              {...field}
            />
          )}
        />

        {mode !== "login" ? (
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <Input
                label={t("auth", "fields.phone", "Telephone")}
                placeholder={t("auth", "placeholders.phone", "+225 07 00 00 00 00")}
                error={errors.phone?.message}
                {...field}
              />
            )}
          />
        ) : null}

        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <PasswordInput
              label={t("auth", "fields.password", "Mot de passe")}
              placeholder={t("auth", "placeholders.password", "********")}
              error={errors.password?.message}
              {...field}
            />
          )}
        />

        {mutationError ? <p className="text-sm text-red-300">{mutationError}</p> : null}

        <Button type="submit" className="w-full" disabled={isSubmitting || mutation.isPending}>
          {isSubmitting || mutation.isPending ? t("auth", "status.loading", "Chargement...") : t("auth", `submit.${mode}`, "Se connecter")}
        </Button>
      </form>

      {mode === "login" ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Button type="button" variant="secondary" onClick={() => handleSocialLogin("google")} disabled={socialLoginMutation.isPending}>
            {t("messages", "auth.google.login", "Login avec Google")}
          </Button>
          <Button type="button" variant="secondary" onClick={() => handleSocialLogin("facebook")} disabled={socialLoginMutation.isPending}>
            {t("messages", "auth.facebook.login", "Login avec Facebook")}
          </Button>
        </div>
      ) : null}

      {twoFactorChallenge ? (
        <Card className="mt-5 border-white/10 bg-stone-950/50">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-white">{t("auth", "twoFactor.title", "Double authentification")}</p>
              <p className="mt-1 text-sm text-stone-400">
                {twoFactorChallenge.method === "email"
                  ? t("auth", "twoFactor.emailHint", "Saisissez le code recu par email.")
                  : t("auth", "twoFactor.authenticatorHint", "Saisissez le code genere par votre application d'authentification.")}
              </p>
              {twoFactorChallenge.developmentOtp ? (
                <p className="mt-2 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                  {`Dev OTP: ${twoFactorChallenge.developmentOtp}`}
                </p>
              ) : null}
            </div>
            <Input
              label={t("auth", "twoFactor.code", "Code OTP")}
              inputMode="numeric"
              maxLength={6}
              value={twoFactorCode}
              onChange={(event) => setTwoFactorCode(event.target.value)}
            />
            <Button type="button" className="w-full" disabled={verifyTwoFactorMutation.isPending || twoFactorCode.length !== 6} onClick={handleVerifyTwoFactor}>
              {t("auth", "twoFactor.verify", "Verifier")}
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-4 text-sm text-stone-400">
        <Link to="/login" className="hover:text-white">{t("auth", "links.login", "Connexion")}</Link>
        <Link to="/register/user" className="hover:text-white">{t("auth", "links.user", "Compte utilisateur")}</Link>
        <Link to="/register/owner" className="hover:text-white">{t("auth", "links.owner", "Compte proprietaire")}</Link>
        <Link to="/register/agency" className="hover:text-white">{t("auth", "links.agency", "Compte agence")}</Link>
        <Link to="/register/agent" className="hover:text-white">{t("auth", "links.agent", "Agent independant")}</Link>
      </div>
    </Card>
  );
};
