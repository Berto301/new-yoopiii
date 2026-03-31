export const APP_NAME = "Yopii";
export const EMPTY_OPTION = "";

export const PERMISSION_IDS = {
  MEMBERS_READ: "agency.members.read",
  MEMBERS_INVITE: "agency.members.invite",
  MEMBERS_UPDATE: "agency.members.update",
  MEMBERS_REMOVE: "agency.members.remove",
  ROLES_READ: "agency.roles.read",
  ROLES_CREATE: "agency.roles.create",
  ROLES_UPDATE: "agency.roles.update",
  ROLES_DELETE: "agency.roles.delete",
  ROLES_DUPLICATE: "agency.roles.duplicate",
  PERMISSIONS_ASSIGN: "agency.permissions.assign",
  PROPERTIES_READ: "agency.properties.read",
  PROPERTIES_CREATE: "agency.properties.create",
  PROPERTIES_UPDATE: "agency.properties.update",
  PROPERTIES_DELETE: "agency.properties.delete",
  PROPERTIES_PUBLISH: "agency.properties.publish",
  CALENDAR_READ: "agency.calendar.read",
  CALENDAR_CREATE: "agency.calendar.create",
  CALENDAR_UPDATE: "agency.calendar.update",
  CALENDAR_DELETE: "agency.calendar.delete",
  EXPENSES_READ: "agency.expenses.read",
  EXPENSES_CREATE: "agency.expenses.create",
  EXPENSES_UPDATE: "agency.expenses.update",
  EXPENSES_APPROVE: "agency.expenses.approve",
  EXPENSES_DELETE: "agency.expenses.delete",
  STATS_READ: "agency.stats.read",
  TEAM_PERFORMANCE_READ: "agency.team.performance.read",
  BOOKINGS_READ: "agency.bookings.read",
  MESSAGES_READ: "agency.messages.read",
  MESSAGES_ASSIGN: "agency.messages.assign",
  UI_ROUTE_DASHBOARD_USER: "ui.route.dashboard.user",
  UI_ROUTE_FAVORITES: "ui.route.favorites",
  UI_ROUTE_BOOKINGS: "ui.route.bookings",
  UI_ROUTE_MESSAGES: "ui.route.messages",
  UI_ROUTE_NOTIFICATIONS: "ui.route.notifications",
  UI_ROUTE_SETTINGS: "ui.route.settings",
  UI_ROUTE_PROPERTIES: "ui.route.dashboard.properties",
  UI_ROUTE_AGENT_DASHBOARD: "ui.route.dashboard.agent",
  UI_ROUTE_AGENT_SCORING: "ui.route.dashboard.agent.scoring",
  UI_ROUTE_AGENCY_DASHBOARD: "ui.route.dashboard.agency",
  UI_ROUTE_AGENCY_MEMBERS: "ui.route.dashboard.agency.members",
  UI_ROUTE_AGENCY_CALENDAR: "ui.route.dashboard.agency.calendar",
  UI_ROUTE_AGENCY_EXPENSES: "ui.route.dashboard.agency.expenses",
  UI_TAB_SETTINGS_PROFILE: "ui.tab.settings.profile",
  UI_TAB_SETTINGS_ROLES: "ui.tab.settings.roles",
  UI_TAB_SETTINGS_MEMBERS: "ui.tab.settings.members",
  UI_TAB_SETTINGS_AGENCY: "ui.tab.settings.agency"
};

