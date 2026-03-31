export const isEmptyValue = (value) => value === undefined || value === null || value === "";

export const toArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  return isEmptyValue(value) ? [] : [value];
};

export const hasPermission = (permissions = [], permission) => {
  if (!permission) {
    return true;
  }

  return Array.isArray(permissions) && permissions.includes(permission);
};

export const hasAnyPermission = (permissions = [], requiredPermissions = []) =>
  requiredPermissions.some((permission) => hasPermission(permissions, permission));
