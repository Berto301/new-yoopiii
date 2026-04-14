import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginSchema, registerSchema } from "../validators/auth.schemas.js";
import { useAuthMutations } from "../hooks/useAuthMutations.js";
import { Input } from "../../../components/ui/Input.jsx";
import { PasswordInput } from "../../../components/ui/PasswordInput.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Card } from "../../../components/ui/Card.jsx";
import { useNotification } from "../../../hooks/useNotification.js";

const submitLabelByMode = {
  login: "Se connecter",
  user: "Creer mon compte",
  proprietaire: "Creer mon espace proprietaire",
  agency: "Creer mon agence",
  independent_agent: "Creer mon profil agent"
};

const normalizeValue = (value) => (typeof value === "string" ? value.trim() : value);

export const AuthForm = ({ mode = "login", title, subtitle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useNotification();
  const { loginMutation, registerMutation, resolveRedirectPath, extractApiErrorMessage } = useAuthMutations();

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
      showSuccess(mode === "login" ? "Connexion reussie." : "Compte cree avec succes.");
      const fallbackPath = resolveRedirectPath(result.user);
      const intendedPath = location.state?.from?.pathname;
      navigate(intendedPath || fallbackPath, { replace: true });
    } catch (error) {
      showError(
        extractApiErrorMessage(
          error,
          mode === "login" ? "La connexion a echoue." : "La creation du compte a echoue."
        )
      );
    }
  };

  const mutationError = mutation.isError
    ? extractApiErrorMessage(
        mutation.error,
        mode === "login" ? "La connexion a echoue." : "La creation du compte a echoue."
      )
    : null;

  return (
    <Card className="border-none bg-transparent p-0 shadow-none">
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
                <Input label="Prenom" placeholder="Aminata" error={errors.firstName?.message} {...field} />
              )}
            />
            <Controller
              name="lastName"
              control={control}
              render={({ field }) => (
                <Input label="Nom" placeholder="Kone" error={errors.lastName?.message} {...field} />
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
                label="Nom de l'agence"
                placeholder="Yopii Immo"
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
              label="Email"
              type="email"
              placeholder="contact@yopii.app"
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
                label="Telephone"
                placeholder="+225 07 00 00 00 00"
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
              label="Mot de passe"
              placeholder="********"
              error={errors.password?.message}
              {...field}
            />
          )}
        />

        {mutationError ? <p className="text-sm text-red-300">{mutationError}</p> : null}

        <Button type="submit" className="w-full" disabled={isSubmitting || mutation.isPending}>
          {isSubmitting || mutation.isPending ? "Chargement..." : submitLabelByMode[mode]}
        </Button>
      </form>

      <div className="mt-6 flex flex-wrap gap-4 text-sm text-stone-400">
        <Link to="/login" className="hover:text-white">Connexion</Link>
        <Link to="/register/user" className="hover:text-white">Compte utilisateur</Link>
        <Link to="/register/owner" className="hover:text-white">Compte proprietaire</Link>
        <Link to="/register/agency" className="hover:text-white">Compte agence</Link>
        <Link to="/register/agent" className="hover:text-white">Agent independant</Link>
      </div>
    </Card>
  );
};
