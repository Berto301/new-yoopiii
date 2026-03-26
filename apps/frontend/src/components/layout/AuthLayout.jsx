import { Outlet } from "react-router-dom";

export const AuthLayout = () => (
  <div className="min-h-screen bg-[linear-gradient(180deg,#0b0f0d_0%,#111827_100%)] px-6 py-10 text-white">
    <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <section className="space-y-6">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-100">Yopii Access</p>
        <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
          Connectez les projets immobiliers aux bonnes personnes, au bon endroit.
        </h1>
        <p className="max-w-xl text-base leading-8 text-stone-300">
          Authentification multi-profils, recherche geolocalisee, messagerie temps reel et pilotage agence dans une interface unifiee.
        </p>
      </section>
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 md:p-8">
        <Outlet />
      </section>
    </div>
  </div>
);
