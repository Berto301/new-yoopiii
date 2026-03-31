import { useMemo } from "react";
import { useFieldArray, useForm, Controller } from "react-hook-form";
import { Input } from "../../../components/ui/Input.jsx";
import { ModalLayout } from "../../../components/layout/modals/ModalLayout.jsx";
import { BaseListBox } from "../../../components/form/BaseListBox.jsx";
import { Button } from "../../../components/ui/Button.jsx";

const propertyTypeOptions = [
  { label: "Maison", value: "house" },
  { label: "Terrain", value: "land" },
  { label: "Appartement", value: "apartment" },
  { label: "Commerce", value: "commercial" },
  { label: "Bureau", value: "office" },
  { label: "Entrepot", value: "warehouse" }
];

const purposeOptions = [
  { label: "Vente", value: "sale" },
  { label: "Location", value: "rent" }
];

const mediaTypeOptions = [
  { label: "Image", value: "image" },
  { label: "Video", value: "video" },
  { label: "Visite virtuelle", value: "virtual_tour" },
  { label: "Document", value: "document" }
];

const featureOptions = [
  { label: "Piscine", value: "Piscine" },
  { label: "Parking", value: "Parking" },
  { label: "Balcon", value: "Balcon" },
  { label: "Jardin", value: "Jardin" },
  { label: "Securite", value: "Securite" },
  { label: "Ascenseur", value: "Ascenseur" },
  { label: "Fibre", value: "Fibre" },
  { label: "Vue mer", value: "Vue mer" }
];

const mapPropertyToFormValues = (property) => ({
  title: property?.title || "",
  description: property?.description || "",
  type: propertyTypeOptions.find((item) => item.value === property?.type) || propertyTypeOptions[0],
  purpose: purposeOptions.find((item) => item.value === property?.purpose) || purposeOptions[0],
  price: property?.price || "",
  currency: property?.currency || "XOF",
  area: property?.area || 0,
  rooms: property?.rooms || 0,
  bedrooms: property?.bedrooms || 0,
  bathrooms: property?.bathrooms || 0,
  features: featureOptions.filter((item) => (property?.features || []).includes(item.value)),
  address: property?.address || "",
  googlePlaceId: property?.googlePlaceId || "",
  location: {
    lat: property?.location?.coordinates?.[1] ?? "",
    lng: property?.location?.coordinates?.[0] ?? ""
  },
  coverImage: property?.coverImage || "",
  has3DView: Boolean(property?.has3DView),
  threeDUrl: property?.threeDUrl || "",
  media: (property?.media || []).length
    ? property.media.map((item) => ({
        type: mediaTypeOptions.find((option) => option.value === item.type) || mediaTypeOptions[0],
        url: item.url || "",
        thumbnailUrl: item.thumbnailUrl || ""
      }))
    : [{ type: mediaTypeOptions[0], url: "", thumbnailUrl: "" }]
});

const normalizePayload = (values) => ({
  title: values.title,
  description: values.description,
  type: values.type.value,
  purpose: values.purpose.value,
  price: Number(values.price || 0),
  currency: values.currency,
  area: Number(values.area || 0),
  rooms: Number(values.rooms || 0),
  bedrooms: Number(values.bedrooms || 0),
  bathrooms: Number(values.bathrooms || 0),
  features: values.features.map((item) => item.value),
  address: values.address,
  location: {
    lat: Number(values.location.lat || 0),
    lng: Number(values.location.lng || 0),
    placeId: values.googlePlaceId || null
  },
  coverImage: values.coverImage || null,
  has3DView: Boolean(values.has3DView),
  threeDUrl: values.has3DView ? values.threeDUrl || null : null,
  media: values.media
    .filter((item) => item.url)
    .map((item, index) => ({
      type: item.type.value,
      url: item.url,
      thumbnailUrl: item.thumbnailUrl || null,
      order: index
    }))
});

