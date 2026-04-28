import { jsPDF } from "jspdf";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar } from "../../components/profile/Avatar.jsx";
import { resolveAvatarUrl } from "../../components/profile/avatar.utils.js";
import { ModalDelete } from "../../components/layout/modals/ModalDelete.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Menu } from "../../components/ui/Menu.jsx";
import { Status } from "../../components/ui/Status.jsx";
import { useNotification } from "../../hooks/useNotification.js";
import { SvgDotsMenu, SvgPlus } from "../../helpers/iconeSvg.js";
import { getManagedProperties } from "../properties/services/property.service.js";
import { ModalManageAppointment } from "./ModalManageAppointment.jsx";
import { ModalCommunications } from "./ModalCommunications.jsx";
import { ModalShowPositions } from "./ModalShowPositions.jsx";
import { ModalVisitReports } from "./ModalVisitReports.jsx";
import {
  APPOINTMENT_STATUS,
  buildAppointmentSummary,
  createAppointmentPayload,
  formatParticipantName,
  isAgentRole
} from "./appointment.utils.js";
import { channelOptions, pipelineStatusOptions, propertyTypeLabelMap } from "./report.utils.js";
import { useChatWorkspace } from "./hooks/useChatWorkspace.js";

const extractErrorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

const loadImageAsDataUrl = async (src) => {
  if (!src) {
    return null;
  }

  const response = await fetch(resolveAvatarUrl(src, ""), { mode: "cors" });

  if (!response.ok) {
    throw new Error("Impossible de charger la photo de profil.");
  }

  const blob = await response.blob();

  return await new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => reject(new Error("Impossible de preparer la photo de profil."));
    reader.readAsDataURL(blob);
  });
};

const getPdfImageFormat = (dataUrl) => {
  if (!dataUrl?.startsWith("data:image/")) {
    return "JPEG";
  }

  const mimeType = dataUrl.slice(5, dataUrl.indexOf(";")).toLowerCase();

  if (mimeType.includes("png")) {
    return "PNG";
  }

  if (mimeType.includes("webp")) {
    return "WEBP";
  }

  return "JPEG";
};

const buildProfileFileName = (participant, type) => {
  const fullName = formatParticipantName(participant)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return `fiche-${type}-${fullName || "profil"}.pdf`;
};

const addProfilePhoto = (doc, participant, imageDataUrl, type) => {
  const photoX = 145;
  const photoY = 28;
  const photoSize = 36;

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(photoX, photoY, photoSize, photoSize, 8, 8, "FD");

  if (imageDataUrl) {
    doc.addImage(imageDataUrl, getPdfImageFormat(imageDataUrl), photoX + 2, photoY + 2, photoSize - 4, photoSize - 4);
    return;
  }

  const initials = formatParticipantName(participant)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || (type === "agent" ? "AG" : "CL");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(initials, photoX + (photoSize / 2), photoY + 23, { align: "center" });
};

const createProfilePdf = async ({ participant, type }) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });
  const imageDataUrl = await loadImageAsDataUrl(participant?.avatar).catch(() => null);
  const fullName = formatParticipantName(participant);
  const roleLabel = type === "agent" ? "Fiche agent" : "Fiche client";
  const primaryContact = participant?.phone || participant?.email || "Non renseigne";

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 60, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Yopii", 20, 18);
  doc.setFontSize(24);
  doc.text(roleLabel, 20, 31);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Profil exporte depuis la messagerie privee", 20, 39);

  addProfilePhoto(doc, participant, imageDataUrl, type);

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, 68, 180, 60, 10, 10, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, 68, 180, 60, 10, 10, "S");

  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Nom complet", 24, 84);
  doc.text("Contact principal", 24, 102);
  doc.text("Role", 24, 120);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(17);
  doc.text(fullName, 24, 91);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.text(primaryContact, 24, 109);
  doc.text(participant?.role || "-", 24, 127);

  const detailLines = [
    `Email : ${participant?.email || "Non renseigne"}`,
    `Telephone : ${participant?.phone || "Non renseigne"}`
  ];

  doc.setTextColor(71, 85, 105);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Coordonnees", 20, 152);
  doc.roundedRect(15, 158, 180, 40, 10, 10, "S");
  doc.text(detailLines, 24, 172, { maxWidth: 160 });

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(9);
  doc.text(`Genere le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(new Date())}`, 20, 286);

  doc.save(buildProfileFileName(participant, type));
};

const formatTimestamp = (value) => {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit"
  }).format(new Date(value));
};

