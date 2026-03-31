import { Card } from "../../../components/ui/Card.jsx";
import { Input } from "../../../components/ui/Input.jsx";
import { PasswordInput } from "../../../components/ui/PasswordInput.jsx";
import { Button } from "../../../components/ui/Button.jsx";

export const SectionProfile = ({
  profileForm,
  passwordForm,
  updateProfileMutation,
  changePasswordMutation
}) => (
  <div className="space-y-6">
    <Card>
      <form className="grid gap-4 md:grid-cols-2" onSubmit={profileForm.handleSubmit((values) => updateProfileMutation.mutate(values))}>
        <Input label="Nom" {...profileForm.register("lastName", { required: true })} />
        <Input label="Prenom" {...profileForm.register("firstName", { required: true })} />
        <Input label="Email" type="email" {...profileForm.register("email", { required: true })} />
        <Input label="Telephone" {...profileForm.register("phone")} />
        <div className="md:col-span-2">
          <Input label="Photo de profil" placeholder="https://..." {...profileForm.register("avatar")} />
        </div>
        <div className="md:col-span-2 flex justify-end">
          <Button type="submit" disabled={updateProfileMutation.isPending}>Enregistrer le profil</Button>
        </div>
      </form>
    </Card>

    <Card>
      <p className="text-sm font-medium text-white">Changement de mot de passe</p>
      <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={passwordForm.handleSubmit((values) => changePasswordMutation.mutate(values))}>
        <PasswordInput label="Mot de passe actuel" {...passwordForm.register("currentPassword", { required: true })} />
        <PasswordInput label="Nouveau mot de passe" {...passwordForm.register("newPassword", { required: true })} />
        <div className="md:col-span-2 flex justify-end">
          <Button type="submit" disabled={changePasswordMutation.isPending}>Changer le mot de passe</Button>
        </div>
      </form>
    </Card>
  </div>
);
