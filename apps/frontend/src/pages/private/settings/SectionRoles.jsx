import { Card } from "../../../components/ui/Card.jsx";

export const SectionRoles = ({ roles }) => (
  <Card>
    <p className="text-sm font-medium text-white">Gestion de Role</p>
    <div className="mt-4 space-y-3">
      {roles.map((role) => (
        <div key={role._id} className="rounded-2xl border border-white/10 p-4">
          <p className="font-semibold text-white">{role.name}</p>
          <p className="mt-1 text-sm text-stone-400">{role.key}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-brand-100">{role.permissions?.length || 0} permissions</p>
        </div>
      ))}
      {!roles.length ? <p className="text-sm text-stone-400">Aucun role charge depuis le backend.</p> : null}
    </div>
  </Card>
);