const renderAppointmentDetails = (appointment) => {
  if (!appointment) {
    return null;
  }

  return (
    <div className="space-y-4 text-left">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-emerald-100">
          Rendez-vous
        </span>
        <span className="text-xs uppercase tracking-[0.2em] text-stone-400">
          {APPOINTMENT_STATUS[appointment.status] || appointment.status || "En attente"}
        </span>
      </div>
      <div className="grid gap-3 text-sm text-stone-200 md:grid-cols-2">
        <p><span className="text-stone-400">Bien :</span> {appointment.propertyTitle || "-"}</p>
        <p><span className="text-stone-400">Date :</span> {appointment.date}</p>
        <p><span className="text-stone-400">Horaire :</span> {appointment.startTime} - {appointment.endTime}</p>
        <p><span className="text-stone-400">Frais :</span> {Number(appointment.visitFee || 0).toLocaleString("fr-FR")} Ar</p>
        <p><span className="text-stone-400">Client prend le bien :</span> {appointment.clientTakesProperty ? "Oui" : "Non"}</p>
      </div>
      <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
        <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Description</p>
        <p className="text-sm text-white">{appointment.description || "-"}</p>
      </div>
      <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
        <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Retour client</p>
        <p className="text-sm text-white">{appointment.clientFeedback || "-"}</p>
      </div>
    </div>
  );
};

const resolveOptionLabel = (options, value) => options.find((option) => option.value === value)?.label || value || "-";

const renderCommunicationDetails = (report) => {
  if (!report) {
    return null;
  }

  return (
    <div className="space-y-4 text-left">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-sky-100">
          Communication
        </span>
        <span className="text-xs uppercase tracking-[0.2em] text-stone-400">
          {resolveOptionLabel(pipelineStatusOptions, report.pipelineStage)}
        </span>
      </div>
      <div className="grid gap-3 text-sm text-stone-200 md:grid-cols-2">
        <p><span className="text-stone-400">Client :</span> {report.clientFullName || "-"}</p>
        <p><span className="text-stone-400">Canal :</span> {resolveOptionLabel(channelOptions, report.channel)}</p>
        <p><span className="text-stone-400">Date :</span> {report.communicationDate || "-"}</p>
        <p><span className="text-stone-400">Heure :</span> {report.communicationTime || "-"}</p>
        <p><span className="text-stone-400">Objet :</span> {report.subject || "-"}</p>
        <p><span className="text-stone-400">Interet :</span> {report.interestLevel || "-"}</p>
      </div>
      <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
        <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Resume</p>
        <p className="text-sm text-white">{report.summary || "-"}</p>
      </div>
      <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
        <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Suite</p>
        <p className="text-sm text-white">{report.nextAction || "-"}</p>
      </div>
    </div>
  );
};

const renderVisitReportDetails = (report) => {
  if (!report) {
    return null;
  }

  return (
    <div className="space-y-4 text-left">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-amber-100">
          Rapport de visite
        </span>
        <span className="text-xs uppercase tracking-[0.2em] text-stone-400">
          {resolveOptionLabel(pipelineStatusOptions, report.pipelineStatus)}
        </span>
      </div>
      <div className="grid gap-3 text-sm text-stone-200 md:grid-cols-2">
        <p><span className="text-stone-400">Bien :</span> {report.propertyTitle || "-"}</p>
        <p><span className="text-stone-400">Operation :</span> {propertyTypeLabelMap[report.operationType] || report.operationType || "-"}</p>
        <p><span className="text-stone-400">Date :</span> {report.visitDate || "-"}</p>
        <p><span className="text-stone-400">Heure :</span> {report.visitTime || "-"}</p>
        <p><span className="text-stone-400">Client :</span> {report.clientFullName || "-"}</p>
        <p><span className="text-stone-400">Budget :</span> {Number(report.estimatedBudget || 0).toLocaleString("fr-FR")} Ar</p>
      </div>
      <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
        <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Besoin client</p>
        <p className="text-sm text-white">{report.clientNeed || "-"}</p>
      </div>
      <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
        <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Recommandations</p>
        <p className="text-sm text-white">{report.recommendations || "-"}</p>
      </div>
    </div>
  );
};

