function desiredRoleToDbRole(desiredRole) {
  const normalized = String(desiredRole || '').trim().toLowerCase();
  if (normalized === 'expert') {
    return 'Verified Expert';
  }
  if (normalized === 'seller') {
    return 'General Vendor';
  }
  return null;
}

function desiredAdminRoleToDbRole(desiredRole) {
  const normalized = String(desiredRole || '').trim().toLowerCase();
  if (normalized === 'farmer') {
    return 'Farmer';
  }
  return desiredRoleToDbRole(normalized);
}

function isExpertRole(role) {
  return role === 'Verified Expert';
}

module.exports = {
  desiredRoleToDbRole,
  desiredAdminRoleToDbRole,
  isExpertRole,
};
