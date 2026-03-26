import { SectionTitle } from "../components/shared/SectionTitle.jsx";
import { RoleDashboardGrid } from "../features/dashboard/RoleDashboardGrid.jsx";

export const DashboardPage = () => (
  <section className="mx-auto max-w-7xl px-6 py-20">
    <SectionTitle
      eyebrow="Pilotage"
      title="Dashboards multi-profils"
      description="Le socle frontend est structure pour des experiences distinctes selon le role, sans casser la cohesion produit."
    />
    <div className="mt-10">
      <RoleDashboardGrid />
    </div>
  </section>
);
