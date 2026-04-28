import dayjs from "dayjs";
import { formatMoney } from "../../app/preferences/user-preferences.utils.js";

const fallbackNameByRole = {
  user: "Utilisateur",
  agency_agent: "Agent",
  independent_agent: "Agent",
  agency: "Agence"
};

export const formatCompactNumber = (value) => new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(value || 0);

export const formatCurrency = (value, currency = "USD") => formatMoney(value, currency);

export const formatDateTime = (value, format = "DD/MM/YYYY HH:mm") => (value ? dayjs(value).format(format) : "-");

export const formatShortDate = (value) => formatDateTime(value, "DD MMM YYYY");

export const getConversationCounterpart = (conversation, currentUserId) => {
  const counterpart = (conversation?.participantProfiles || []).find((participant) => String(participant.id) !== String(currentUserId));

  return counterpart || null;
};

export const getDisplayName = (person, fallbackRole = "user") => {
  const fullName = [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim();
  return fullName || person?.name || person?.email || fallbackNameByRole[fallbackRole] || "Profil";
};

export const parseAppointmentDateTime = (date, time) => {
  if (!date || !time) {
    return null;
  }

  const parsedValue = new Date(`${date}T${time}:00`);
  return Number.isNaN(parsedValue.getTime()) ? null : parsedValue;
};

export const buildDashboardAppointments = ({ conversations = [], messagePages = [], currentUser }) =>
  messagePages.flatMap((page, index) => {
    const conversation = conversations[index];
    const items = page?.items || [];

    return items
      .filter((message) => message.messageType === "appointment" && message.appointment)
      .map((message) => {
        const appointment = message.appointment;
        const start = parseAppointmentDateTime(appointment.date, appointment.startTime);
        const end = parseAppointmentDateTime(appointment.date, appointment.endTime);

        if (!start || !end) {
          return null;
        }

        return {
          id: message.id,
          title: appointment.propertyTitle || "Rendez-vous",
          start,
          end,
          status: appointment.status,
          propertyId: appointment.propertyId || null,
          propertyTitle: appointment.propertyTitle || "Bien",
          propertyPurpose: appointment.propertyPurpose || null,
          conversationId: conversation?.id || null,
          conversation,
          counterpart: getConversationCounterpart(conversation, currentUser?.id),
          message
        };
      })
      .filter(Boolean);
  });

export const sortByNewest = (items = [], accessor) =>
  [...items].sort((left, right) => new Date(accessor(right)).getTime() - new Date(accessor(left)).getTime());

export const sortByUpcoming = (items = [], accessor) =>
  [...items].sort((left, right) => new Date(accessor(left)).getTime() - new Date(accessor(right)).getTime());
