import dayjs from "dayjs";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "../../components/profile/Avatar.jsx";
import { SectionTitle } from "../../components/shared/SectionTitle.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { createConversation } from "../../features/chat/services/chat.service.js";
import { useNotifications } from "../../features/notifications/hooks/useNotifications.js";

const getNotificationTone = (notification) => {
  if (!notification) {
    return {
      card: "border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]",
      badge: "border-white/10 bg-white/5 text-stone-200"
    };
  }

  if (!notification.isRead) {
    return {
      card: "border-amber-400/20 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.14),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))]",
      badge: "border-amber-400/30 bg-amber-400/10 text-amber-100"
    };
  }

  if (notification.type?.includes("property") || notification.type?.includes("booking")) {
    return {
      card: "border-sky-400/15 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.10),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]",
      badge: "border-sky-400/30 bg-sky-400/10 text-sky-100"
    };
  }

  return {
    card: "border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]",
    badge: "border-white/10 bg-white/5 text-stone-200"
  };
};

const SummaryCard = ({ label, value, description, toneClassName }) => (
  <Card className="relative overflow-hidden border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))]">
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">{label}</p>
      <p className={`text-3xl font-semibold md:text-4xl ${toneClassName}`}>{value}</p>
      <p className="text-sm leading-6 text-stone-300">{description}</p>
    </div>
  </Card>
);

