import { Card } from "../../../components/ui/Card.jsx";
import { Badge } from "../../../components/ui/Badge.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { usePropertyWorkspace } from "../../properties/hooks/usePropertyWorkspace.js";

export const AgentDashboardOverview = () => {
  const { managedPropertiesQuery, workflowMutation } = usePropertyWorkspace();
  const managed = managedPropertiesQuery.data;
  const items = [
    { label: "Biens geres", value: managed?.summary?.total ?? 0 },
    { label: "Publies", value: managed?.summary?.published ?? 0 },
    { label: "En attente", value: managed?.summary?.pendingApproval ?? 0 }
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <Card key={item.label}>
            <p className="text-sm text-stone-400">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <p className="text-sm text-stone-400">Vos proprietes</p>
          <Badge>{managed?.items?.length || 0}</Badge>
        </div>
        <div className="mt-4 space-y-3">
          {managed?.items?.map((property) => (
            <div key={property.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-semibold text-white">{property.title}</p>
                <p className="mt-1 text-sm text-stone-400">{property.address}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-brand-100">
                  {property.publicationStatus} / {property.status}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  className="px-4 py-2"
                  variant="secondary"
                  disabled={workflowMutation.isPending || property.publicationStatus === "approved"}
                  onClick={() =>
                    workflowMutation.mutate({
                      propertyId: property.id,
                      payload: { publicationStatus: "approved", status: "published" }
                    })
                  }
                >
                  Publier
                </Button>
                <Button
                  className="px-4 py-2"
                  variant="ghost"
                  disabled={workflowMutation.isPending || property.status === "archived"}
                  onClick={() =>
                    workflowMutation.mutate({
                      propertyId: property.id,
                      payload: { status: "archived" }
                    })
                  }
                >
                  Archiver
                </Button>
              </div>
            </div>
          ))}
          {!managed?.items?.length ? <p className="text-sm text-stone-400">Aucune propriete a piloter pour le moment.</p> : null}
        </div>
      </Card>
    </div>
  );
};