export const ModalManageProperty = ({
  open,
  mode,
  property,
  onClose,
  onSubmit,
  isSaving = false
}) => {
  const defaultValues = useMemo(() => mapPropertyToFormValues(property), [property]);
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm({ defaultValues });

  const has3DView = watch("has3DView");
  const { fields, append, remove } = useFieldArray({ control, name: "media" });

  const title = mode === "edit" ? "Modifier le Bien" : "Ajout de Bien";

  const closeModal = () => {
    reset(defaultValues);
    onClose();
  };

  return (
    <ModalLayout
      open={open}
      title={title}
      onClose={closeModal}
      onSave={handleSubmit(async (values) => {
        await onSubmit(normalizePayload(values));
        reset(mapPropertyToFormValues(null));
      })}
      saveLabel="Enregistrer"
      cancelLabel="Annuler"
      isSaving={isSaving}
    >
      <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Titre" {...register("title", { required: "Le titre est requis" })} error={errors.title?.message} />
          <Input label="Prix" type="number" {...register("price", { required: "Le prix est requis" })} error={errors.price?.message} />
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <BaseListBox label="Type de bien" options={propertyTypeOptions} value={field.value} onChange={field.onChange} error={errors.type?.message} />
            )}
          />
          <Controller
            name="purpose"
            control={control}
            render={({ field }) => (
              <BaseListBox label="Objectif" options={purposeOptions} value={field.value} onChange={field.onChange} error={errors.purpose?.message} />
            )}
          />
          <Input label="Adresse" {...register("address", { required: "L'adresse est requise" })} error={errors.address?.message} />
          <Input label="Google Place ID" {...register("googlePlaceId")} placeholder="Autocomplete Google Maps a brancher ici" />
          <Input label="Latitude" type="number" step="any" {...register("location.lat", { required: "Latitude requise" })} error={errors.location?.lat?.message} />
          <Input label="Longitude" type="number" step="any" {...register("location.lng", { required: "Longitude requise" })} error={errors.location?.lng?.message} />
          <Input label="Surface (m2)" type="number" {...register("area")} />
          <Input label="Pieces" type="number" {...register("rooms")} />
          <Input label="Chambres" type="number" {...register("bedrooms")} />
          <Input label="Salles de bain" type="number" {...register("bathrooms")} />
          <Input label="Devise" {...register("currency")} />
          <Input label="Image de couverture" {...register("coverImage")} placeholder="https://..." />
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-200">Description</span>
          <textarea
            className="min-h-32 w-full rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-brand-500"
            {...register("description", { required: "La description est requise" })}
          />
          {errors.description ? <span className="text-xs text-red-300">{errors.description.message}</span> : null}
        </label>

        <Controller
          name="features"
          control={control}
          render={({ field }) => (
            <BaseListBox
              label="Caracteristiques"
              options={featureOptions}
              value={field.value}
              onChange={field.onChange}
              optionLabelKey="label"
              optionValueKey="value"
              multiple
            />
          )}
        />

        <div className="space-y-4 rounded-3xl border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Medias et fichiers</p>
              <p className="text-xs text-stone-400">Images, videos, visites virtuelles et documents.</p>
            </div>
            <Button type="button" variant="secondary" className="px-4 py-2" onClick={() => append({ type: mediaTypeOptions[0], url: "", thumbnailUrl: "" })}>
              Ajouter un fichier
            </Button>
          </div>
          <div className="space-y-4">
            {fields.map((fieldItem, index) => (
              <div key={fieldItem.id} className="grid gap-4 rounded-2xl border border-white/10 p-4 md:grid-cols-[180px_1fr_1fr_auto]">
                <Controller
                  name={`media.${index}.type`}
                  control={control}
                  render={({ field }) => (
                    <BaseListBox label="Type" options={mediaTypeOptions} value={field.value} onChange={field.onChange} />
                  )}
                />
                <Input label="URL" {...register(`media.${index}.url`)} placeholder="https://..." />
                <Input label="Thumbnail" {...register(`media.${index}.thumbnailUrl`)} placeholder="https://..." />
                <div className="flex items-end">
                  <Button type="button" variant="ghost" className="px-4 py-2" onClick={() => remove(index)}>
                    Supprimer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-white/10 p-4">
          <label className="flex items-center gap-3 text-sm text-stone-200">
            <input type="checkbox" className="h-4 w-4 rounded border-white/10 bg-stone-900/70" {...register("has3DView")} />
            Activer la version 3D du bien
          </label>
          {has3DView ? <Input label="URL visite 3D" {...register("threeDUrl")} placeholder="https://my.matterport.com/..." /> : null}
        </div>
      </form>
    </ModalLayout>
  );
};
