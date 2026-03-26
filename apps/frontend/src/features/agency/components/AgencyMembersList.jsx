import { Card } from "../../../components/ui/Card.jsx";
import { useAgencyDashboard } from "../hooks/useAgencyDashboard.js";

export const AgencyMembersList = () => {
  const { membersQuery } = useAgencyDashboard();

  if (membersQuery.isLoading) {
    return <Card><p className="text-sm text-stone-300">Chargement des membres...</p></Card>;
  }

  if (membersQuery.isError) {
    return <Card><p className="text-sm text-red-300">Impossible de charger les membres.</p></Card>;
  }

  return (
    <div className="space-y-4">
      {membersQuery.data?.map((member) => (
        <Card key={member._id || member.id} className="flex items-center justify-between gap-4">
          <div>
            <p className="text-base font-semibold text-white">{member.jobTitle || "Membre agence"}</p>
            <p className="mt-1 text-sm text-stone-400">Role: {member.role}</p>
          </div>
          <p className="text-sm capitalize text-brand-100">{member.status}</p>
        </Card>
      ))}
    </div>
  );
};
