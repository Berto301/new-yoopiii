export const isEmptyValue = (value) => value === undefined || value === null || value === "";

export const toArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  return isEmptyValue(value) ? [] : [value];
};
