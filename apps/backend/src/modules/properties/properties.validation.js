import { z } from "zod";

const numberFromQuery = (fieldName) =>
  z.coerce.number({
    invalid_type_error: `${fieldName} must be a number`
  });

export const nearbyPropertiesSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    lat: numberFromQuery("lat").min(-90).max(90),
    lng: numberFromQuery("lng").min(-180).max(180),
    radiusKm: numberFromQuery("radiusKm").min(1).max(200).default(10),
    type: z
      .enum(["house", "land", "apartment", "commercial", "office", "warehouse"])
      .optional(),
    purpose: z.enum(["sale", "rent"]).optional(),
    status: z
      .enum(["draft", "published", "reserved", "sold", "rented", "archived"])
      .optional(),
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