const MessageBubble = ({
  message,
  isCurrentUser,
  isEditing,
  onEditingChange,
  onEditingKeyDown,
  onStartEdit,
  onDelete,
  senderProfile,
  selectedConversationId,
  updateMessageMutation,
  deleteMessageMutation
}) => {
  const isAppointmentMessage = message.messageType === "appointment";
  const isCommunicationReportMessage = message.messageType === "communication_report";
  const isVisitReportMessage = message.messageType === "visit_report";
  const canEditRichMessage = (isAppointmentMessage && Boolean(message.appointment))
    || (isCommunicationReportMessage && Boolean(message.communicationReport))
    || (isVisitReportMessage && Boolean(message.visitReport));
  const conversationItemMenuItems = [
    {
      label: isAppointmentMessage ? "Modifier le rendez-vous" : isCommunicationReportMessage ? "Modifier le rapport" : isVisitReportMessage ? "Modifier le rapport" : "Modifier le message",
      action: async () => {
        if ((!isCurrentUser && !canEditRichMessage) || updateMessageMutation.isPending || !selectedConversationId) {
          return;
        }

        onStartEdit(message);
      },
      disabled: (!isCurrentUser && !canEditRichMessage)
    },
    {
      label: "Supprimer le message",
      action: async () => {
        if (!isCurrentUser || deleteMessageMutation.isPending || !selectedConversationId) {
          return;
        }

        onDelete(message);
      },
      disabled: !isCurrentUser
    }
  ];

  return (
    <div className={isCurrentUser ? "ml-auto max-w-3xl" : "mr-auto max-w-3xl"}>
      <div className={isCurrentUser ? "flex items-end justify-end gap-3" : "flex items-end gap-3"}>
        {!isCurrentUser ? (
          <Avatar
            src={senderProfile?.avatar}
            alt={`Photo de ${formatParticipantName(senderProfile)}`}
            name={formatParticipantName(senderProfile)}
            size="sm"
            variant="message"
            type={isAgentRole(senderProfile?.role) ? "agent" : "user"}
            className="mb-1"
          />
        ) : null}

        <div className={isCurrentUser ? "max-w-full rounded-[1.75rem] border border-brand-500/25 bg-brand-500/12 p-4 text-right shadow-[0_20px_50px_rgba(0,0,0,0.18)]" : "max-w-full rounded-[1.75rem] border border-white/10 bg-white/5 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.18)]"}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className={isCurrentUser ? "ml-auto text-right" : "text-left"}>
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{formatParticipantName(senderProfile)}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-stone-500">
                {message.messageType === "appointment"
                  ? "Rendez-vous"
                  : message.messageType === "communication_report"
                    ? "Rapport de communication"
                    : message.messageType === "visit_report"
                      ? "Rapport de visite"
                      : "Message"}
              </p>
            </div>
            <Menu
              icon={<SvgDotsMenu color="currentColor" />}
              items={conversationItemMenuItems}
              disabled={updateMessageMutation.isPending || deleteMessageMutation.isPending}
              align="right"
              aria-label="Ouvrir les actions du message"
            />
          </div>

          {isEditing ? (
            <textarea
              key={message.id}
              defaultValue={message.content}
              className="min-h-24 w-full rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-brand-500"
              onChange={(event) => onEditingChange(event.target.value)}
              onKeyDown={onEditingKeyDown}
              autoFocus
            />
          ) : isAppointmentMessage ? renderAppointmentDetails(message.appointment) : isCommunicationReportMessage ? renderCommunicationDetails(message.communicationReport) : isVisitReportMessage ? renderVisitReportDetails(message.visitReport) : (
            <p className="text-sm leading-7 text-white">{message.content}</p>
          )}

          <div className={isCurrentUser ? "mt-3 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-stone-400" : "mt-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-stone-400"}>
            <span>{message.status}</span>
            <Status color="#78716c" />
            <span>{formatTimestamp(message.readAt || message.deliveredAt || message.createdAt)}</span>
          </div>
        </div>

        {isCurrentUser ? (
          <Avatar
            src={senderProfile?.avatar}
            alt={`Photo de ${formatParticipantName(senderProfile)}`}
            name={formatParticipantName(senderProfile)}
            size="sm"
            variant="message"
            type={isAgentRole(senderProfile?.role) ? "agent" : "user"}
            className="mb-1"
          />
        ) : null}
      </div>
    </div>
  );
};

