import { Property } from "../properties/property.model.js";
import { OwnerTenant } from "../owner/models/owner-tenant.model.js";
import { User } from "../users/user.model.js";
import { Agency } from "../agencies/agency.model.js";
import { listDiscoverableAgents } from "../users/agent-directory.service.js";
import { listAgencyDirectoryAgencies } from "../agencies/services/agency-directory.service.js";

const PUBLIC_PROPERTY_QUERY = {
  publicationStatus: "approved",
  status: { $in: ["published", "reserved", "sold", "rented"] }
};

const formatPersonName = (person) =>
  [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim() || person?.email || "Profil";

const mapLandingProperty = (property) => ({
  id: String(property._id),
  slug: property.slug,
  title: property.title,
  description: property.description || "",
  type: property.type,
  purpose: property.purpose,
  status: property.status,
  price: Number(property.price || 0),
  currency: property.currency || "USD",
  address: property.address || "",
  area: Number(property.area || 0),
  coverImage: property.coverImage || property.media?.[0]?.thumbnailUrl || property.media?.[0]?.url || null,
  agentName: formatPersonName(property.agentId),
  agencyName: property.agencyId?.name || "",
  mapMarker: {
    lat: Number(property.location?.coordinates?.[1] || 0),
    lng: Number(property.location?.coordinates?.[0] || 0)
  }
});

const buildPropertyMapItems = (properties = []) =>
  properties
    .map(mapLandingProperty)
    .filter((property) => Number.isFinite(property.mapMarker.lat) && Number.isFinite(property.mapMarker.lng));

const mapLandingTenant = (tenant) => ({
  id: String(tenant._id),
  fullName: tenant.fullName || [tenant.firstName, tenant.lastName].filter(Boolean).join(" ").trim() || "Locataire",
  avatar: tenant.linkedUserId?.avatar || null,
  propertyId: tenant.managedPropertyId?._id ? String(tenant.managedPropertyId._id) : null,
  propertyTitle: tenant.managedPropertyId?.title || "Bien non renseigne",
  propertyCoverImage: tenant.managedPropertyId?.coverImage || null,
  source: tenant.source || "manual"
});

export const getLandingOverview = async () => {
  const [
    propertiesCount,
    tenantsCount,
    ownersCount,
    agentsCount,
    agenciesCount,
    rentPropertiesCount,
    availablePropertiesCount,
    soldPropertiesCount,
    recentProperties,
    mapProperties,
    discoverableAgents,
    discoverableAgencies,
    recentTenants
  ] = await Promise.all([
    Property.countDocuments({}),
    OwnerTenant.countDocuments({}),
    User.countDocuments({ role: "proprietaire", status: "active" }),
    User.countDocuments({ role: { $in: ["agency_agent", "independent_agent"] }, status: "active" }),
    Agency.countDocuments({}),
    Property.countDocuments({ purpose: "rent" }),
    Property.countDocuments({ ...PUBLIC_PROPERTY_QUERY, status: "published" }),
    Property.countDocuments({ status: "sold" }),
    Property.find(PUBLIC_PROPERTY_QUERY)
      .populate("agentId", "firstName lastName email avatar")
      .populate("agencyId", "name logo")
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(6)
      .lean(),
    Property.find(PUBLIC_PROPERTY_QUERY)
      .populate("agentId", "firstName lastName email avatar")
      .populate("agencyId", "name logo")
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(100)
      .lean(),
    listDiscoverableAgents({ filters: { search: "", agencyType: "all", role: "all", page: 1, limit: 24 } }),
    listAgencyDirectoryAgencies({ filters: { search: "", status: "all", page: 1, limit: 6 } }),
    OwnerTenant.find({})
      .populate("linkedUserId", "avatar")
      .populate("managedPropertyId", "title coverImage")
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(6)
      .lean()
  ]);

  return {
    summary: {
      propertiesCount,
      tenantsCount,
      ownersCount,
      agentsCount,
      agenciesCount,
      rentPropertiesCount,
      availablePropertiesCount,
      soldPropertiesCount
    },
    recentProperties: recentProperties.map(mapLandingProperty),
    propertyMap: buildPropertyMapItems(mapProperties),
    agents: (discoverableAgents.items || [])
      .filter((agent) => agent.role !== "agency")
      .slice(0, 6)
      .map((agent) => ({
        id: agent.userId,
        fullName: [agent.firstName, agent.lastName].filter(Boolean).join(" ").trim() || agent.email || "Agent",
        avatar: agent.avatar || null,
        agencyName: agent.agencyName || agent.organizationLabel || "Independant",
        managedPropertiesCount: Number(agent.managedPropertiesCount || 0),
        role: agent.role,
        roleLabel: agent.roleLabel || agent.role
      })),
    agencies: (discoverableAgencies.items || []).map((agency) => ({
      id: agency.id,
      name: agency.name,
      logo: agency.logo || null,
      managedPropertiesCount: Number(agency.managedPropertiesCount || 0),
      activeAgentsCount: Number(agency.activeAgentsCount || 0),
      status: agency.status
    })),
    tenants: recentTenants.map(mapLandingTenant)
  };
};
