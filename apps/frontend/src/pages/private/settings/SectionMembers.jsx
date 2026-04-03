import { useMemo, useState } from "react";
import { Avatar } from "../../../components/profile/Avatar.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Card } from "../../../components/ui/Card.jsx";
import { Input } from "../../../components/ui/Input.jsx";

const SORT_DIRECTIONS = {
  asc: "asc",
  desc: "desc"
};

const STATUS_FILTERS = [
  { value: "all", label: "Tous les statuts" },
  { value: "active", label: "Actifs" },
  { value: "inactive", label: "Inactifs" },
  { value: "invited", label: "Invites" }
];

const normalizeValue = (value) => String(value || "").trim().toLowerCase();

const getMemberName = (member) => {
  const fullName = [member.firstName, member.lastName].filter(Boolean).join(" ").trim();
  return fullName || member.name || member.fullName || member.jobTitle || member.email || "Sans nom";
};

const getMemberRole = (member) => member.roleLabel || member.role || member.jobTitle || "Non defini";

const getMemberStatus = (member) => normalizeValue(member.status) || "unknown";

const getStatusLabel = (status) => {
  if (status === "active") return "Actif";
  if (status === "inactive") return "Inactif";
  if (status === "invited") return "Invite";
  return status || "Inconnu";
};

const getStatusBadgeClassName = (status) => {
  if (status === "active") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (status === "inactive") return "border-red-500/30 bg-red-500/10 text-red-200";
  if (status === "invited") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  return "border-white/10 bg-white/5 text-stone-300";
};

const compareValues = (left, right, direction) => {
  const leftValue = normalizeValue(left);
  const rightValue = normalizeValue(right);

  if (leftValue === rightValue) {
    return 0;
  }

  const result = leftValue > rightValue ? 1 : -1;
  return direction === SORT_DIRECTIONS.asc ? result : result * -1;
};

const SortHeaderButton = ({ label, column, sortConfig, onSort }) => {
  const isActive = sortConfig.key === column;
  const indicator = !isActive ? "+/-" : sortConfig.direction === SORT_DIRECTIONS.asc ? "ASC" : "DESC";

  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 text-left text-xs font-semibold uppercase tracking-[0.2em] text-stone-400 transition hover:text-white"
      onClick={() => onSort(column)}
    >
      <span>{label}</span>
      <span className={isActive ? "text-brand-100" : "text-stone-500"}>{indicator}</span>
    </button>
  );
};

export const SectionMembers = ({
  members,
  onAddMember,
  onEditMember,
  onDeleteMember,
  isDeletingMember = false
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({
    key: "name",
    direction: SORT_DIRECTIONS.asc
  });

  const preparedMembers = useMemo(
    () =>
      members.map((member) => ({
        ...member,
        displayName: getMemberName(member),
        displayRole: getMemberRole(member),
        displayStatus: getMemberStatus(member)
      })),
    [members]
  );

  const filteredMembers = useMemo(() => {
    const query = normalizeValue(searchTerm);

    return preparedMembers
      .filter((member) => {
        if (statusFilter !== "all" && member.displayStatus !== statusFilter) {
          return false;
        }

        if (!query) {
          return true;
        }

        const haystack = [member.displayName, member.displayRole, member.displayStatus, member.email].map(normalizeValue).join(" ");
        return haystack.includes(query);
      })
      .sort((left, right) => {
        if (sortConfig.key === "role") {
          return compareValues(left.displayRole, right.displayRole, sortConfig.direction);
        }

        if (sortConfig.key === "status") {
          return compareValues(left.displayStatus, right.displayStatus, sortConfig.direction);
        }

        return compareValues(left.displayName, right.displayName, sortConfig.direction);
      });
  }, [preparedMembers, searchTerm, sortConfig.direction, sortConfig.key, statusFilter]);

  const handleSort = (column) => {
    setSortConfig((current) => {
      if (current.key === column) {
        return {
          key: column,
          direction: current.direction === SORT_DIRECTIONS.asc ? SORT_DIRECTIONS.desc : SORT_DIRECTIONS.asc
        };
      }

      return {
        key: column,
        direction: SORT_DIRECTIONS.asc
      };
    });
  };

  const hasActionHandlers = typeof onEditMember === "function" || typeof onDeleteMember === "function";
 console.log(filteredMembers)
  return (
    <Card>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-white">Gestion d&apos;agents et affectation</p>
          <p className="mt-1 text-sm text-stone-400">Consultez les membres de l&apos;agence dans un tableau clair avec tri et filtres.</p>
        </div>

        <div className="flex flex-col gap-3 lg:min-w-[520px]">
          <div className="flex justify-end">
            <Button type="button" onClick={onAddMember} disabled={typeof onAddMember !== "function"}>
              Ajout agent
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(240px,1fr)_220px]">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-200">Rechercher</span>
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Filtrer par nom, role ou statut"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-200">Statut</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-500"
              >
                {STATUS_FILTERS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-stone-900 text-white">
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      {!members.length ? <p className="mt-6 text-sm text-stone-400">Aucun agent charge depuis le backend.</p> : null}

      {members.length ? (
        <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-stone-950/40">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-white/[0.03]">
                <tr>
                  <th scope="col" className="px-5 py-4">
                    <SortHeaderButton label="Nom" column="name" sortConfig={sortConfig} onSort={handleSort} />
                  </th>
                  <th scope="col" className="px-5 py-4">
                    <SortHeaderButton label="Role" column="role" sortConfig={sortConfig} onSort={handleSort} />
                  </th>
                  <th scope="col" className="px-5 py-4">
                    <SortHeaderButton label="Status" column="status" sortConfig={sortConfig} onSort={handleSort} />
                  </th>
                  <th scope="col" className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/10">
                {filteredMembers.map((member) => {
                  const isOwnerMember = member.role === "owner";

                  return (
                    <tr key={member._id} className="transition hover:bg-white/[0.03]">
                      <td className="px-5 py-4 align-top">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={member.avatar}
                            alt={`Photo de ${member.displayName}`}
                            name={member.displayName}
                            size="sm"
                            variant="message"
                            type="agent"
                          />
                          <div>
                            <p className="font-semibold text-white">{member.displayName}</p>
                            {member.email ? <p className="mt-1 text-sm text-stone-400">{member.email}</p> : null}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 align-top text-sm text-stone-200">{member.displayRole}</td>

                      <td className="px-5 py-4 align-top">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadgeClassName(member.displayStatus)}`}>
                          {getStatusLabel(member.displayStatus)}
                        </span>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={typeof onEditMember !== "function" || isOwnerMember}
                            onClick={() => onEditMember?.(member)}
                          >
                            Modifier
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            className="border-red-500/40 text-red-200 hover:border-red-400 hover:bg-red-500/10"
                            disabled={typeof onDeleteMember !== "function" || isDeletingMember || isOwnerMember}
                            onClick={() => onDeleteMember?.(member)}
                          >
                            Supprimer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {members.length && !filteredMembers.length ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-stone-400">
          Aucun membre ne correspond aux filtres appliques.
        </div>
      ) : null}

      {members.length && !hasActionHandlers ? (
        <p className="mt-4 text-xs text-stone-500">Les actions Modifier et Supprimer sont affichees, mais aucun handler n&apos;est encore connecte dans la page parent.</p>
      ) : null}
    </Card>
  );
};
