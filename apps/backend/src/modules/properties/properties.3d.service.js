export const PROPERTY_THREE_D_STATUSES = {
  PENDING: "pending",
  PROCESSING: "processing",
  GENERATED: "generated",
  ERROR: "error"
};

export const resolvePropertyThreeDState = ({
  payload = {},
  existingProperty = null
}) => {
  const hasThreeDUrlPayload = Object.prototype.hasOwnProperty.call(payload, "threeDUrl");
  const requestedUrl = hasThreeDUrlPayload ? payload.threeDUrl : existingProperty?.threeDUrl ?? null;
  const nextThreeDUrl = typeof requestedUrl === "string" ? requestedUrl.trim() || null : requestedUrl || null;
  const explicitlyDisabled = payload.is3DEnabled === false || payload.has3DView === false;

  if (explicitlyDisabled || !nextThreeDUrl) {
    return {
      is3DEnabled: false,
      has3DView: false,
      threeDUrl: null,
      threeDStatus: null,
      threeDGeneratedAt: null,
      threeDSourceMedia: []
    };
  }

  return {
    is3DEnabled: true,
    has3DView: true,
    threeDUrl: nextThreeDUrl,
    threeDStatus: PROPERTY_THREE_D_STATUSES.GENERATED,
    threeDGeneratedAt: null,
    threeDSourceMedia: []
  };
};
