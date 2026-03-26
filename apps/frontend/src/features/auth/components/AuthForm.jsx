import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginSchema, registerSchema } from "../validators/auth.schemas.js";
import { useAuthMutations } from "../hooks/useAuthMutations.js";
import { Input } from "../../../components/ui/Input.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Card } from "../../../components/ui/Card.jsx";

const submitLabelByMode = {
  login: "Se connecter",
  user: "Creer mon compte",
  agency: "Creer mon agence",
  independent_agent: "Creer mon profil agent"
};

export const AuthForm = ({ mode = "login", title, subtitle }) => {
  const navigate = useNavigate();
  const location = useLocation();
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
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues
  });

  const mutation = mode === "login" ? loginMutation : registerMutation;

  const onSubmit = async (values) => {
    const payload =
      mode === "login"
        ? {
            email: values.email,
            password: values.password
          }
        : {
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            phone: values.phone,
            password: values.password,
            companyName: values.companyName,
            role: values.role
          };

    const result = await mutation.mutateAsync(payload);
    const fallbackPath = resolveRedirectPath(result.user);
    const intendedPath = location.state?.from?.pathname;
    navigate(intendedPath || fallbackPath, { replace: true });
  };

  const mutationError = mutation.isError
    ? extractApiErrorMessage(
        mutation.error,
        mode === "login"
          ? "La connexion a echoue."
          : "La creation du compte a echoue."
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
            <Input label="Prenom" placeholder="Aminata" error={errors.firstName?.message} {...register("firstName")} />
            <Input label="Nom" placeholder="Kone" error={errors.lastName?.message} {...register("lastName")} />
          </div>
        ) : null}

        {mode !== "login" && mode === "agency" ? (
          <Input
            label="Nom de l'agence"
            placeholder="Yopii Immo"
            error={errors.companyName?.message}
            {...register("companyName")}
          />
        ) : null}

        <Input
          label="Email"
          type="email"
          placeholder="contact@yopii.app"
          error={errors.email?.message}
          {...register("email")}
        />

        {mode !== "login" ? (
          <Input
            label="Telephone"
            placeholder="+225 07 00 00 00 00"
            error={errors.phone?.message}
            {...register("phone")}
          />
        ) : null}

        <Input
          label="Mot de passe"
          type="password"
          placeholder="********"
          error={errors.password?.message}
          {...register("password")}
        />

        {mutationError ? <p className="text-sm text-red-300">{mutationError}</p> : null}

        <Button type="submit" className="w-full" disabled={isSubmitting || mutation.isPending}>
          {isSubmitting || mutation.isPending ? "Chargement..." : submitLabelByMode[mode]}
        </Button>
      </form>

      <div className="mt-6 flex flex-wrap gap-4 text-sm text-stone-400">
        <Link to="/login" className="hover:text-white">Connexion</Link>
        <Link to="/register/user" className="hover:text-white">Compte utilisateur</Link>
        <Link to="/register/agency" className="hover:text-white">Compte agence</Link>
        <Link to="/register/agent" className="hover:text-white">Agent independant</Link>
      </div>
    </Card>
  );
};
