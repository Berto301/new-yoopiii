import { cn } from "../../lib/utils/cn.js";

const iconClassName = "h-5 w-5 shrink-0";

const createIcon = (path, viewBox = "0 0 24 24") => function Icon({ className }) {
  return (
    <svg viewBox={viewBox} aria-hidden="true" className={cn(iconClassName, className)} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {path}
    </svg>
  );
};

export const DashboardIcon = createIcon(<path d="M3 13.5 12 4l9 9.5M6.5 10.5V20h11v-9.5M9.5 20v-5h5v5" />);
export const PublicationsIcon = createIcon(<><path d="M4 6.5h16" /><path d="M4 12h16" /><path d="M4 17.5h10" /><path d="M17 16.5 19 18.5l3.5-4" /></>);
export const PropertyIcon = createIcon(<><path d="M4 20h16" /><path d="M6 20V8.5L12 5l6 3.5V20" /><path d="M9.5 11.5h5" /><path d="M10 20v-4h4v4" /></>);
export const FavoritesIcon = createIcon(<path d="m12 20-1.4-1.2C5.7 14.5 3 12 3 8.6 3 6 5 4 7.6 4c1.6 0 3.2.7 4.4 2 1.2-1.3 2.8-2 4.4-2C19 4 21 6 21 8.6c0 3.4-2.7 5.9-7.6 10.2L12 20Z" />);
export const BookingIcon = createIcon(<><path d="M7 3v3M17 3v3M4 8h16" /><rect x="4" y="5.5" width="16" height="15" rx="2" /><path d="M8 12h3v3H8z" /></>);
export const AgenciesIcon = createIcon(<><path d="M4 20h16" /><path d="M6 20V6h12v14" /><path d="M9 10h2M13 10h2M9 14h2M13 14h2" /></>);
export const CalendarIcon = createIcon(<><path d="M7 3v3M17 3v3M4 8h16" /><rect x="4" y="5.5" width="16" height="15" rx="2" /></>);
export const MessagesIcon = createIcon(<><path d="M5 6.5h14A1.5 1.5 0 0 1 20.5 8v8A1.5 1.5 0 0 1 19 17.5H9l-4.5 3V8A1.5 1.5 0 0 1 5 6.5Z" /><path d="M8 11h8M8 14h5" /></>);
export const NotificationsIcon = createIcon(<><path d="M9.5 20a2.5 2.5 0 0 0 5 0" /><path d="M6 16.5h12l-1.3-2V10a4.7 4.7 0 1 0-9.4 0v4.5L6 16.5Z" /></>);
export const SettingsIcon = createIcon(<><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" /><path d="m19 12 2-1-1-3-2.2.2a7.6 7.6 0 0 0-1.5-1.5L16.5 4h-3l-1 2a7.8 7.8 0 0 0-1 0l-1-2h-3l-.8 2.2a7.6 7.6 0 0 0-1.5 1.5L3 8l-1 3 2 1a7.8 7.8 0 0 0 0 1l-2 1 1 3 2.2-.2a7.6 7.6 0 0 0 1.5 1.5L7.5 20h3l1-2a7.8 7.8 0 0 0 1 0l1 2h3l.8-2.2a7.6 7.6 0 0 0 1.5-1.5L20 17l1-3-2-1a7.8 7.8 0 0 0 0-1Z" /></>);
export const ContractsIcon = createIcon(<><path d="M8 3.5h6l4 4V20a1 1 0 0 1-1 1H8a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Z" /><path d="M14 3.5v4h4M9 12h6M9 16h6" /></>);
export const RentIcon = createIcon(<><path d="M4 20h16" /><path d="M6.5 20V8.5L12 5l5.5 3.5V20" /><path d="M8 12.5h8M12 9.5v7" /></>);
export const ExpensesIcon = createIcon(<><path d="M5 7.5h14" /><path d="M7 4.5h10" /><rect x="4" y="7.5" width="16" height="12" rx="2" /><path d="M8 13.5h8" /></>);
export const TenantsIcon = createIcon(<><path d="M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path d="M15.5 12.5a2.5 2.5 0 1 0 0-5" /><path d="M4.5 19a4.5 4.5 0 0 1 8 0" /><path d="M14 19a3.5 3.5 0 0 1 5-2.6" /></>);
export const MaintenanceIcon = createIcon(<><path d="m14.5 5.5 4 4" /><path d="m13 7 4 4" /><path d="m4 20 4.5-1 9-9-3.5-3.5-9 9L4 20Z" /></>);
export const InstallIcon = createIcon(<><path d="M12 3v11" /><path d="m7.5 10.5 4.5 4.5 4.5-4.5" /><path d="M5 20h14" /></>);
export const MoreIcon = createIcon(<><path d="M5 12h.01" /><path d="M12 12h.01" /><path d="M19 12h.01" /></>);

export const CrmIcon = createIcon(<><path d="M4 6.5h7" /><path d="M4 12h10" /><path d="M4 17.5h6" /><rect x="14" y="4" width="6" height="5" rx="1.2" /><rect x="14" y="10" width="6" height="5" rx="1.2" /><rect x="14" y="16" width="6" height="4" rx="1.2" /></>);