export const ConversationPanel = () => {
  const {
    user,
    onlineUsers,
    typingUserId,
    conversationsQuery,
    unreadCountQuery,
    messagesQuery,
    selectedConversation,
    selectedConversationId,
    setSelectedConversationId,
    draftMessage,
    setDraftMessage,
    submitMessage,
    sendMessageMutation,
    updateMessageMutation,
    deleteMessageMutation,
    deleteConversationMutation,
    uploadConversationAttachmentsMutation
  } = useChatWorkspace();
  const { showError, showInfo, showSuccess } = useNotification();

  const conversations = conversationsQuery.data || [];
  const messages = messagesQuery.data?.items || [];
  const isConversationDisabled = !selectedConversationId;
  const isAgentUser = isAgentRole(user?.role);
  const selectedParticipant = selectedConversation?.participantProfiles?.find((participant) => participant.id !== user?.id) || null;
  const isSelectedParticipantAgent = isAgentRole(selectedParticipant?.role);
  const isAppointmentCreationDisabled = isConversationDisabled || (isAgentUser && isSelectedParticipantAgent);
  const agentParticipant = isAgentUser ? user : selectedParticipant;
  const clientParticipant = isAgentUser ? selectedParticipant : user;
  const appointmentPropertiesQuery = useQuery({
    queryKey: ["chat-appointment-properties", user?.id, user?.role, user?.agencyId],
    queryFn: () =>
      getManagedProperties({
        scope: user?.role === "agency" || user?.role === "agency_agent" ? "agency" : "own",
        page: 1,
        limit: 100
      }),
    enabled: Boolean(isAgentUser && user && selectedConversationId)
  });
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingMessageContent, setEditingMessageContent] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [appointmentModalState, setAppointmentModalState] = useState({
    open: false,
    mode: "create",
    message: null,
    conversationId: null,
    participant: null,
    conversation: null
  });
  const [communicationModalState, setCommunicationModalState] = useState({
    open: false,
    mode: "create",
    message: null
  });
  const [visitReportModalState, setVisitReportModalState] = useState({
    open: false,
    mode: "create",
    message: null
  });
  const [showPositionsModal, setShowPositionsModal] = useState(false);
  const [isDownloadingProfile, setIsDownloadingProfile] = useState(false);

  const participantStatusItems = useMemo(() => {
    if (!selectedConversation) {
      return [];
    }

    return (selectedConversation.participantProfiles || [])
      .filter((participant) => participant.id !== user?.id)
      .map((participant) => ({
        id: participant.id,
        label: formatParticipantName(participant),
        avatar: participant.avatar || null,
        role: participant.role,
        isOnline: Boolean(onlineUsers[participant.id])
      }));
  }, [onlineUsers, selectedConversation, user?.id]);

  const appointmentPropertyOptions = useMemo(() => {
    const items = appointmentPropertiesQuery.data?.items || [];
    const mappedItems = items.map((property) => ({
      value: property.id,
      label: property.title,
      purpose: property.purpose
    }));
    const existingProperty = appointmentModalState.message?.appointment?.propertyId
      ? {
          value: appointmentModalState.message.appointment.propertyId,
          label: appointmentModalState.message.appointment.propertyTitle || "Bien selectionne",
          purpose: appointmentModalState.message.appointment.propertyPurpose || null
        }
      : null;

    if (existingProperty && !mappedItems.some((item) => String(item.value) === String(existingProperty.value))) {
      return [existingProperty, ...mappedItems];
    }

    return mappedItems;
  }, [appointmentModalState.message?.appointment, appointmentPropertiesQuery.data?.items]);

  const conversationMetrics = useMemo(() => ({
    total: conversations.length,
    unread: unreadCountQuery.data?.total ?? 0,
    messages: messages.length
  }), [conversations.length, messages.length, unreadCountQuery.data?.total]);

  const closeDeleteModal = () => {
    setDeleteTarget(null);
  };

  const openCreateAppointmentModal = () => {
    if (!selectedConversationId) {
      return;
    }

    if (isAgentUser && isSelectedParticipantAgent) {
      showInfo("La prise de rendez-vous est indisponible entre deux agents.");
      return;
    }

    if (!isAgentUser) {
      showInfo("Seul un agent peut initier une prise de rendez-vous.");
      return;
    }

    if (!(appointmentPropertiesQuery.data?.items || []).length) {
      showInfo("Aucun bien disponible pour planifier un rendez-vous.");
      return;
    }

    setAppointmentModalState({
      open: true,
      mode: "create",
      message: null,
      conversationId: selectedConversationId,
      participant: selectedParticipant,
      conversation: selectedConversation
    });
  };

  const openCreateCommunicationModal = () => {
    if (!selectedConversationId) {
      return;
    }

    if (!isAgentUser) {
      showInfo("Seul un agent peut enregistrer un rapport de communication.");
      return;
    }

    setCommunicationModalState({
      open: true,
      mode: "create",
      message: null
    });
  };

  const openCreateVisitReportModal = () => {
    if (!selectedConversationId) {
      return;
    }

    if (!isAgentUser) {
      showInfo("Seul un agent peut enregistrer un rapport de visite.");
      return;
    }

    setVisitReportModalState({
      open: true,
      mode: "create",
      message: null
    });
  };

  const closeAppointmentModal = () => {
    setAppointmentModalState({
      open: false,
      mode: "create",
      message: null,
      conversationId: null,
      participant: null,
      conversation: null
    });
  };

  const closeCommunicationModal = () => {
    setCommunicationModalState({
      open: false,
      mode: "create",
      message: null
    });
  };

  const closeVisitReportModal = () => {
    setVisitReportModalState({
      open: false,
      mode: "create",
      message: null
    });
  };

  const startEditingMessage = (message) => {
    if (message.messageType === "appointment") {
      setAppointmentModalState({
        open: true,
        mode: "edit",
        message,
        conversationId: selectedConversationId,
        participant: selectedParticipant,
        conversation: selectedConversation
      });
      return;
    }

    if (message.messageType === "communication_report") {
      setCommunicationModalState({
        open: true,
        mode: "edit",
        message
      });
      return;
    }

    if (message.messageType === "visit_report") {
      setVisitReportModalState({
        open: true,
        mode: "edit",
        message
      });
      return;
    }

    setEditingMessageId(message.id);
    setEditingMessageContent(message.content);
  };

  const cancelEditingMessage = () => {
    setEditingMessageId(null);
    setEditingMessageContent("");
  };

  const saveEditedMessage = async (message) => {
    const trimmedContent = editingMessageContent.trim();

    if (!selectedConversationId || !trimmedContent) {
      return;
    }

    if (trimmedContent === message.content) {
      cancelEditingMessage();
      return;
    }

    await updateMessageMutation.mutateAsync({
      conversationId: selectedConversationId,
      messageId: message.id,
      content: trimmedContent
    });

    cancelEditingMessage();
  };

  const handleAppointmentSubmit = async (values) => {
    const activeConversationId = appointmentModalState.conversationId || selectedConversationId;
    const activeParticipant = appointmentModalState.participant || selectedParticipant;
    const activeConversation = appointmentModalState.conversation || selectedConversation;

    if (!activeConversationId || !activeParticipant?.id) {
      return;
    }

    const existingAppointment = appointmentModalState.message?.appointment || null;
    const appointmentPayload = createAppointmentPayload({
      values,
      existingAppointment,
      selectedConversation: activeConversation,
      user,
      selectedParticipant: activeParticipant,
      isAgent: isAgentUser
    });
    const summary = buildAppointmentSummary(appointmentPayload, {
      agentName: formatParticipantName(agentParticipant),
      clientName: formatParticipantName(clientParticipant)
    });

    try {
      if (appointmentModalState.mode === "edit" && appointmentModalState.message?.id) {
        await updateMessageMutation.mutateAsync({
          conversationId: activeConversationId,
          messageId: appointmentModalState.message.id,
          content: summary,
          messageType: "appointment",
          appointment: appointmentPayload
        });
        showSuccess("Le rendez-vous a ete mis a jour.");
      } else {
        await sendMessageMutation.mutateAsync({
          conversationId: activeConversationId,
          content: summary,
          messageType: "appointment",
          appointment: appointmentPayload
        });
        showSuccess("Le rendez-vous a ete envoye dans la conversation.");
      }

      closeAppointmentModal();
    } catch (error) {
      showError(extractErrorMessage(error, "La gestion du rendez-vous a echoue."));
    }
  };

  const uploadAttachments = async (files) => {
    try {
      return await uploadConversationAttachmentsMutation.mutateAsync(files);
    } catch (error) {
      showError(extractErrorMessage(error, "Le televersement des pieces jointes a echoue."));
      return [];
    }
  };

  const handleCommunicationSubmit = async (values) => {
    if (!selectedConversationId) {
      return;
    }

    try {
      if (communicationModalState.mode === "edit" && communicationModalState.message?.id) {
        await updateMessageMutation.mutateAsync({
          conversationId: selectedConversationId,
          messageId: communicationModalState.message.id,
          content: "Rapport de communication",
          messageType: "communication_report",
          communicationReport: values,
          attachments: values.attachments || []
        });
        showSuccess("Le rapport de communication a ete mis a jour.");
      } else {
        await sendMessageMutation.mutateAsync({
          conversationId: selectedConversationId,
          content: "Rapport de communication",
          messageType: "communication_report",
          communicationReport: values,
          attachments: values.attachments || []
        });
        showSuccess("Le rapport de communication a ete envoye.");
      }

      closeCommunicationModal();
    } catch (error) {
      showError(extractErrorMessage(error, "L'enregistrement du rapport de communication a echoue."));
    }
  };

  const handleVisitReportSubmit = async (values) => {
    if (!selectedConversationId) {
      return;
    }

    try {
      if (visitReportModalState.mode === "edit" && visitReportModalState.message?.id) {
        await updateMessageMutation.mutateAsync({
          conversationId: selectedConversationId,
          messageId: visitReportModalState.message.id,
          content: "Rapport de visite",
          messageType: "visit_report",
          visitReport: values,
          attachments: values.attachments || []
        });
        showSuccess("Le rapport de visite a ete mis a jour.");
      } else {
        await sendMessageMutation.mutateAsync({
          conversationId: selectedConversationId,
          content: "Rapport de visite",
          messageType: "visit_report",
          visitReport: values,
          attachments: values.attachments || []
        });
        showSuccess("Le rapport de visite a ete envoye.");
      }

      closeVisitReportModal();
    } catch (error) {
      showError(extractErrorMessage(error, "L'enregistrement du rapport de visite a echoue."));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    if (deleteTarget.type === "conversation") {
      await deleteConversationMutation.mutateAsync({ participantId: deleteTarget.participantId });
      closeDeleteModal();
      return;
    }

    await deleteMessageMutation.mutateAsync({
      conversationId: selectedConversationId,
      messageId: deleteTarget.messageId
    });
    closeDeleteModal();
  };

  const handleDownloadProfile = async (type) => {
    if (!selectedParticipant?.id || isDownloadingProfile) {
      return;
    }

    try {
      setIsDownloadingProfile(true);
      await createProfilePdf({
        participant: selectedParticipant,
        type
      });
      showSuccess(`La fiche ${type === "agent" ? "agent" : "client"} a ete telechargee.`);
    } catch (error) {
      showError(extractErrorMessage(error, "Le telechargement de la fiche a echoue."));
    } finally {
      setIsDownloadingProfile(false);
    }
  };

  const creationMenuItems = [
    {
      label: "Prise de rendez-vous",
      action: openCreateAppointmentModal,
      disabled: isAppointmentCreationDisabled
    },
    {
      label: "Rapport de communication",
      action: openCreateCommunicationModal,
      disabled: isConversationDisabled || !isAgentUser
    },
    {
      label: "Rapport de visite",
      action: openCreateVisitReportModal,
      disabled: isConversationDisabled || !isAgentUser
    }
  ];

  const conversationMenuItems = [
    {
      label: "Voir nos positions",
      action: () => {
        setShowPositionsModal(true);
      },
      disabled: !selectedParticipant?.id
    },
    ...((!isAgentUser && isSelectedParticipantAgent)
      ? [{
          label: "Telecharger fiche agent",
          action: async () => {
            await handleDownloadProfile("agent");
          },
          disabled: isDownloadingProfile
        }]
      : []),
    ...((isAgentUser && !isSelectedParticipantAgent)
      ? [{
          label: "Telecharger fiche client",
          action: async () => {
            await handleDownloadProfile("client");
          },
          disabled: isDownloadingProfile
        }]
      : []),
    {
      label: "Supprimer la conversation",
      action: async () => {
        if (!selectedParticipant?.id || deleteConversationMutation.isPending) {
          return;
        }

        setDeleteTarget({
          type: "conversation",
          participantId: selectedParticipant.id,
          title: "Supprimer la conversation",
          content: `Voulez-vous vraiment supprimer toutes les conversations avec ${formatParticipantName(selectedParticipant)} ? Cette action est irreversible.`
        });
      }
    }
  ];

  return (
    <>
      <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <aside className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.14),transparent_25%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
          <div className="space-y-4 border-b border-white/10 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/80">Messagerie</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Conversations privees</h3>
              </div>
              <div className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs uppercase tracking-[0.2em] text-stone-300 backdrop-blur">
                {conversationMetrics.unread} non lus
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Conversations</p>
                <p className="mt-2 text-2xl font-semibold text-white">{conversationMetrics.total}</p>
              </div>
              <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Messages</p>
                <p className="mt-2 text-2xl font-semibold text-white">{conversationMetrics.messages}</p>
              </div>
              <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Selection</p>
                <p className="mt-2 text-sm font-medium text-stone-200">{selectedParticipant ? formatParticipantName(selectedParticipant) : "Aucune"}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {conversations.map((conversation) => {
              const isActive = conversation.id === selectedConversationId;
              const peers = (conversation.participantProfiles || []).filter((participant) => participant.id !== user?.id);
              const peerNames = peers.map((participant) => formatParticipantName(participant));
              const primaryPeer = peers[0] || null;
              const isPeerOnline = primaryPeer ? Boolean(onlineUsers[primaryPeer.id]) : false;

              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedConversationId(conversation.id)}
                  className={isActive
                    ? "w-full rounded-[1.6rem] border border-brand-500/35 bg-brand-500/10 p-4 text-left shadow-[0_18px_40px_rgba(0,0,0,0.18)]"
                    : "w-full rounded-[1.6rem] border border-white/10 bg-black/15 p-4 text-left transition hover:border-white/20 hover:bg-white/5"
                  }
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar
                        src={primaryPeer?.avatar}
                        alt={`Photo de ${primaryPeer ? formatParticipantName(primaryPeer) : "participant"}`}
                        name={primaryPeer ? formatParticipantName(primaryPeer) : "Participant"}
                        size="sm"
                        variant="message"
                        type={isAgentRole(primaryPeer?.role) ? "agent" : "user"}
                      />
                      {primaryPeer ? (
                        <span className="absolute -bottom-1 -right-1 inline-flex h-3.5 w-3.5 rounded-full border-2 border-stone-950" style={{ backgroundColor: isPeerOnline ? "#22c55e" : "#ef4444" }} />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-white">{peerNames.join(", ") || "Nouvelle conversation"}</p>
                        <span className="shrink-0 text-right text-[11px] uppercase tracking-[0.2em] text-stone-500 sm:whitespace-nowrap">
                          {conversation.lastMessageAt ? formatTimestamp(conversation.lastMessageAt) : "-"}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-300">{conversation.lastMessagePreview || "Nouvelle conversation"}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-stone-500">
                        <span>{primaryPeer?.role || "participant"}</span>
                        <Status color={isPeerOnline ? "#22c55e" : "#ef4444"} />
                        <span>{isPeerOnline ? "en ligne" : "hors ligne"}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
            {!conversations.length ? <p className="text-sm text-stone-400">Aucune conversation disponible.</p> : null}
          </div>
        </aside>

        <div className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.08),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] lg:p-6">
          <div className="border-b border-white/10 pb-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/80">Conversation active</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">{selectedParticipant ? formatParticipantName(selectedParticipant) : "Messagerie privee"}</h3>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-stone-400">
                  {participantStatusItems.length ? participantStatusItems.map((participant) => (
                    <span key={participant.id} className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/20 px-3 py-2">
                      <Avatar
                        src={participant.avatar}
                        alt={`Photo de ${participant.label}`}
                        name={participant.label}
                        size="xs"
                        variant="message"
                        type={isAgentRole(participant.role) ? "agent" : "user"}
                      />
                      <span>{participant.label}</span>
                      <Status color={participant.isOnline ? "#22c55e" : "#ef4444"} />
                      <span>{participant.isOnline ? "en ligne" : "hors ligne"}</span>
                    </span>
                  )) : <span>Selectionnez une conversation</span>}
                </div>
                {typingUserId ? <p className="text-xs font-medium text-brand-100">Votre interlocuteur est en train d'ecrire...</p> : null}
              </div>

              <div className="grid w-full gap-3 sm:grid-cols-4 lg:min-w-0 xl:min-w-[320px]">
                <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Messages</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{messages.length}</p>
                </div>
                <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Rendez-vous</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{messages.filter((message) => message.messageType === "appointment").length}</p>
                </div>
                <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Rapports</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{messages.filter((message) => ["communication_report", "visit_report"].includes(message.messageType)).length}</p>
                </div>
                {/* <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Statut</p>
                  <p className="mt-2 text-sm font-medium text-stone-200">{selectedParticipant ? (onlineUsers[selectedParticipant.id] ? "Disponible" : "Hors ligne") : "Aucune selection"}</p>
                </div> */}
                <div className="mt-9">
                  <Menu
                    icon={<SvgDotsMenu color="currentColor" />}
                    items={conversationMenuItems}
                    disabled={isConversationDisabled || deleteConversationMutation.isPending || !selectedParticipant?.id}
                    align="right"
                    aria-label="Ouvrir les actions de conversation"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 min-h-[420px] space-y-4 rounded-[1.8rem] border border-white/10 bg-black/15 p-4 lg:p-5">
            {messages.map((message) => {
              const isCurrentUser = message.senderId === user?.id;
              const isEditing = editingMessageId === message.id;
              const senderProfile = isCurrentUser ? user : selectedParticipant;

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isCurrentUser={isCurrentUser}
                  isEditing={isEditing}
                  onEditingChange={setEditingMessageContent}
                  onEditingKeyDown={async (event) => {
                    if (event.key === "Escape") {
                      cancelEditingMessage();
                      return;
                    }

                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      await saveEditedMessage(message);
                    }
                  }}
                  onStartEdit={startEditingMessage}
                  onDelete={(targetMessage) => setDeleteTarget({
                    type: "message",
                    messageId: targetMessage.id,
                    title: "Supprimer le message",
                    content: "Voulez-vous vraiment supprimer ce message ? Cette action est irreversible."
                  })}
                  senderProfile={senderProfile}
                  selectedConversationId={selectedConversationId}
                  updateMessageMutation={updateMessageMutation}
                  deleteMessageMutation={deleteMessageMutation}
                />
              );
            })}
            {!messages.length ? (
              <div className="flex min-h-[320px] items-center justify-center rounded-[1.5rem] border border-dashed border-white/15 bg-black/10 px-6 text-center text-sm leading-6 text-stone-400">
                Aucun message dans cette conversation. Utilisez la zone de composition pour demarrer l'echange.
              </div>
            ) : null}
          </div>

          <div className="mt-5 rounded-[1.8rem] border border-white/10 bg-black/20 p-4 lg:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
              <div className="flex items-center gap-3">
                <Menu
                  icon={<SvgPlus />}
                  items={creationMenuItems}
                  disabled={isConversationDisabled}
                  aria-label="Ouvrir les actions de creation"
                />
                
              </div>

              <div className="flex-1">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-stone-200">Votre message</span>
                  <textarea
                    className="min-h-28 w-full rounded-[1.5rem] border border-white/10 bg-stone-900/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-brand-500"
                    value={draftMessage}
                    onChange={(event) => setDraftMessage(event.target.value)}
                    placeholder="Ecrivez a votre agent ou a votre client..."
                    disabled={!selectedConversationId || sendMessageMutation.isPending}
                  />
                </label>
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  className="px-6"
                  disabled={!selectedConversationId || !draftMessage.trim() || sendMessageMutation.isPending}
                  onClick={submitMessage}
                >
                  Envoyer
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ModalDelete
        open={Boolean(deleteTarget)}
        title={deleteTarget?.title || "Supprimer"}
        content={deleteTarget?.content || "Est ce que vous aimeriez supprimer le message ?"}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        isDeleting={deleteMessageMutation.isPending || deleteConversationMutation.isPending}
      />

      <ModalShowPositions
        open={showPositionsModal}
        conversationId={selectedConversationId}
        currentUser={user}
        participant={selectedParticipant}
        onClose={() => setShowPositionsModal(false)}
      />

      <ModalManageAppointment
        open={appointmentModalState.open}
        mode={appointmentModalState.mode}
        appointment={appointmentModalState.message?.appointment || null}
        propertyOptions={appointmentPropertyOptions}
        currentUser={user}
        agent={agentParticipant}
        client={clientParticipant}
        isAgent={isAgentUser}
        isSaving={sendMessageMutation.isPending || updateMessageMutation.isPending}
        onClose={closeAppointmentModal}
        onSubmit={handleAppointmentSubmit}
      />

      <ModalCommunications
        open={communicationModalState.open}
        mode={communicationModalState.mode}
        currentUser={user}
        participant={selectedParticipant}
        propertyOptions={appointmentPropertyOptions}
        report={communicationModalState.message?.communicationReport || null}
        isSaving={sendMessageMutation.isPending || updateMessageMutation.isPending}
        isUploading={uploadConversationAttachmentsMutation.isPending}
        onUploadFiles={uploadAttachments}
        onClose={closeCommunicationModal}
        onSubmit={handleCommunicationSubmit}
      />

      <ModalVisitReports
        open={visitReportModalState.open}
        mode={visitReportModalState.mode}
        currentUser={user}
        participant={selectedParticipant}
        propertyOptions={appointmentPropertyOptions}
        report={visitReportModalState.message?.visitReport || null}
        isSaving={sendMessageMutation.isPending || updateMessageMutation.isPending}
        isUploading={uploadConversationAttachmentsMutation.isPending}
        onUploadFiles={uploadAttachments}
        onClose={closeVisitReportModal}
        onSubmit={handleVisitReportSubmit}
      />
    </>
  );
};
