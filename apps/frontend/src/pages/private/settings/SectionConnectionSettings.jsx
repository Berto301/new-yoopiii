import { useMemo, useState } from "react";
import { useUserPreferences } from "../../../app/preferences/UserPreferencesProvider.jsx";
import { Badge } from "../../../components/ui/Badge.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Card } from "../../../components/ui/Card.jsx";
import { Input } from "../../../components/ui/Input.jsx";
import { useNotification } from "../../../hooks/useNotification.js";

const providerLabels = {
  google: "Google",
  facebook: "Facebook"
};

const collectProviderPayload = (provider) => {
  const providerLabel = providerLabels[provider] || provider;
  const providerId = window.prompt(`${providerLabel} providerId`);

  if (!providerId) {
    return null;
  }

  const email = window.prompt(`${providerLabel} email`);

  if (!email) {
    return null;
  }

  return {
    provider,
    providerId: providerId.trim(),
    email: email.trim()
  };
};

export const SectionConnectionSettings = ({
  profile,
  linkProviderMutation,
  unlinkProviderMutation,
  enableTwoFactorMutation,
  verifyTwoFactorMutation,
  disableTwoFactorMutation
}) => {
  const { t } = useUserPreferences();
  const { showSuccess, showError } = useNotification();
  const [twoFactorSetup, setTwoFactorSetup] = useState(null);
  const [setupCode, setSetupCode] = useState("");
  const [disableCode, setDisableCode] = useState("");

  const providersByKey = useMemo(() => {
    const entries = new Map();

    (profile?.socialProviders || []).forEach((provider) => {
      entries.set(provider.provider, provider);
    });

    return entries;
  }, [profile?.socialProviders]);

  const handleLinkProvider = async (provider) => {
    try {
      const payload = collectProviderPayload(provider);

      if (!payload) {
        return;
      }

      await linkProviderMutation.mutateAsync(payload);
      showSuccess(t("messages", "auth.success", "Compte connecte avec succes."));
    } catch (error) {
      const responseType = error?.response?.data?.type;
      showError(responseType === "auth.already_used"
        ? t("messages", "auth.already_used", "Ce compte est deja utilise")
        : t("messages", "auth.error", "Erreur de connexion"));
    }
  };

  const handleUnlinkProvider = async (provider) => {
    try {
      await unlinkProviderMutation.mutateAsync(provider);
      showSuccess(t("settings", "connection.social.disconnected", "Compte deconnecte."));
    } catch (_error) {
      showError(t("messages", "auth.error", "Erreur de connexion"));
    }
  };

  const handleEnableTwoFactor = async () => {
    try {
      const setup = await enableTwoFactorMutation.mutateAsync({ method: "authenticator" });
      setTwoFactorSetup(setup);
      setSetupCode("");
      showSuccess(t("settings", "connection.twoFactor.setupStarted", "Configuration 2FA initialisee."));
    } catch (_error) {
      showError(t("settings", "connection.twoFactor.setupError", "Impossible de configurer la 2FA."));
    }
  };

  const handleVerifyTwoFactor = async () => {
    try {
      await verifyTwoFactorMutation.mutateAsync({ code: setupCode });
      setTwoFactorSetup(null);
      setSetupCode("");
      showSuccess(t("settings", "connection.twoFactor.enabled", "Double authentification activee."));
    } catch (_error) {
      showError(t("settings", "connection.twoFactor.invalidCode", "Code OTP invalide."));
    }
  };

  const handleDisableTwoFactor = async () => {
    try {
      await disableTwoFactorMutation.mutateAsync({ code: disableCode || undefined });
      setDisableCode("");
      showSuccess(t("settings", "connection.twoFactor.disabled", "Double authentification desactivee."));
    } catch (_error) {
      showError(t("settings", "connection.twoFactor.disableError", "Impossible de desactiver la 2FA."));
    }
  };

  const isTwoFactorEnabled = Boolean(profile?.twoFactor?.isEnabled);

  return (
    <Card className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-stone-400">
          {t("settings", "connection.eyebrow", "Connexion")}
        </p>
        <h3 className="text-xl font-semibold text-white">
          {t("settings", "connection.title", "Parametre de connexion aux comptes")}
        </h3>
        <p className="text-sm text-stone-300">
          {t("settings", "connection.description", "Liez vos comptes sociaux et renforcez la connexion avec une double authentification.")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {["google", "facebook"].map((provider) => {
          const linkedProvider = providersByKey.get(provider);
          const isLinked = Boolean(linkedProvider);

          return (
            <div key={provider} className="rounded-[1.5rem] border border-white/10 bg-stone-950/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-white">{providerLabels[provider]}</p>
                  <p className="mt-1 text-sm text-stone-400">{linkedProvider?.email || t("settings", "connection.social.notConnected", "Non connecte")}</p>
                </div>
                <Badge className={isLinked
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                  : "border-stone-400/30 bg-stone-500/10 text-stone-100"}
                >
                  {isLinked
                    ? t("settings", "connection.social.connected", "Connecte")
                    : t("settings", "connection.social.disconnectedStatus", "Non connecte")}
                </Badge>
              </div>
              <div className="mt-4">
                {isLinked ? (
                  <Button type="button" variant="secondary" className="w-full" onClick={() => handleUnlinkProvider(provider)} disabled={unlinkProviderMutation.isPending}>
                    {t("settings", "connection.social.disconnect", "Deconnecter")}
                  </Button>
                ) : (
                  <Button type="button" variant="secondary" className="w-full" onClick={() => handleLinkProvider(provider)} disabled={linkProviderMutation.isPending}>
                    {provider === "google"
                      ? t("messages", "auth.google.connect", "Connecter avec Google")
                      : t("messages", "auth.facebook.connect", "Connecter avec Facebook")}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-white/10 pt-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
              {t("settings", "connection.twoFactor.eyebrow", "Double authentification")}
            </p>
            <h4 className="mt-2 text-lg font-semibold text-white">
              {t("settings", "connection.twoFactor.title", "Securiser la connexion")}
            </h4>
            <p className="mt-2 text-sm leading-6 text-stone-300">
              {isTwoFactorEnabled
                ? t("settings", "connection.twoFactor.enabledDescription", "La verification OTP est demandee apres email et mot de passe.")
                : t("settings", "connection.twoFactor.disabledDescription", "Ajoutez une verification OTP via application d'authentification.")}
            </p>
          </div>
          <Badge className={isTwoFactorEnabled
            ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
            : "border-stone-400/30 bg-stone-500/10 text-stone-100"}
          >
            {isTwoFactorEnabled
              ? t("settings", "connection.twoFactor.enabledStatus", "Active")
              : t("settings", "connection.twoFactor.disabledStatus", "Desactive")}
          </Badge>
        </div>

        {!isTwoFactorEnabled ? (
          <div className="mt-5 space-y-4">
            <Button type="button" variant="secondary" onClick={handleEnableTwoFactor} disabled={enableTwoFactorMutation.isPending}>
              {t("settings", "connection.twoFactor.configure", "Configurer")}
            </Button>

            {twoFactorSetup ? (
              <div className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-stone-950/50 p-4 md:grid-cols-[180px_1fr]">
                <div className="flex items-center justify-center rounded-2xl bg-white p-3">
                  <img src={twoFactorSetup.qrCodeUrl} alt={t("settings", "connection.twoFactor.qrAlt", "QR code 2FA")} className="h-36 w-36" />
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-stone-300">{t("settings", "connection.twoFactor.scanHint", "Scannez le QR code avec votre application d'authentification puis saisissez le code OTP.")}</p>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs break-all text-stone-300">
                    {twoFactorSetup.secret}
                  </div>
                  <Input
                    label={t("settings", "connection.twoFactor.code", "Code OTP")}
                    inputMode="numeric"
                    maxLength={6}
                    value={setupCode}
                    onChange={(event) => setSetupCode(event.target.value)}
                  />
                  <Button type="button" onClick={handleVerifyTwoFactor} disabled={verifyTwoFactorMutation.isPending || setupCode.length !== 6}>
                    {t("settings", "connection.twoFactor.verify", "Verifier et activer")}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,240px)_auto] md:items-end">
            <Input
              label={t("settings", "connection.twoFactor.disableCode", "Code OTP")}
              inputMode="numeric"
              maxLength={6}
              value={disableCode}
              onChange={(event) => setDisableCode(event.target.value)}
            />
            <Button type="button" variant="secondary" onClick={handleDisableTwoFactor} disabled={disableTwoFactorMutation.isPending || disableCode.length !== 6}>
              {t("settings", "connection.twoFactor.disable", "Desactiver")}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
