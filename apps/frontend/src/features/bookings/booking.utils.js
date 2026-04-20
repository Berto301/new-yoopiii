import { format } from "date-fns";
import { fr } from "date-fns/locale";

const TIME_SLOT_PATTERN = /^(\d{1,2}):(\d{2})$/;

export const parseBookingDateTime = (requestedDate, timeSlot = "") => {
  if (!requestedDate) {
    return null;
  }

  const baseDate = new Date(requestedDate);

  if (Number.isNaN(baseDate.getTime())) {
    return null;
  }

  const match = String(timeSlot || "").match(TIME_SLOT_PATTERN);

  if (!match) {
    return baseDate;
  }

  const [, hour, minute] = match;
  const parsedDate = new Date(baseDate);
  parsedDate.setHours(Number(hour), Number(minute), 0, 0);
  return parsedDate;
};

export const formatBookingDateTime = (requestedDate, timeSlot = "") => {
  const parsedDate = parseBookingDateTime(requestedDate, timeSlot);

  if (!parsedDate) {
    return timeSlot || "Date non renseignee";
  }

  return format(parsedDate, "dd MMMM yyyy HH:mm", { locale: fr });
};
