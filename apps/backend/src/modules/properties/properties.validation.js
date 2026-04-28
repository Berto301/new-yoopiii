import { z } from "zod";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

const numberFromQuery = (fieldName) =>
  z.coerce.number({
    invalid_type_error: `${fieldName} must be a number`
  });

const propertyTypeSchema = z.enum(["house", "land", "apartment", "commercial", "office", "warehouse"]);
const propertyStatusSchema = z.enum(["draft", "published", "reserved", "sold", "rented", "archived"]);
const publicationStatusSchema = z.enum(["pending", "approved", "rejected"]);
const propertyPurposeSchema = z.enum(["sale", "rent"]);
const mediaTypeSchema = z.enum(["image", "video", "virtual_tour", "document"]);
const propertyAssetKindSchema = z.enum(["cover", "media"]);
const propertyUploadMediaTypeSchema = z.enum(["image", "video"]).optional();
const assetPathSchema = z
  .string()
  .trim()
  .refine((value) => value.startsWith("/") || /^https?:\/\//i.test(value), {
    message: "Asset must be a public URL or an uploaded file path"
  });

const propertyMediaSchema = z.object({
  type: mediaTypeSchema.default("image"),
  url: assetPathSchema,
  thumbnailUrl: assetPathSchema.nullable().optional(),
  order: z.coerce.number().min(0).default(0)
});

const propertyThreeDStatusSchema = z.enum(["pending", "processing", "generated", "error"]);

const propertyThreeDSourceSchema = z.object({
  url: assetPathSchema,
  type: z.enum(["image", "video"]).default("image"),
  origin: z.enum(["uploaded_media", "media", "cover"]).default("media")
});

const propertyPayloadSchema = z.object({
  managementContractId: objectIdSchema.nullish(),
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(10).max(5000),
  type: propertyTypeSchema,
  purpose: propertyPurposeSchema,
  price: z.coerce.number().min(0),
  currency: z.string().trim().min(2, "Currency must contain at least 2 characters").max(8, "Currency must contain at most 8 characters").transform((value) => value.toUpperCase()).default("USD"),
  area: z.coerce.number().min(0).default(0),
  rooms: z.coerce.number().min(0).default(0),
  bedrooms: z.coerce.number().min(0).default(0),
  bathrooms: z.coerce.number().min(0).default(0),
  features: z.array(z.string().trim().min(1)).default([]),
  address: z.string().trim().min(3).max(255),
  location: z.object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    placeId: z.string().trim().optional().nullable()
  }),
  coverImage: assetPathSchema.nullable().optional(),
  media: z.array(propertyMediaSchema).default([]),
  is3DEnabled: z.coerce.boolean().optional(),
  has3DView: z.coerce.boolean().default(false),
  threeDUrl: z.string().url().nullable().optional(),
  threeDStatus: propertyThreeDStatusSchema.nullable().optional(),
  threeDGeneratedAt: z.coerce.date().nullable().optional(),
  threeDSourceMedia: z.array(propertyThreeDSourceSchema).default([]),
  status: propertyStatusSchema.optional(),
  publicationStatus: publicationStatusSchema.optional()
});

const sharedPropertySearchQuerySchema = z.object({
  type: propertyTypeSchema.optional(),
  purpose: propertyPurposeSchema.optional(),
  status: propertyStatusSchema.optional(),
  minPrice: numberFromQuery("minPrice").min(0).optional(),
  maxPrice: numberFromQuery("maxPrice").min(0).optional(),
  bedrooms: numberFromQuery("bedrooms").min(0).optional(),
  bathrooms: numberFromQuery("bathrooms").min(0).optional(),
  minArea: numberFromQuery("minArea").min(0).optional(),
  maxArea: numberFromQuery("maxArea").min(0).optional(),
  limit: numberFromQuery("limit").min(1).max(100).default(20),
  page: numberFromQuery("page").min(1).default(1)
});

