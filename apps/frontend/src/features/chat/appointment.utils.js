export const APPOINTMENT_STATUS = {
  pending: "En attente",
  confirmed: "Confirme",
  completed: "Termine",
  cancelled: "Annule",
  closed_won: "Conclu"
};

export const isAgentRole = (role) => ["independent_agent", "agency", "agency_agent"].includes(role);

export const formatParticipantName = (participant) => {
  const fullName = [participant?.firstName, participant?.lastName].filter(Boolean).join(" ").trim();
  return fullName || participant?.email || participant?.id || "-";
};

export const buildAppointmentSummary = (appointment, names = {}) => {
  if (!appointment) {
    return "";
  }

  const visitFee = Number(appointment.visitFee || 0).toLocaleString("fr-FR");
  const lines = [
    `Rendez-vous ${
      appointment.status === "cancelled"
        ? "annule"
        : appointment.status === "closed_won"
          ? "conclu"
          : "planifie"
    }`,
    `Bien : ${appointment.propertyTitle || "-"}`,
    `Date : ${appointment.date}`,
    `Horaire : ${appointment.startTime} - ${appointment.endTime}`,
    `Frais de visite : ${visitFee} Ar`,
    `Agent : ${names.agentName || "-"}`,
    `Client : ${names.clientName || "-"}`,
    `Description : ${appointment.description || "-"}`,
    `Retour client : ${appointment.clientFeedback || "-"}`,
    `Le client prend le bien : ${appointment.clientTakesProperty ? "Oui" : "Non"}`
  ];

  return lines.join("\n");
};

export const createAppointmentPayload = ({
  values,
  existingAppointment = null,
  selectedConversation,
  user,
  selectedParticipant,
  isAgent
}) => {
  const now = new Date().toISOString();
  const previousPayload = existingAppointment || {};
  const agentId = previousPayload.agentId || (isAgent ? user?.id : selectedParticipant?.id) || "";
  const clientId = previousPayload.clientId || (isAgent ? selectedParticipant?.id : user?.id) || "";

  return {
    appointmentId: previousPayload.appointmentId || `appointment-${Date.now()}`,
    propertyId: values.propertyOption?.value || previousPayload.propertyId || selectedConversation?.propertyId || null,
    propertyTitle: values.propertyOption?.label || previousPayload.propertyTitle || "",
    propertyPurpose: values.propertyOption?.purpose || previousPayload.propertyPurpose || null,
    conversationId: selectedConversation?.id || previousPayload.conversationId || null,
    clientId,
    agentId,
    status: values.clientTakesProperty ? "closed_won" : "pending",
    date: values.date,
    startTime: values.startTime,
    endTime: values.endTime,
    visitFee: Number(values.visitFee || 0),
    description: values.description.trim(),
    clientFeedback: values.clientFeedback.trim(),
    clientTakesProperty: Boolean(values.clientTakesProperty),
    createdAt: previousPayload.createdAt || now,
    updatedAt: now,
    createdBy: previousPayload.createdBy || user?.id || "",
    updatedBy: user?.id || ""
  };
};

export const getAppointmentFormValues = (appointment) => ({
  propertyOption: appointment?.propertyId
    ? {
        value: appointment.propertyId,
        label: appointment.propertyTitle || "Bien selectionne",
        purpose: appointment.propertyPurpose || null
      }
    : null,
  date: appointment?.date || "",
  startTime: appointment?.startTime || "09:00",
  endTime: appointment?.endTime || "09:30",
  visitFee: appointment?.visitFee ?? 0,
  description: appointment?.description || "",
  clientFeedback: appointment?.clientFeedback || "",
  clientTakesProperty: Boolean(appointment?.clientTakesProperty)
});
