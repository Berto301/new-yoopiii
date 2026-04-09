const formatArray = (items = []) => Array.isArray(items) && items.length ? items.join(", ") : "-";

export const buildVisitReportSummary = (report) => [
  `Rapport de visite: ${report.propertyTitle || "Bien non renseigne"}`,
  `Client: ${report.clientFullName || "-"}`,
  `Date: ${report.visitDate || "-"} a ${report.visitTime || "-"}`,
  `Interet: ${report.interestStatus || "-"}`,
  `Budget: ${Number(report.estimatedBudget || 0).toLocaleString("fr-FR")} Ar`,
  `Suite: ${report.nextAction || "-"}`
].join("\n");

export const buildCommunicationReportSummary = (report) => [
  `Rapport de communication: ${report.subject || "Sans objet"}`,
  `Client: ${report.clientFullName || "-"}`,
  `Canal: ${report.channel || "-"}`,
  `Date: ${report.communicationDate || "-"} a ${report.communicationTime || "-"}`,
  `Resultat: ${report.interactionResult || "-"}`,
  `Action suivante: ${report.nextAction || "-"}`
].join("\n");

export const buildNotificationDescriptor = ({ messageType, appointment, communicationReport, visitReport, isUpdate = false }) => {
  if (messageType === "appointment") {
    return {
      type: appointment?.status === "closed_won"
        ? "appointment_closed_won"
        : (isUpdate ? "appointment_updated" : "appointment_created"),
      title: appointment?.status === "closed_won"
        ? "Rendez-vous conclu"
        : (isUpdate ? "Rendez-vous mis a jour" : "Nouveau rendez-vous")
    };
  }

  if (messageType === "communication_report") {
    return {
      type: isUpdate ? "communication_report_updated" : "communication_report_created",
      title: isUpdate ? "Rapport de communication mis a jour" : "Nouveau rapport de communication"
    };
  }

  if (messageType === "visit_report") {
    return {
      type: isUpdate ? "visit_report_updated" : "visit_report_created",
      title: isUpdate ? "Rapport de visite mis a jour" : "Nouveau rapport de visite"
    };
  }

  return {
    type: "new_message",
    title: isUpdate ? "Message modifie" : "Nouveau message"
  };
};

export const resolveMessageContent = ({ content, messageType, communicationReport, visitReport }) => {
  if (messageType === "communication_report" && communicationReport) {
    return buildCommunicationReportSummary(communicationReport);
  }

  if (messageType === "visit_report" && visitReport) {
    return buildVisitReportSummary(visitReport);
  }

  return content;
};

export const buildConversationNotificationData = ({ conversationId, message, actorId }) => ({
  conversationId,
  messageId: message._id || message.id,
  senderId: actorId,
  actorId,
  appointmentId: message.appointment?.appointmentId || null,
  propertyId: message.appointment?.propertyId || message.communicationReport?.propertyId || message.visitReport?.propertyId || null,
  propertyTitle: message.appointment?.propertyTitle || message.communicationReport?.propertyTitle || message.visitReport?.propertyTitle || null,
  appointmentStatus: message.appointment?.status || null,
  reportType: message.messageType === "communication_report" ? "communication" : message.messageType === "visit_report" ? "visit" : null,
  reportSubject: message.communicationReport?.subject || message.visitReport?.propertyTitle || null,
  tags: formatArray(message.communicationReport?.tags || message.visitReport?.tags || [])
});
