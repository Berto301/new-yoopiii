import { SectionTitle } from "../../components/shared/SectionTitle.jsx";
import { AgencyMembersList } from "../../features/agency/components/AgencyMembersList.jsx";

export const AgencyMembersPage = () => (
  <section className="space-y-8">
    <SectionTitle
      eyebrow="Equipe agence"
      title="Gestion des agents et collaborateurs"
      description="Vue connectee aux endpoints de membres agence pour piloter roles, statuts et organisation interne."
    />
    <AgencyMembersList />
  </section>
);