export const nearbyPropertiesSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: sharedPropertySearchQuerySchema.extend({
    lat: numberFromQuery("lat").min(-90).max(90),
    lng: numberFromQuery("lng").min(-180).max(180),
    radiusKm: numberFromQuery("radiusKm").min(1).max(200).default(10)
  })
});

export const boundedPropertiesSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: sharedPropertySearchQuerySchema
    .extend({
      northEastLat: numberFromQuery("northEastLat").min(-90).max(90),
      northEastLng: numberFromQuery("northEastLng").min(-180).max(180),
      southWestLat: numberFromQuery("southWestLat").min(-90).max(90),
      southWestLng: numberFromQuery("southWestLng").min(-180).max(180),
      lat: numberFromQuery("lat").min(-90).max(90).optional(),
      lng: numberFromQuery("lng").min(-180).max(180).optional()
    })
    .refine((query) => query.northEastLat >= query.southWestLat, {
      message: "northEastLat must be greater than or equal to southWestLat",
      path: ["northEastLat"]
    })
});

export const propertyIdParamsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    propertyId: objectIdSchema
  }),
  query: z.object({}).default({})
});

export const propertyPublicIdentifierSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    identifier: z.string().trim().min(1)
  }),
  query: z.object({}).default({})
});

export const propertyWorkflowSchema = z.object({
  body: z
    .object({
      status: propertyStatusSchema.optional(),
      publicationStatus: publicationStatusSchema.optional()
    })
    .refine((body) => body.status || body.publicationStatus, {
      message: "At least one workflow field is required"
    }),
  params: z.object({
    propertyId: objectIdSchema
  }),
  query: z.object({}).default({})
});

export const propertyHistoryCreateSchema = z.object({
  body: z.object({
    source: z.enum(["search", "map", "detail", "favorite", "share"]).optional()
  }),
  params: z.object({
    propertyId: objectIdSchema
  }),
  query: z.object({}).default({})
});

export const managedPropertiesSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    scope: z.enum(["own", "agency"]).optional(),
    publicationStatus: publicationStatusSchema.optional(),
    status: propertyStatusSchema.optional(),
    limit: numberFromQuery("limit").min(1).max(100).default(20),
    page: numberFromQuery("page").min(1).default(1)
  })
});

export const propertyCollectionSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    agentId: objectIdSchema.optional(),
    search: z.string().trim().min(1).max(120).optional(),
    location: z.string().trim().min(1).max(120).optional(),
    type: propertyTypeSchema.optional(),
    purpose: propertyPurposeSchema.optional(),
    status: propertyStatusSchema.optional(),
    minPrice: numberFromQuery("minPrice").min(0).optional(),
    maxPrice: numberFromQuery("maxPrice").min(0).optional(),
    bedrooms: numberFromQuery("bedrooms").min(0).optional(),
    bathrooms: numberFromQuery("bathrooms").min(0).optional(),
    minArea: numberFromQuery("minArea").min(0).optional(),
    maxArea: numberFromQuery("maxArea").min(0).optional(),
    limit: numberFromQuery("limit").min(1).max(100).default(20),
    page: numberFromQuery("page").min(1).default(1)
  })
});

export const createManagedPropertySchema = z.object({
  body: propertyPayloadSchema,
  params: z.object({}).default({}),
  query: z.object({}).default({})
});

export const updateManagedPropertySchema = z.object({
  body: propertyPayloadSchema.partial(),
  params: z.object({ propertyId: objectIdSchema }),
  query: z.object({}).default({})
});

export const duplicateManagedPropertySchema = z.object({
  body: z.object({ title: z.string().trim().min(3).max(180).optional() }).default({}),
  params: z.object({ propertyId: objectIdSchema }),
  query: z.object({}).default({})
});

export const propertyAssetUploadSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    assetKind: propertyAssetKindSchema
  }),
  query: z.object({
    mediaType: propertyUploadMediaTypeSchema
  })
});

export const propertyThreeDGenerationSchema = z.object({
  body: z.object({
    force: z.coerce.boolean().optional().default(false)
  }).default({}),
  params: z.object({
    propertyId: objectIdSchema
  }),
  query: z.object({}).default({})
});
