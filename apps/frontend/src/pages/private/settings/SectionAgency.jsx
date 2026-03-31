import { Controller } from "react-hook-form";
import { Card } from "../../../components/ui/Card.jsx";
import { Input } from "../../../components/ui/Input.jsx";
import { Button } from "../../../components/ui/Button.jsx";

export const SectionAgency = ({
  agencyForm,
  updateAgencyMutation,
  onDeleteClick,
  isDeleteDisabled = false,
  onAgencySubmit
}) => (
  <Card>
    <form className="grid gap-4 md:grid-cols-2" onSubmit={agencyForm.handleSubmit(onAgencySubmit)}>
      <Controller
        name="name"
        control={agencyForm.control}
        render={({ field }) => <Input label="Nom agence" {...field} />}
      />
      <Controller
        name="contactEmail"
        control={agencyForm.control}
        render={({ field }) => <Input label="Email contact" type="email" {...field} />}
      />
      <Controller
        name="contactPhone"
        control={agencyForm.control}
        render={({ field }) => <Input label="Telephone contact" {...field} />}
      />
      <Controller
        name="address"
        control={agencyForm.control}
        render={({ field }) => <Input label="Adresse" {...field} />}
      />
      <div className="md:col-span-2">
        <Controller
          name="logo"
          control={agencyForm.control}
          render={({ field }) => <Input label="Logo" placeholder="https://..." {...field} />}
        />
      </div>
      <div className="md:col-span-2">
        <Controller
          name="coverImage"
          control={agencyForm.control}
          render={({ field }) => <Input label="Image couverture" placeholder="https://..." {...field} />}
        />
      </div>
      <Controller
        name="description"
        control={agencyForm.control}
        render={({ field }) => (
          <label className="md:col-span-2 block space-y-2">
            <span className="text-sm font-medium text-stone-200">Description agence</span>
            <textarea
              className="min-h-32 w-full rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-brand-500"
              {...field}
            />
          </label>
        )}
      />
      <div className="md:col-span-2 flex flex-col gap-3 pt-2 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="secondary"
          className="border-red-500/40 text-red-200 hover:border-red-400 hover:bg-red-500/10"
          disabled={isDeleteDisabled}
          onClick={onDeleteClick}
        >
          Suppression de l'agence
        </Button>
        <Button type="submit" disabled={updateAgencyMutation.isPending}>Enregistrer l'agence</Button>
      </div>
    </form>
  </Card>
);