export const NotificationsPage = () => {
  const navigate = useNavigate();
  const { notificationsQuery, markReadMutation } = useNotifications();
  const notifications = notificationsQuery.data || [];

  const summary = useMemo(() => ({
    total: notifications.length,
    unread: notifications.filter((notification) => !notification.isRead).length,
    contacts: notifications.filter((notification) => Boolean(notification.contactTarget?.id)).length,
    today: notifications.filter((notification) => dayjs(notification.createdAt).isSame(dayjs(), "day")).length
  }), [notifications]);

  const getContactLabel = (notification) => {
    const contact = notification.contactTarget;
    const fullName = [contact?.firstName, contact?.lastName].filter(Boolean).join(" ").trim();
    return fullName || contact?.email || "cette personne";
  };

  const handleContact = async (notification) => {
    const participantId = notification.contactTarget?.id;

    if (!participantId) {
      return;
    }

    const conversation = await createConversation({
      participantId,
      propertyId: notification.data?.propertyId || null
    });

    navigate(`/messages?conversationId=${conversation.id}`);
  };

  if (notificationsQuery.isLoading) {
    return (
      <section className="space-y-8">
        <SectionTitle
          eyebrow="Notifications"
          title="Centre de notifications"
          description="Messages systeme, confirmations de visite, nouvelles annonces et activite commerciale."
        />
        <Card className="border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]">
          <p className="text-sm text-stone-300">Chargement des notifications...</p>
        </Card>
      </section>
    );
  }

  if (notificationsQuery.isError) {
    return (
      <section className="space-y-8">
        <SectionTitle
          eyebrow="Notifications"
          title="Centre de notifications"
          description="Messages systeme, confirmations de visite, nouvelles annonces et activite commerciale."
        />
        <Card className="border-red-500/20 bg-red-500/5">
          <p className="text-sm text-red-200">Impossible de charger les notifications.</p>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <Card className="overflow-hidden border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-0">
        <div className="grid gap-8 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
          <div className="space-y-5">
            <SectionTitle
              eyebrow="Notifications"
              title="Centre de notifications"
              description="Suivez les interactions importantes, reperez les alertes non lues et basculez rapidement vers la bonne conversation ou le bon contexte commercial."
            />
            <div className="flex flex-wrap gap-3">
              <div className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-xs uppercase tracking-[0.24em] text-stone-300 backdrop-blur">
                {summary.total} notifications centralisees
              </div>
              <div className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-xs uppercase tracking-[0.24em] text-stone-300 backdrop-blur">
                {summary.unread} non lues a traiter
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryCard label="Total" value={summary.total} toneClassName="text-white" description="Volume global des activites remontees dans votre espace." />
            <SummaryCard label="Non lues" value={summary.unread} toneClassName="text-amber-200" description="Notifications qui meritent encore une action ou une revue." />
            <SummaryCard label="Aujourd'hui" value={summary.today} toneClassName="text-sky-100" description="Activite recue au cours de la journee en cours." />
            <SummaryCard label="Contacts directs" value={summary.contacts} toneClassName="text-emerald-200" description="Notifications permettant de lancer directement une conversation." />
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/80">Flux recents</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Alertes, activite et suivi commercial</h3>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-stone-400">
          Chaque carte met en avant le contexte, la date, le statut de lecture et les actions disponibles pour traiter la notification sans friction.
        </p>
      </div>

      <div className="space-y-5">
        {notifications.map((notification) => {
          const contactName = getContactLabel(notification);
          const tone = getNotificationTone(notification);

          return (
            <Card key={notification._id} className={`overflow-hidden p-0 ${tone.card}`}>
              <div className="grid gap-0 lg:grid-cols-[1fr_auto]">
                <div className="p-5 lg:p-6">
                  <div className="flex items-start gap-4">
                    <Avatar
                      src={notification.contactTarget?.avatar}
                      alt={`Photo de ${contactName}`}
                      name={contactName}
                      size="md"
                      variant="notification"
                      type="user"
                    />

                    <div className="min-w-0 flex-1 space-y-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={tone.badge}>{notification.isRead ? "Lue" : "Non lue"}</Badge>
                            <Badge className="border-white/10 bg-white/5 text-stone-200">{notification.type}</Badge>
                          </div>
                          <h3 className="text-xl font-semibold text-white">{notification.title}</h3>
                        </div>
                        <p className="whitespace-nowrap text-xs uppercase tracking-[0.2em] text-stone-500">
                          {dayjs(notification.createdAt).format("DD/MM/YYYY HH:mm")}
                        </p>
                      </div>

                      <p className="max-w-4xl text-sm leading-7 text-stone-300">{notification.body}</p>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[1.35rem] border border-white/10 bg-black/20 px-4 py-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Contact</p>
                          <p className="mt-2 text-sm font-medium text-white">{contactName}</p>
                        </div>
                        <div className="rounded-[1.35rem] border border-white/10 bg-black/20 px-4 py-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Canal</p>
                          <p className="mt-2 text-sm font-medium text-white">{notification.channel || "in_app"}</p>
                        </div>
                        <div className="rounded-[1.35rem] border border-white/10 bg-black/20 px-4 py-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Statut</p>
                          <p className="mt-2 text-sm font-medium text-white">{notification.isRead ? "Traitee visuellement" : "Action recommandee"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/10 bg-black/15 p-5 lg:border-l lg:border-t-0 lg:p-6">
                  <div className="flex h-full flex-col justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/80">Actions</p>
                      <p className="mt-2 text-sm leading-6 text-stone-400">Passez directement a la conversation ou marquez cette notification comme traitee.</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {notification.contactTarget ? (
                        <Button
                          variant="secondary"
                          className="w-full px-4 py-3"
                          onClick={() => handleContact(notification)}
                        >
                          {`Contacter ${contactName}`}
                        </Button>
                      ) : null}
                      <Button
                        variant="secondary"
                        className="w-full px-4 py-3"
                        disabled={markReadMutation.isPending || notification.isRead}
                        onClick={() => markReadMutation.mutate(notification._id)}
                      >
                        {notification.isRead ? "Deja lue" : "Marquer comme lue"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}

        {!notifications.length ? (
          <Card className="border-dashed border-white/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] text-center">
            <p className="text-sm font-medium text-white">Aucune notification pour le moment.</p>
            <p className="mt-2 text-sm leading-6 text-stone-400">Les activites importantes, suivis commerciaux et alertes systeme apparaitront ici des qu'elles seront disponibles.</p>
          </Card>
        ) : null}
      </div>
    </section>
  );
};
