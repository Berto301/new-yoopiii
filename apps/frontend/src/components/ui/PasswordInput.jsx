import { useState } from "react";
import { SVGNoViewPassword, SVGViewPassWord } from "../../helpers/iconeSvg.js";
import { cn } from "../../lib/utils/cn.js";

export const PasswordInput = ({ label, error, className, ...props }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <label className="block space-y-2">
      {label ? <span className="text-sm font-medium text-stone-200">{label}</span> : null}
      <div className="relative">
        <input
          className={cn(
            "w-full rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3 pr-14 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-brand-500",
            error && "border-red-400/60",
            className
          )}
          type={isVisible ? "text" : "password"}
          {...props}
        />
        <button
          type="button"
          onClick={() => setIsVisible((current) => !current)}
          className="absolute inset-y-0 right-3 flex items-center text-stone-300 transition hover:text-white"
          aria-label={isVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          aria-pressed={isVisible}
        >
          {isVisible ? <SVGNoViewPassword className="h-6 w-6" /> : <SVGViewPassWord className="h-5 w-5" />}
        </button>
      </div>
      {error ? <span className="text-xs text-red-300">{error}</span> : null}
    </label>
  );
};
