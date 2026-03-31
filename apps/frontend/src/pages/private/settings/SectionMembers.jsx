import { Card } from "../../../components/ui/Card.jsx";

export const SectionMembers = ({ members }) => (
  <Card>
    <p className="text-sm font-medium text-white">Gestion d'agents et affectation</p>
    <div className="mt-4 space-y-3">
      {members.map((member) => (
        <div key={member._id} className="rounded-2xl border border-white/10 p-4">
          <p className="font-semibold text-white">{member.jobTitle || member.role}</p>
          <p className="mt-1 text-sm text-stone-400">Role: {member.role}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-brand-100">Statut: {member.status}</p>
        </div>
      ))}
      {!members.length ? <p className="text-sm text-stone-400">Aucun agent charge depuis le backend.</p> : null}
    </div>
  </Card>
);
