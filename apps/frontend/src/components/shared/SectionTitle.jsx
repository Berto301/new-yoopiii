export const SectionTitle = ({ eyebrow, title, description }) => (
  <div className="min-w-0 space-y-3">
    <p className="text-sm uppercase tracking-[0.25em] text-accent">{eyebrow}</p>
    <h2 className="break-words text-3xl font-semibold text-white md:text-4xl">{title}</h2>
    <p className="max-w-2xl break-words text-sm leading-7 text-stone-300 md:text-base">{description}</p>
  </div>
);
