import { Property } from "./property.model.js";

const buildPropertySearchMatch = (filters) => {
  const query = {
    publicationStatus: "approved",
    status: filters.status || "published"
  };

  if (filters.type) query.type = filters.type;
  if (filters.purpose) query.purpose = filters.purpose;
  if (typeof filters.bedrooms === "number") query.bedrooms = { $gte: filters.bedrooms };
  if (typeof filters.bathrooms === "number") query.bathrooms = { $gte: filters.bathrooms };

  if (typeof filters.minPrice === "number" || typeof filters.maxPrice === "number") {
    query.price = {};
    if (typeof filters.minPrice === "number") query.price.$gte = filters.minPrice;
    if (typeof filters.maxPrice === "number") query.price.$lte = filters.maxPrice;
  }

  if (typeof filters.minArea === "number" || typeof filters.maxArea === "number") {
    query.area = {};
    if (typeof filters.minArea === "number") query.area.$gte = filters.minArea;
    if (typeof filters.maxArea === "number") query.area.$lte = filters.maxArea;
  }

  return query;
};

export const searchNearbyProperties = async (filters) => {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;
  const baseQuery = buildPropertySearchMatch(filters);
  const maxDistance = filters.radiusKm * 1000;

  const [items, totalResults] = await Promise.all([
    Property.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [filters.lng, filters.lat]
          },
          distanceField: "distanceInMeters",
          maxDistance,
          spherical: true,
          query: baseQuery
        }
      },
      {
        $addFields: {
          distanceInKm: {
            $round: [{ $divide: ["$distanceInMeters", 1000] }, 2]
          }
        }
      },
      {
        $project: {
          title: 1,
          slug: 1,
          type: 1,
          purpose: 1,
          price: 1,
          currency: 1,
          coverImage: 1,
          bedrooms: 1,
          bathrooms: 1,
          area: 1,
          address: 1,
          location: 1,
          has3DView: 1,
          status: 1,
          averageRating: 1,
          agentId: 1,
          agencyId: 1,
          distanceInMeters: 1,
          distanceInKm: 1,
          createdAt: 1
        }
      },
      { $sort: { distanceInMeters: 1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ]),
    Property.countDocuments({
      ...baseQuery,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [filters.lng, filters.lat]
          },
          $maxDistance: maxDistance
        }
      }
    })
  ]);

  return {
    items: items.map((property) => ({
      id: property._id,
      title: property.title,
      slug: property.slug,
      type: property.type,
      purpose: property.purpose,
      price: property.price,
      currency: property.currency,
      coverImage: property.coverImage,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      area: property.area,
      address: property.address,
      location: property.location,
      has3DView: property.has3DView,
      status: property.status,
      averageRating: property.averageRating,
      agentId: property.agentId,
      agencyId: property.agencyId,
      distanceInMeters: property.distanceInMeters,
      distanceInKm: property.distanceInKm
    })),
    map: {
      center: {
        lat: filters.lat,
        lng: filters.lng
      },
      radiusKm: filters.radiusKm
    },
    pagination: {
      page,
      limit,
      total: totalResults,
      hasNextPage: skip + items.length < totalResults
    },
    appliedFilters: {
      radiusKm: filters.radiusKm,
      type: filters.type || null,
      purpose: filters.purpose || null,
      status: filters.status || "published",
      minPrice: filters.minPrice ?? null,
      maxPrice: filters.maxPrice ?? null,
      bedrooms: filters.bedrooms ?? null,
      bathrooms: filters.bathrooms ?? null,
      minArea: filters.minArea ?? null,
      maxArea: filters.maxArea ?? null
    }
  };
};