export const PERMISSION_TREE = [
  {
    value: "ui.routes",
    label: "Routes accessibles",
    children: [
      { value: PERMISSION_IDS.UI_ROUTE_DASHBOARD_USER, label: "Vue globale" },
      { value: PERMISSION_IDS.UI_ROUTE_FAVORITES, label: "Favoris" },
      { value: PERMISSION_IDS.UI_ROUTE_BOOKINGS, label: "Reservations" },
      { value: PERMISSION_IDS.UI_ROUTE_MESSAGES, label: "Messages" },
      { value: PERMISSION_IDS.UI_ROUTE_NOTIFICATIONS, label: "Notifications" },
      { value: PERMISSION_IDS.UI_ROUTE_SETTINGS, label: "Parametres" },
      { value: PERMISSION_IDS.UI_ROUTE_PROPERTIES, label: "Gestion biens" },
      { value: PERMISSION_IDS.UI_ROUTE_AGENT_DASHBOARD, label: "Dashboard agent" },
      { value: PERMISSION_IDS.UI_ROUTE_AGENT_SCORING, label: "Scoring agent" },
      { value: PERMISSION_IDS.UI_ROUTE_AGENCY_DASHBOARD, label: "Dashboard agence" },
      { value: PERMISSION_IDS.UI_ROUTE_AGENCY_MEMBERS, label: "Membres agence" },
      { value: PERMISSION_IDS.UI_ROUTE_AGENCY_CALENDAR, label: "Calendrier agence" },
      { value: PERMISSION_IDS.UI_ROUTE_AGENCY_EXPENSES, label: "Depenses agence" }
    ]
  },
  {
    value: "ui.settings",
    label: "Sections Parametres",
    children: [
      { value: PERMISSION_IDS.UI_TAB_SETTINGS_PROFILE, label: "Profil" },
      { value: PERMISSION_IDS.UI_TAB_SETTINGS_ROLES, label: "Roles" },
      { value: PERMISSION_IDS.UI_TAB_SETTINGS_MEMBERS, label: "Agents" },
      { value: PERMISSION_IDS.UI_TAB_SETTINGS_AGENCY, label: "Agence" }
    ]
  },
  {
    value: "agency.management",
    label: "Gestion agence",
    children: [
      { value: PERMISSION_IDS.MEMBERS_READ, label: "Lire agents" },
      { value: PERMISSION_IDS.MEMBERS_INVITE, label: "Inviter agents" },
      { value: PERMISSION_IDS.MEMBERS_UPDATE, label: "Modifier agents" },
      { value: PERMISSION_IDS.MEMBERS_REMOVE, label: "Supprimer agents" },
      { value: PERMISSION_IDS.ROLES_READ, label: "Lire roles" },
      { value: PERMISSION_IDS.ROLES_CREATE, label: "Creer roles" },
      { value: PERMISSION_IDS.ROLES_UPDATE, label: "Modifier roles" },
      { value: PERMISSION_IDS.ROLES_DELETE, label: "Supprimer roles" },
      { value: PERMISSION_IDS.ROLES_DUPLICATE, label: "Dupliquer roles" },
      { value: PERMISSION_IDS.PERMISSIONS_ASSIGN, label: "Affecter permissions" }
    ]
  },
  {
    value: "agency.properties",
    label: "Gestion biens",
    children: [
      { value: PERMISSION_IDS.PROPERTIES_READ, label: "Lire biens" },
      { value: PERMISSION_IDS.PROPERTIES_CREATE, label: "Creer biens" },
      { value: PERMISSION_IDS.PROPERTIES_UPDATE, label: "Modifier biens" },
      { value: PERMISSION_IDS.PROPERTIES_DELETE, label: "Supprimer biens" },
      { value: PERMISSION_IDS.PROPERTIES_PUBLISH, label: "Publier biens" }
    ]
  },
  {
    value: "agency.operations",
    label: "Operations",
    children: [
      { value: PERMISSION_IDS.CALENDAR_READ, label: "Lire calendrier" },
      { value: PERMISSION_IDS.CALENDAR_CREATE, label: "Creer calendrier" },
      { value: PERMISSION_IDS.CALENDAR_UPDATE, label: "Modifier calendrier" },
      { value: PERMISSION_IDS.CALENDAR_DELETE, label: "Supprimer calendrier" },
      { value: PERMISSION_IDS.EXPENSES_READ, label: "Lire depenses" },
      { value: PERMISSION_IDS.EXPENSES_CREATE, label: "Creer depenses" },
      { value: PERMISSION_IDS.EXPENSES_UPDATE, label: "Modifier depenses" },
      { value: PERMISSION_IDS.EXPENSES_APPROVE, label: "Approuver depenses" },
      { value: PERMISSION_IDS.EXPENSES_DELETE, label: "Supprimer depenses" },
      { value: PERMISSION_IDS.STATS_READ, label: "Lire statistiques" },
      { value: PERMISSION_IDS.TEAM_PERFORMANCE_READ, label: "Lire performance equipe" },
      { value: PERMISSION_IDS.BOOKINGS_READ, label: "Lire reservations" },
      { value: PERMISSION_IDS.MESSAGES_READ, label: "Lire messages" },
      { value: PERMISSION_IDS.MESSAGES_ASSIGN, label: "Affecter messages" }
    ]
  }
];
