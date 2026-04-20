export function buildBranchPath(
  locale: string,
  branchId: string | null | undefined,
  suffix = ''
): string {
  const normalizedSuffix = suffix.replace(/^\/+/, '');
  const basePath = branchId
    ? `/${locale}/branch/${branchId}`
    : `/${locale}/branch`;

  return normalizedSuffix ? `${basePath}/${normalizedSuffix}` : basePath;
}

export function normalizeBranchPathname(
  pathname: string,
  locale: string,
  branchId: string | null | undefined
): string {
  const localizedPrefix = `/${locale}`;
  const withoutLocale = pathname.startsWith(localizedPrefix)
    ? pathname.slice(localizedPrefix.length)
    : pathname;

  if (!branchId) {
    return withoutLocale;
  }

  const dynamicPrefix = `/branch/${branchId}`;
  if (withoutLocale === dynamicPrefix) {
    return '/branch';
  }

  if (withoutLocale.startsWith(`${dynamicPrefix}/`)) {
    return `/branch/${withoutLocale.slice(dynamicPrefix.length + 1)}`;
  }

  return withoutLocale;
}
