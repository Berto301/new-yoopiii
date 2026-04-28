import { useRef, useState } from "react";
import { Controller } from "react-hook-form";
import { Avatar } from "../../../components/profile/Avatar.jsx";
import { DEFAULT_AVATAR_URL, resolveAvatarUrl } from "../../../components/profile/avatar.utils.js";
import { Button } from "../../../components/ui/Button.jsx";
import { Card } from "../../../components/ui/Card.jsx";
import { Input } from "../../../components/ui/Input.jsx";

const coverPlaceholder = "rgba(33, 28, 29, 0.96)";

const MediaPanel = ({
  title,
  description,
  actionLabel,
  helperText,
  preview,
  onSelectFile,
  disabled,
  children
}) => (
  <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5 backdrop-blur">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-100/80">{title}</p>
        <h3 className="text-xl font-semibold text-white">{preview}</h3>
        <p className="max-w-xl text-sm leading-6 text-stone-300">{description}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" disabled={disabled} onClick={onSelectFile}>
          {actionLabel}
        </Button>
      </div>
    </div>

    <div className="mt-5">{children}</div>
    <p className="mt-4 text-xs text-stone-400">{helperText}</p>
  </div>
);

export const SectionAgency = ({
  agencyForm,
  updateAgencyMutation,
  uploadAgencyAssetMutation,
  onDeleteClick,
  isDeleteDisabled = false,
  onAgencySubmit,
  onAgencyAssetUpload
}) => {
  const logoInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const [uploadingAssetKind, setUploadingAssetKind] = useState(null);

  const agencyName = agencyForm.watch("name") || "Votre agence";
  const logo = agencyForm.watch("logo");
  const coverImage = agencyForm.watch("coverImage");
  const coverPreview = resolveAvatarUrl(coverImage, "");
  const isUploading = uploadAgencyAssetMutation?.isPending;

  const handleAssetSelection = async (assetKind, event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploadingAssetKind(assetKind);

    try {
      await onAgencyAssetUpload?.(assetKind, file);
    } finally {
      event.target.value = "";
      setUploadingAssetKind(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.16),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-0">
        <div className="relative min-h-[260px] overflow-hidden border-b border-white/10">
          {coverPreview ? (
            <img src={coverPreview} alt={`Couverture de ${agencyName}`} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: coverPlaceholder }} />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,10,9,0.1),rgba(12,10,9,0.72))]" />

          <div className="relative flex min-h-[260px] flex-col justify-between gap-6 p-6 lg:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="rounded-full border border-white/10 bg-black/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-amber-100/85 backdrop-blur">
                Identite visuelle
              </div>
              <Button
                type="button"
                variant="secondary"
                className="bg-black/20"
                disabled={isUploading}
                onClick={() => coverInputRef.current?.click()}
              >
                {coverImage ? "Remplacer la couverture" : "Televerser une couverture"}
              </Button>
            </div>

            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <Avatar
                  src={logo}
                  alt={`Logo de ${agencyName}`}
                  name={agencyName}
                  size="xl"
                  variant="profile"
                  fallback={DEFAULT_AVATAR_URL}
                  type="agent"
                  className="translate-y-0 md:translate-y-8"
                />

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-200/80">Agence</p>
                    <h2 className="mt-2 text-3xl font-semibold text-white">{agencyName}</h2>
                  </div>
                  <p className="max-w-2xl text-sm leading-6 text-stone-200/85">
                    Mettez en avant votre identite visuelle avec un logo propre et une couverture nette pour un rendu plus credible dans toute l'application.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="secondary"
                className="self-start bg-black/20 md:self-end"
                disabled={isUploading}
                onClick={() => logoInputRef.current?.click()}
              >
                {logo ? "Remplacer le logo" : "Televerser le logo"}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
          <MediaPanel
            title="Couverture"
            preview={coverImage ? "Image active" : "Aucune couverture personnalisee"}
            description="Utilisez une image large et lumineuse pour renforcer l'image de marque de l'agence sur les ecrans de presentation."
            actionLabel={uploadingAssetKind === "cover" ? "Televersement..." : coverImage ? "Remplacer la couverture" : "Choisir une couverture"}
            helperText="Images uniquement. Formats recommandes : JPG, PNG ou WEBP. Taille maximale : 8 MB."
            disabled={isUploading}
            onSelectFile={() => coverInputRef.current?.click()}
          >
            <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-stone-950/80">
              {coverPreview ? (
                <img src={coverPreview} alt={`Apercu couverture ${agencyName}`} className="h-52 w-full object-cover" />
              ) : (
                <div className="flex h-52 items-end bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.25),transparent_30%),linear-gradient(135deg,rgba(41,37,36,1),rgba(28,25,23,0.92),rgba(12,10,9,1))] p-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-100/70">Couverture</p>
                    <p className="mt-2 text-lg font-semibold text-white">Ajoutez une image de marque elegante</p>
                  </div>
                </div>
              )}
            </div>
          </MediaPanel>

          <MediaPanel
            title="Logo"
            preview={logo ? "Logo actif" : "Aucun logo personnalise"}
            description="Le logo est reutilise dans l'espace agence, les listes et les cartes. Choisissez un visuel lisible sur fond clair et fonce."
            actionLabel={uploadingAssetKind === "logo" ? "Televersement..." : logo ? "Remplacer le logo" : "Choisir un logo"}
            helperText="Images uniquement. Le logo peut etre remplace a tout moment sans casser les references existantes."
            disabled={isUploading}
            onSelectFile={() => logoInputRef.current?.click()}
          >
            <div className="flex min-h-52 items-center justify-center rounded-[1.75rem] border border-dashed border-white/15 bg-stone-950/70 p-6">
              <Avatar
                src={logo}
                alt={`Logo de ${agencyName}`}
                name={agencyName}
                size="xl"
                variant="profile"
                fallback={DEFAULT_AVATAR_URL}
                type="agent"
              />
            </div>
          </MediaPanel>
        </div>

        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handleAssetSelection("logo", event)}
          disabled={isUploading}
        />
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handleAssetSelection("cover", event)}
          disabled={isUploading}
        />
      </Card>

      <Card>
        <form className="grid gap-5 md:grid-cols-2" onSubmit={agencyForm.handleSubmit(onAgencySubmit)}>
          <div className="md:col-span-2 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/80">Informations agence</p>
            <h3 className="text-2xl font-semibold text-white">Coordonnees et presentation</h3>
            <p className="text-sm leading-6 text-stone-300">
              Gardez des informations claires et a jour pour une presentation plus professionnelle dans l'espace interne et les vues partagees.
            </p>
          </div>

          <Controller
            name="name"
            control={agencyForm.control}
            render={({ field }) => <Input label="Nom agence" placeholder="Nom de votre agence" {...field} />}
          />
          <Controller
            name="contactEmail"
            control={agencyForm.control}
            render={({ field }) => <Input label="Email contact" type="email" placeholder="contact@agence.com" {...field} />}
          />
          <Controller
            name="contactPhone"
            control={agencyForm.control}
            render={({ field }) => <Input label="Telephone contact" placeholder="034 00 000 00" {...field} />}
          />
          <Controller
            name="address"
            control={agencyForm.control}
            render={({ field }) => <Input label="Adresse" placeholder="Adresse principale" {...field} />}
          />
          <Controller
            name="description"
            control={agencyForm.control}
            render={({ field }) => (
              <label className="md:col-span-2 block space-y-2">
                <span className="text-sm font-medium text-stone-200">Description agence</span>
                <textarea
                  className="min-h-36 w-full rounded-[1.75rem] border border-white/10 bg-stone-900/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-brand-500"
                  placeholder="Presentez l'agence, son positionnement et ses points forts."
                  {...field}
                />
              </label>
            )}
          />

          <div className="md:col-span-2 flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              className="border-red-500/40 text-red-200 hover:border-red-400 hover:bg-red-500/10"
              disabled={isDeleteDisabled}
              onClick={onDeleteClick}
            >
              Suppression de l'agence
            </Button>

            <Button type="submit" disabled={updateAgencyMutation.isPending}>
              {updateAgencyMutation.isPending ? "Enregistrement..." : "Enregistrer l'agence"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
