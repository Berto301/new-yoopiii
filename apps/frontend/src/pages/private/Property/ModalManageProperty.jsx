import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { Autocomplete, GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
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

const GOOGLE_MAPS_LIBRARIES = ["places"];
const DEFAULT_MAP_CENTER = { lat: 48.8566, lng: 2.3522 };
const DEFAULT_MAP_ZOOM = 14;
const MAP_CONTAINER_CLASS = "h-[320px] w-full";
const COVER_ACCEPT = "image/*";
const MEDIA_ACCEPT = {
  image: "image/*",
  video: "video/*"
};

const isFiniteCoordinate = (value) => Number.isFinite(Number(value));
const isUploadableMediaType = (mediaType) => mediaType === "image" || mediaType === "video";
const resolveMediaAccept = (mediaType) => MEDIA_ACCEPT[mediaType] || undefined;

const validateLocalFile = ({ file, mediaType, assetKind }) => {
  if (!file) {
    return "Aucun fichier selectionne.";
  }

  if (assetKind === "cover" && !file.type?.startsWith("image/")) {
    return "La couverture doit etre une image.";
  }

  if (mediaType === "image" && !file.type?.startsWith("image/")) {
    return "Le fichier selectionne doit etre une image.";
  }

  if (mediaType === "video" && !file.type?.startsWith("video/")) {
    return "Le fichier selectionne doit etre une video.";
  }

  return null;
};

const buildCoordinateState = (property) => ({
  lat: property?.location?.coordinates?.[1] ?? "",
  lng: property?.location?.coordinates?.[0] ?? ""
});

const buildMapCenter = (location) => {
  if (isFiniteCoordinate(location?.lat) && isFiniteCoordinate(location?.lng)) {
    return {
      lat: Number(location.lat),
      lng: Number(location.lng)
    };
  }

  return DEFAULT_MAP_CENTER;
};

const mapPropertyToFormValues = (property, contractOptions = []) => ({
  managementContract: contractOptions.find((item) => item.value === property?.managementContractId) || null,
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
  location: buildCoordinateState(property),
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
  managementContractId: values.managementContract?.value || null,
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

const LocationSearchInput = ({ value, onChange, disabled }) => (
  <label className="block space-y-2">
    <span className="text-sm font-medium text-stone-200">Recherche Google Address</span>
    <input
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder="Recherchez une adresse, un quartier ou un immeuble"
      className="w-full rounded-2xl border border-white/10 bg-stone-950/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
    />
  </label>
);

export const ModalManageProperty = ({
  open,
  mode,
  property,
  contractOptions = [],
  contractRequired = true,
  onClose,
  onSubmit,
  onUploadAsset,
  onUploadError,
  isSaving = false,
  isUploadingAsset = false
}) => {
  const defaultValues = useMemo(() => mapPropertyToFormValues(property, contractOptions), [contractOptions, property]);
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.GOOGLE_MAPS_API_KEY || "";
  const { isLoaded: isMapsLoaded, loadError } = useJsApiLoader({
    id: "property-google-maps-script",
    googleMapsApiKey,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm({ defaultValues });

  const autocompleteRef = useRef(null);
  const geocoderRef = useRef(null);
  const mapRef = useRef(null);
  const coverInputRef = useRef(null);
  const mediaInputRefs = useRef({});
  const [addressQuery, setAddressQuery] = useState(defaultValues.address || "");
  const [mapCenter, setMapCenter] = useState(buildMapCenter(defaultValues.location));
  const [locationMessage, setLocationMessage] = useState(
    defaultValues.address ? "Adresse Google pre-remplie et carte synchronisee." : "Selectionnez un emplacement sur la carte ou via Google."
  );
  const [activeUploadTarget, setActiveUploadTarget] = useState(null);

  const has3DView = watch("has3DView");
  const latitude = watch("location.lat");
  const longitude = watch("location.lng");
  const coverImage = watch("coverImage");
  const markerPosition =
    isFiniteCoordinate(latitude) && isFiniteCoordinate(longitude)
      ? { lat: Number(latitude), lng: Number(longitude) }
      : null;

  const { fields, append, remove } = useFieldArray({ control, name: "media" });
  const title = mode === "edit" ? "Modifier le Bien" : "Ajout de Bien";

  useEffect(() => {
    if (isMapsLoaded && window.google?.maps) {
      geocoderRef.current = new window.google.maps.Geocoder();
    }
  }, [isMapsLoaded]);

  useEffect(() => {
    if (open) {
      reset(defaultValues);
      setAddressQuery(defaultValues.address || "");
      setMapCenter(buildMapCenter(defaultValues.location));
      setLocationMessage(
        defaultValues.address ? "Adresse Google pre-remplie et carte synchronisee." : "Selectionnez un emplacement sur la carte ou via Google."
      );
      setActiveUploadTarget(null);
    }
  }, [defaultValues, open, reset]);

  const syncResolvedLocation = ({ lat, lng, address, placeId, sourceMessage }) => {
    setValue("address", address, { shouldDirty: true, shouldValidate: true });
    setValue("googlePlaceId", placeId || "", { shouldDirty: true });
    setValue("location.lat", lat, { shouldDirty: true, shouldValidate: true });
    setValue("location.lng", lng, { shouldDirty: true, shouldValidate: true });
    setAddressQuery(address);
    setMapCenter({ lat, lng });
    setLocationMessage(sourceMessage);

    if (mapRef.current) {
      mapRef.current.panTo({ lat, lng });
    }
  };

  const handleAutocompleteChanged = () => {
    const place = autocompleteRef.current?.getPlace?.();
    const location = place?.geometry?.location;

    if (!place || !location) {
      setLocationMessage("Impossible de recuperer les details de cette adresse Google.");
      return;
    }

    syncResolvedLocation({
      lat: location.lat(),
      lng: location.lng(),
      address: place.formatted_address || place.name || addressQuery,
      placeId: place.place_id || "",
      sourceMessage: "Adresse Google selectionnee, carte recadree et marqueur mis a jour."
    });
  };

  const handleMapClick = (event) => {
    const lat = event.latLng?.lat();
    const lng = event.latLng?.lng();

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }

    if (!geocoderRef.current) {
      syncResolvedLocation({
        lat,
        lng,
        address: addressQuery || "Adresse en cours de resolution",
        placeId: "",
        sourceMessage: "Position definie sur la carte."
      });
      return;
    }

    geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
      const bestMatch = status === "OK" ? results?.[0] : null;

      syncResolvedLocation({
        lat,
        lng,
        address: bestMatch?.formatted_address || addressQuery || "Adresse determinee depuis la carte",
        placeId: bestMatch?.place_id || "",
        sourceMessage: bestMatch
          ? "Emplacement choisi sur la carte et adresse Google recuperee automatiquement."
          : "Emplacement choisi sur la carte, mais l'adresse Google n'a pas pu etre resolue."
      });
    });
  };

  const pushUploadError = (message, error = null) => {
    if (onUploadError) {
      onUploadError(error || { response: { data: { message } } });
    }
  };

  const handleCoverUpload = async (event) => {
    const file = event.target.files?.[0];
    const validationMessage = validateLocalFile({ file, assetKind: "cover", mediaType: "image" });

    if (validationMessage) {
      pushUploadError(validationMessage);
      event.target.value = "";
      return;
    }

    setActiveUploadTarget({ kind: "cover" });

    try {
      const uploadedAsset = await onUploadAsset?.({ assetKind: "cover", mediaType: "image", file });
      setValue("coverImage", uploadedAsset?.publicPath || "", { shouldDirty: true, shouldValidate: true });
    } catch (error) {
      pushUploadError(error?.response?.data?.message || "Le televersement de la couverture a echoue.", error);
    } finally {
      event.target.value = "";
      setActiveUploadTarget(null);
    }
  };

  const handleMediaUpload = async (index, mediaType, event) => {
    const file = event.target.files?.[0];
    const validationMessage = validateLocalFile({ file, assetKind: "media", mediaType });

    if (validationMessage) {
      pushUploadError(validationMessage);
      event.target.value = "";
      return;
    }

    setActiveUploadTarget({ kind: "media", index });

    try {
      const uploadedAsset = await onUploadAsset?.({ assetKind: "media", mediaType, file });
      setValue(`media.${index}.url`, uploadedAsset?.publicPath || "", { shouldDirty: true, shouldValidate: true });

      if (mediaType === "image") {
        setValue(`media.${index}.thumbnailUrl`, uploadedAsset?.publicPath || "", { shouldDirty: true, shouldValidate: false });
      }
    } catch (error) {
      pushUploadError(error?.response?.data?.message || "Le televersement du media a echoue.", error);
    } finally {
      event.target.value = "";
      setActiveUploadTarget(null);
    }
  };

  const closeModal = () => {
    reset(defaultValues);
    setAddressQuery(defaultValues.address || "");
    setMapCenter(buildMapCenter(defaultValues.location));
    setActiveUploadTarget(null);
    onClose();
  };

  return (
    <ModalLayout
      open={open}
      title={title}
      onClose={closeModal}
      onSave={handleSubmit(async (values) => {
        await onSubmit(normalizePayload(values));
        reset(mapPropertyToFormValues(null, contractOptions));
        setAddressQuery("");
        setMapCenter(DEFAULT_MAP_CENTER);
        setLocationMessage("Selectionnez un emplacement sur la carte ou via Google.");
        setActiveUploadTarget(null);
      })}
      saveLabel="Enregistrer"
      cancelLabel="Annuler"
      isSaving={isSaving}
      panelClassName="max-w-5xl"
    >
      <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.16),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]">
          <div className="border-b border-white/10 px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-100/80">Localisation intelligente</p>
                <h3 className="text-2xl font-semibold text-white">Adresse Google, carte interactive et coordonnees automatiques</h3>
                <p className="max-w-2xl text-sm leading-6 text-stone-300">
                  Recherchez une adresse Google ou cliquez directement sur la carte pour remplir automatiquement l'adresse complete, la latitude et la longitude.
                </p>
              </div>
              <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs text-stone-200 backdrop-blur">
                {markerPosition ? "Point de localisation synchronise" : "Aucun point selectionne"}
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-stone-950/70">
              {!googleMapsApiKey ? (
                <div className="flex h-[320px] items-center justify-center px-6 text-center text-sm text-amber-100/80">
                  Ajoutez `VITE_GOOGLE_MAPS_API_KEY` ou `GOOGLE_MAPS_API_KEY` pour activer la carte et l'autocomplete Google.
                </div>
              ) : loadError ? (
                <div className="flex h-[320px] items-center justify-center px-6 text-center text-sm text-red-200">
                  Impossible de charger Google Maps pour le moment.
                </div>
              ) : !isMapsLoaded ? (
                <div className="flex h-[320px] items-center justify-center px-6 text-center text-sm text-stone-300">
                  Chargement de la carte Google...
                </div>
              ) : (
                <GoogleMap
                  mapContainerClassName={MAP_CONTAINER_CLASS}
                  center={markerPosition || mapCenter}
                  zoom={markerPosition ? 16 : DEFAULT_MAP_ZOOM}
                  onLoad={(map) => {
                    mapRef.current = map;
                  }}
                  onUnmount={() => {
                    mapRef.current = null;
                  }}
                  onClick={handleMapClick}
                  options={{
                    disableDefaultUI: true,
                    zoomControl: true,
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: false,
                    clickableIcons: false
                  }}
                >
                  {markerPosition ? <MarkerF position={markerPosition} /> : null}
                </GoogleMap>
              )}
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4 rounded-[1.75rem] border border-white/10 bg-black/20 p-4 backdrop-blur">
                {isMapsLoaded && googleMapsApiKey ? (
                  <Autocomplete
                    onLoad={(instance) => {
                      autocompleteRef.current = instance;
                    }}
                    onPlaceChanged={handleAutocompleteChanged}
                    options={{
                      fields: ["formatted_address", "geometry", "name", "place_id"]
                    }}
                  >
                    <LocationSearchInput value={addressQuery} onChange={(event) => setAddressQuery(event.target.value)} disabled={false} />
                  </Autocomplete>
                ) : (
                  <LocationSearchInput value={addressQuery} onChange={(event) => setAddressQuery(event.target.value)} disabled />
                )}

                <Controller
                  name="address"
                  control={control}
                  rules={{ required: "L'adresse complete Google est requise" }}
                  render={({ field }) => (
                    <Input
                      label="Adresse complete Google"
                      error={errors.address?.message}
                      placeholder="L'adresse complete apparaitra ici"
                      readOnly
                      className="cursor-default bg-stone-950/90 text-stone-200"
                      {...field}
                    />
                  )}
                />
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-4 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/80">Etat de la localisation</p>
                <p className="mt-3 text-sm leading-6 text-stone-300">{locationMessage}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-stone-950/70 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Latitude</p>
                    <p className="mt-2 text-sm font-medium text-white">{markerPosition ? markerPosition.lat.toFixed(6) : "--"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-stone-950/70 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Longitude</p>
                    <p className="mt-2 text-sm font-medium text-white">{markerPosition ? markerPosition.lng.toFixed(6) : "--"}</p>
                  </div>
                </div>
                {errors.location?.lat?.message || errors.location?.lng?.message ? (
                  <p className="mt-4 text-xs text-red-300">
                    {errors.location?.lat?.message || errors.location?.lng?.message}
                  </p>
                ) : null}
                <p className="mt-4 text-xs text-stone-400">
                  Le `Google Place ID` et les coordonnees sont stockes automatiquement sans champ manuel visible.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[1.75rem] border border-white/10 bg-black/10 p-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/80">Couverture</p>
              <h3 className="text-lg font-semibold text-white">Image hero du bien</h3>
              <p className="text-sm text-stone-300">Televersez une image locale pour la couverture. Les URLs manuelles ne sont plus necessaires ici.</p>
            </div>

            <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-white/10 bg-stone-950/70">
              {coverImage ? (
                <img src={coverImage} alt="Couverture du bien" className="h-52 w-full object-cover" />
              ) : (
                <div className="flex h-52 items-end bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.22),transparent_30%),linear-gradient(135deg,rgba(41,37,36,1),rgba(28,25,23,0.92),rgba(12,10,9,1))] p-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-100/70">Cover</p>
                    <p className="mt-2 text-lg font-semibold text-white">Ajoutez une couverture nette et lumineuse</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={isUploadingAsset}
                onClick={() => coverInputRef.current?.click()}
              >
                {activeUploadTarget?.kind === "cover" ? "Televersement..." : coverImage ? "Remplacer la couverture" : "Televerser la couverture"}
              </Button>
              {coverImage ? <span className="self-center text-xs text-stone-400">Fichier stocke dans `uploads/properties`.</span> : null}
            </div>

            <input
              ref={coverInputRef}
              type="file"
              accept={COVER_ACCEPT}
              className="hidden"
              onChange={handleCoverUpload}
              disabled={isUploadingAsset}
            />

            <Controller name="coverImage" control={control} render={({ field }) => <input type="hidden" {...field} />} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Controller
              name="managementContract"
              control={control}
              rules={contractRequired ? { required: "Un contrat valide est requis" } : {}}
              render={({ field }) => (
                <BaseListBox
                  label={contractRequired ? "Contrat valide" : "Contrat de gestion"}
                  options={contractOptions}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.managementContract?.message}
                  placeholder={contractRequired ? "Selectionner le contrat valide" : "Affecter un contrat si necessaire"}
                />
              )}
            />
            <Controller
              name="title"
              control={control}
              rules={{ required: "Le titre est requis" }}
              render={({ field }) => <Input label="Titre" error={errors.title?.message} {...field} />}
            />
            <Controller
              name="price"
              control={control}
              rules={{ required: "Le prix est requis" }}
              render={({ field }) => <Input label="Prix" type="number" error={errors.price?.message} {...field} />}
            />
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
            <Controller name="area" control={control} render={({ field }) => <Input label="Surface (m2)" type="number" {...field} />} />
            <Controller name="rooms" control={control} render={({ field }) => <Input label="Pieces" type="number" {...field} />} />
            <Controller name="bedrooms" control={control} render={({ field }) => <Input label="Chambres" type="number" {...field} />} />
            <Controller name="bathrooms" control={control} render={({ field }) => <Input label="Salles de bain" type="number" {...field} />} />
            <Controller name="currency" control={control} render={({ field }) => <Input label="Devise" {...field} />} />
            <Controller name="googlePlaceId" control={control} render={({ field }) => <input type="hidden" {...field} />} />
            <Controller
              name="location.lat"
              control={control}
              rules={{ required: "Veuillez selectionner un emplacement sur la carte ou via Google." }}
              render={({ field }) => <input type="hidden" {...field} />}
            />
            <Controller
              name="location.lng"
              control={control}
              rules={{ required: "Veuillez selectionner un emplacement sur la carte ou via Google." }}
              render={({ field }) => <input type="hidden" {...field} />}
            />
          </div>
        </section>

        <Controller
          name="description"
          control={control}
          rules={{ required: "La description est requise" }}
          render={({ field }) => (
            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-200">Description</span>
              <textarea
                className="min-h-32 w-full rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-brand-500"
                {...field}
              />
              {errors.description ? <span className="text-xs text-red-300">{errors.description.message}</span> : null}
            </label>
          )}
        />

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

        <div className="space-y-4 rounded-3xl border border-white/10 bg-black/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Medias et fichiers</p>
              <p className="text-xs text-stone-400">Images et videos sont maintenant televersees localement. Les autres types peuvent garder une URL.</p>
            </div>
            <Button type="button" variant="secondary" className="px-4 py-2" onClick={() => append({ type: mediaTypeOptions[0], url: "", thumbnailUrl: "" })}>
              Ajouter un fichier
            </Button>
          </div>
          <div className="space-y-4">
            {fields.map((fieldItem, index) => {
              const mediaType = watch(`media.${index}.type`)?.value || mediaTypeOptions[0].value;
              const mediaUrl = watch(`media.${index}.url`) || "";
              const canUploadLocally = isUploadableMediaType(mediaType);
              const isRowUploading = Boolean(activeUploadTarget?.kind === "media" && activeUploadTarget?.index === index);

              return (
                <div key={fieldItem.id} className="grid gap-4 rounded-2xl border border-white/10 bg-stone-950/40 p-4 md:grid-cols-[180px_1fr_1fr_auto]">
                  <Controller
                    name={`media.${index}.type`}
                    control={control}
                    render={({ field }) => (
                      <BaseListBox
                        label="Type"
                        options={mediaTypeOptions}
                        value={field.value}
                        onChange={(nextValue) => {
                          field.onChange(nextValue);
                          setValue(`media.${index}.url`, "", { shouldDirty: true, shouldValidate: false });
                          if (nextValue?.value !== "image") {
                            setValue(`media.${index}.thumbnailUrl`, "", { shouldDirty: true, shouldValidate: false });
                          }
                        }}
                      />
                    )}
                  />

                  {canUploadLocally ? (
                    <div className="space-y-2 md:col-span-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          type="button"
                          variant="secondary"
                          className="px-4 py-2"
                          disabled={isUploadingAsset}
                          onClick={() => mediaInputRefs.current[index]?.click()}
                        >
                          {isRowUploading ? "Televersement..." : mediaType === "video" ? "Televerser une video" : "Televerser une image"}
                        </Button>
                        <span className="text-xs text-stone-400">Validation locale + stockage dans `uploads/properties`.</span>
                      </div>
                      <Input
                        label="Fichier televerse"
                        value={mediaUrl}
                        readOnly
                        placeholder={mediaType === "video" ? "Aucune video televersee" : "Aucune image televersee"}
                        className="cursor-default bg-stone-950/90 text-stone-200"
                      />
                      <input
                        ref={(element) => {
                          mediaInputRefs.current[index] = element;
                        }}
                        type="file"
                        accept={resolveMediaAccept(mediaType)}
                        className="hidden"
                        onChange={(event) => handleMediaUpload(index, mediaType, event)}
                        disabled={isUploadingAsset}
                      />
                    </div>
                  ) : (
                    <Controller
                      name={`media.${index}.url`}
                      control={control}
                      render={({ field }) => <Input label="URL" placeholder="https://..." {...field} />}
                    />
                  )}

                  <Controller
                    name={`media.${index}.thumbnailUrl`}
                    control={control}
                    render={({ field }) => (
                      <Input
                        label="Thumbnail"
                        placeholder={mediaType === "video" ? "https://..." : "Genere automatiquement pour une image televersee"}
                        readOnly={mediaType === "image"}
                        className={mediaType === "image" ? "cursor-default bg-stone-950/90 text-stone-200" : undefined}
                        {...field}
                      />
                    )}
                  />
                  <div className="flex items-end">
                    <Button type="button" variant="ghost" className="px-4 py-2" onClick={() => remove(index)}>
                      Supprimer
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-white/10 bg-black/10 p-4">
          <Controller
            name="has3DView"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-3 text-sm text-stone-200">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border border-white/10 bg-stone-900/70"
                  checked={Boolean(field.value)}
                  onChange={(event) => field.onChange(event.target.checked)}
                />
                Activer la version 3D du bien
              </label>
            )}
          />
          {has3DView ? (
            <Controller
              name="threeDUrl"
              control={control}
              render={({ field }) => <Input label="URL visite 3D" placeholder="https://my.matterport.com/..." {...field} />}
            />
          ) : null}
        </div>
      </form>
    </ModalLayout>
  );
};
