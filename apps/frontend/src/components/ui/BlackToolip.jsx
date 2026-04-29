import { useId } from "react";
import { cn } from "../../lib/utils/cn.js";

const placementClasses = {
  bottom: "left-1/2 top-full mt-3 -translate-x-1/2",
  left: "right-full top-1/2 mr-3 -translate-y-1/2",
  right: "left-full top-1/2 ml-3 -translate-y-1/2",
  top: "bottom-full left-1/2 mb-3 -translate-x-1/2"
};

const arrowClasses = {
  bottom: "-top-1 left-1/2 -translate-x-1/2 rotate-45",
  left: "-right-1 top-1/2 -translate-y-1/2 rotate-45",
  right: "-left-1 top-1/2 -translate-y-1/2 rotate-45",
  top: "-bottom-1 left-1/2 -translate-x-1/2 rotate-45"
};

const BlackTooltip = ({ arrow = false, children, className, placement = "top", title, ...props }) => {
  const tooltipId = useId();
  const resolvedPlacement = placementClasses[placement] ? placement : "top";

  if (!title) {
    return children;
  }

  return (
    <span className={cn("group relative inline-flex max-w-full", className)} {...props}>
      <span aria-describedby={tooltipId} className="inline-flex max-w-full">
        {children}
      </span>
      <span
        id={tooltipId}
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 w-max max-w-[min(500px,calc(100vw-2rem))] rounded-2xl bg-[#3f3f51] px-4 py-3 text-left text-xs leading-5 text-white opacity-0 shadow-[0_18px_50px_rgba(0,0,0,0.28)] ring-1 ring-white/10 transition duration-150 group-focus-within:opacity-100 group-hover:opacity-100",
          placementClasses[resolvedPlacement]
        )}
      >
        {title}
        {arrow ? <span className={cn("absolute h-3 w-3 bg-[#3f3f51]", arrowClasses[resolvedPlacement])} /> : null}
      </span>
    </span>
  );
};

export default BlackTooltip;
