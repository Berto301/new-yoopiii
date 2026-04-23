import { env } from "../../config/env.js";

export const PROPERTY_THREE_D_STATUSES = {
  PENDING: "pending",
  PROCESSING: "processing",
  GENERATED: "generated",
  ERROR: "error"
};

const isUploadedPropertyAsset = (value) => typeof value === "string" && value.startsWith("/uploads/properties/");

const pushUniqueSource = (collection, seenUrls, candidate) => {
  const normalizedUrl = typeof candidate?.url === "string" ? candidate.url.trim() : "";

  if (!normalizedUrl || seenUrls.has(normalizedUrl)) {
    return;
  }

  seenUrls.add(normalizedUrl);
  collection.push({
    url: normalizedUrl,
    type: candidate.type || "image",
    origin: candidate.origin || "media"
  });
};

export const buildPropertyThreeDSourceMedia = (property) => {
  const selectedSources = [];
  const seenUrls = new Set();
  const mediaItems = Array.isArray(property?.media) ? property.media : [];

  mediaItems
    .filter((item) => item?.url && isUploadedPropertyAsset(item.url))
    .forEach((item) => {
      pushUniqueSource(selectedSources, seenUrls, {
        url: item.type === "video" ? item.thumbnailUrl || item.url : item.url,
        type: item.type === "video" ? "image" : item.type,
        origin: "uploaded_media"
      });
    });

  mediaItems
    .filter((item) => item?.type === "image" && item?.url)
    .forEach((item) => {
      pushUniqueSource(selectedSources, seenUrls, {
        url: item.url,
        type: "image",
        origin: "media"
      });
    });

  if (property?.coverImage) {
    pushUniqueSource(selectedSources, seenUrls, {
      url: property.coverImage,
      type: "image",
      origin: "cover"
    });
  }

  return selectedSources.slice(0, 18);
};

export const buildPropertyThreeDUrl = (property) => {
  const identifier = property?.slug || property?._id || property?.id;
  return new URL(`/properties/${identifier}/3d-tour`, env.clientUrl).toString();
};

export const resolvePropertyThreeDState = ({
  payload = {},
  existingProperty = null
}) => {
  const nextIs3DEnabled = payload.is3DEnabled ?? payload.has3DView ?? existingProperty?.is3DEnabled ?? existingProperty?.has3DView ?? false;

  if (!nextIs3DEnabled) {
    return {
      is3DEnabled: false,
      has3DView: false,
      threeDUrl: null,
      threeDStatus: null,
      threeDGeneratedAt: null,
      threeDSourceMedia: []
    };
  }

  const existingThreeDUrl = existingProperty?.threeDUrl ?? null;
  const nextThreeDUrl = payload.threeDUrl ?? existingThreeDUrl;
  const nextThreeDGeneratedAt = payload.threeDGeneratedAt ?? existingProperty?.threeDGeneratedAt ?? null;
  const nextThreeDSourceMedia = payload.threeDSourceMedia ?? existingProperty?.threeDSourceMedia ?? [];
  const nextThreeDStatus =
    payload.threeDStatus ??
    existingProperty?.threeDStatus ??
    (nextThreeDUrl ? PROPERTY_THREE_D_STATUSES.GENERATED : PROPERTY_THREE_D_STATUSES.PENDING);

  return {
    is3DEnabled: true,
    has3DView: true,
    threeDUrl: nextThreeDUrl,
    threeDStatus: nextThreeDStatus,
    threeDGeneratedAt: nextThreeDGeneratedAt,
    threeDSourceMedia: nextThreeDSourceMedia
  };
};
