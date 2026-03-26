import { Link } from "react-router-dom";

export const HeroSection = () => (
  <section className="relative overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(214,158,46,0.22),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(47,133,90,0.28),_transparent_30%)]" />
    <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-32">
      <div className="max-w-3xl space-y-8">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-100">Immobilier geolocalise</p>
        <h1 className="text-5xl font-semibold leading-tight text-white md:text-7xl">
          Trouvez le bon bien autour de vous, pas juste dans une liste.
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-stone-300">
          Yopii connecte recherche cartographique, annonces de proximite, agents verifies et reservation de visites en temps reel.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            to="/properties"
            className="rounded-full bg-brand-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            Explorer les biens
          </Link>
          <Link
            to="/dashboard"
            className="rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-white transition hover:border-white/40"
          >
            Ouvrir le dashboard
          </Link>
        </div>
      </div>
    </div>
  </section>
);
