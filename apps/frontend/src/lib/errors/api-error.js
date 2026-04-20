const DEFAULT_ERROR_TYPE = "error";

export const extractApiErrors = (error, fallbackMessage = "Une erreur est survenue.") => {
  const responseData = error?.response?.data || {};
  const responseErrors = Array.isArray(responseData.errors) ? responseData.errors : [];

  if (responseErrors.length) {
    return responseErrors.map((item, index) => ({
      order: Number(item.order || index + 1),
      type: item.type || responseData.type || DEFAULT_ERROR_TYPE,
      field: item.field || null,
      message: item.message || fallbackMessage
    }));
  }

  return [
    {
      order: 1,
      type: responseData.type || DEFAULT_ERROR_TYPE,
      field: responseData.field || null,
      message: responseData.message || error?.message || fallbackMessage
    }
  ];
};

export const notifyApiErrors = ({ error, showError, fallbackMessage = "Une erreur est survenue." }) => {
  const errors = extractApiErrors(error, fallbackMessage).sort((left, right) => left.order - right.order);

  errors.forEach((item, index) => {
    window.setTimeout(() => {
      showError(item.type, { message: item.message, field: item.field });
    }, index * 180);
  });

  return errors;
};

export const mapApiErrorsByField = (error, fallbackMessage = "Une erreur est survenue.") =>
  extractApiErrors(error, fallbackMessage).reduce((accumulator, item) => {
    if (item.field && !accumulator[item.field]) {
      accumulator[item.field] = item;
    }

    return accumulator;
  }, {});
