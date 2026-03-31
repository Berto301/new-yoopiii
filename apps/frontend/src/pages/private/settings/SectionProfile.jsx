import { Controller } from "react-hook-form";
import { Card } from "../../../components/ui/Card.jsx";
import { Input } from "../../../components/ui/Input.jsx";
import { PasswordInput } from "../../../components/ui/PasswordInput.jsx";
import { Button } from "../../../components/ui/Button.jsx";

export const SectionProfile = ({
  profileForm,
  passwordForm,
  updateProfileMutation,
  changePasswordMutation,
  onProfileSubmit,
  onPasswordSubmit
}) => (
  <div className="space-y-6">
    <Card>
      <form className="grid gap-4 md:grid-cols-2" onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
        <Controller
          name="lastName"
          control={profileForm.control}
          render={({ field }) => <Input label="Nom" {...field} />}
        />
        <Controller
          name="firstName"
          control={profileForm.control}
          render={({ field }) => <Input label="Prenom" {...field} />}
        />
        <Controller
          name="email"
          control={profileForm.control}
          render={({ field }) => <Input label="Email" type="email" {...field} />}
        />
        <Controller
          name="phone"
          control={profileForm.control}
          render={({ field }) => <Input label="Telephone" {...field} />}
        />
        <div className="md:col-span-2">
          <Controller
            name="avatar"
            control={profileForm.control}
            render={({ field }) => <Input label="Photo de profil" placeholder="https://..." {...field} />}
          />
        </div>
        <div className="md:col-span-2 flex justify-end">
          <Button type="submit" disabled={updateProfileMutation.isPending}>Enregistrer le profil</Button>
        </div>
      </form>
    </Card>

    <Card>
      <p className="text-sm font-medium text-white">Changement de mot de passe</p>
      <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
        <Controller
          name="currentPassword"
          control={passwordForm.control}
          render={({ field }) => <PasswordInput label="Mot de passe actuel" {...field} />}
        />
        <Controller
          name="newPassword"
          control={passwordForm.control}
          render={({ field }) => <PasswordInput label="Nouveau mot de passe" {...field} />}
        />
        <div className="md:col-span-2 flex justify-end">
          <Button type="submit" disabled={changePasswordMutation.isPending}>Changer le mot de passe</Button>
        </div>
      </form>
    </Card>
  </div>
);
