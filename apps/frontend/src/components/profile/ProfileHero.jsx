import { useRef } from "react";
import { Button } from "../ui/Button.jsx";
import { Card } from "../ui/Card.jsx";
import { Avatar } from "./Avatar.jsx";

export const ProfileHero = ({
  userName,
  userEmail,
  roleLabel,
  permissionCount = 0,
  avatar,
  isUploading = false,
  onUpload,
  type = "user"
}) => {
  const uploadInputRef = useRef(null);
  const captureInputRef = useRef(null);
  const hasCustomAvatar = Boolean(avatar);

  const handleFileSelection = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      await onUpload?.(file);
    } finally {
      event.target.value = "";
    }
  };

  return (
    <Card className="relative overflow-hidden border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.16),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]">
      <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(135deg,rgba(245,158,11,0.18),rgba(249,115,22,0.06),transparent)]" />
      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar
            src={avatar}
            alt={`Photo de profil de ${userName}`}
            name={userName}
            size="xl"
            variant="profile"
            type={type}
            // badge={
            //   <div className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
            //     {hasCustomAvatar ? "Photo active" : "Photo par defaut"}
            //   </div>
            // }
          />

          <div className="space-y-3 text-center sm:text-left">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-100/80">Profil utilisateur</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{userName}</h2>
              <p className="mt-1 text-sm text-stone-300">{userEmail}</p>
            </div>

            <div className="flex flex-wrap justify-center gap-3 sm:justify-start">
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-stone-200">
                Role: {roleLabel || "Utilisateur"}
              </span>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-stone-200">
                Permissions: {permissionCount}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-[2rem] border border-white/10 bg-black/20 p-4 backdrop-blur">
          <p className="text-sm font-medium text-white">Photo de profil</p>
          <p className="max-w-sm text-sm leading-6 text-stone-300">
            Ajoutez une image nette pour personnaliser votre compte. Les fichiers image uniquement sont acceptes.
          </p>
          <div className="flex flex-wrap gap-3">
            <input
              ref={captureInputRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={handleFileSelection}
              disabled={isUploading}
            />
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelection}
              disabled={isUploading}
            />
            <Button type="button" variant="secondary" disabled={isUploading} onClick={() => captureInputRef.current?.click()}>
              Prendre une photo
            </Button>
            <Button type="button" disabled={isUploading} onClick={() => uploadInputRef.current?.click()}>
              {hasCustomAvatar ? "Remplacer la photo" : "Televerser une photo"}
            </Button>
          </div>
          <p className="text-xs text-stone-400">{isUploading ? "Televersement en cours..." : "Formats recommandes: JPG, PNG, WEBP."}</p>
        </div>
      </div>
    </Card>
  );
};
