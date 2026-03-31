import { Card } from "../../../components/ui/Card.jsx";
import { Input } from "../../../components/ui/Input.jsx";
import { Button } from "../../../components/ui/Button.jsx";

export const SectionAgency = ({ agencyForm, updateAgencyMutation }) => (
  <Card>
    <form className="grid gap-4 md:grid-cols-2" onSubmit={agencyForm.handleSubmit((values) => updateAgencyMutation.mutate({ payload: values }))}>
      <Input label="Nom agence" {...agencyForm.register("name")} />
      <Input label="Email contact" type="email" {...agencyForm.register("contactEmail")} />
      <Input label="Telephone contact" {...agencyForm.register("contactPhone")} />
      <Input label="Adresse" {...agencyForm.register("address")} />
      <div className="md:col-span-2">
        <Input label="Logo" placeholder="https://..." {...agencyForm.register("logo")} />
      </div>
      <div className="md:col-span-2">
        <Input label="Image couverture" placeholder="https://..." {...agencyForm.register("coverImage")} />
      </div>
      <label className="md:col-span-2 block space-y-2">
        <span className="text-sm font-medium text-stone-200">Description agence</span>
        <textarea className="min-h-32 w-full rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-brand-500" {...agencyForm.register("description")} />
      </label>
      <div className="md:col-span-2 flex justify-end">
        <Button type="submit" disabled={updateAgencyMutation.isPending}>Enregistrer l'agence</Button>
      </div>
    </form>
  </Card>
);
