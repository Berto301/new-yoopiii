import { Button } from "./Button.jsx";

export const FileUploadField = ({
  label,
  description,
  files = [],
  isUploading = false,
  multiple = false,
  onSelectFiles,
  onRemove
}) => (
  <div className="space-y-3 rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-stone-100">{label}</p>
        {description ? <p className="mt-1 text-xs leading-5 text-stone-400">{description}</p> : null}
      </div>
      <label>
        <input
          type="file"
          className="hidden"
          multiple={multiple}
          onChange={(event) => {
            const selectedFiles = Array.from(event.target.files || []);
            if (selectedFiles.length) {
              onSelectFiles?.(selectedFiles);
            }
            event.target.value = "";
          }}
        />
        <span>
          <Button type="button" className="px-4 py-2" disabled={isUploading}>
            {isUploading ? "Televersement..." : multiple ? "Ajouter des fichiers" : "Ajouter un fichier"}
          </Button>
        </span>
      </label>
    </div>

    {files.length ? (
      <div className="space-y-2">
        {files.map((file, index) => (
          <div key={`${file}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-stone-950/50 px-3 py-2">
            <span className="truncate text-sm text-stone-200">{file.split("/").pop()}</span>
            <button
              type="button"
              className="text-xs uppercase tracking-[0.2em] text-red-300 transition hover:text-red-200"
              onClick={() => onRemove?.(index)}
            >
              Retirer
            </button>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-xs text-stone-500">Aucun fichier ajoute.</p>
    )}
  </div>
);

export default FileUploadField;
