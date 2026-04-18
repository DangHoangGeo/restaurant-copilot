import { getSubdomainFromHost } from "@/lib/utils";

type SearchParamReader = {
  get(name: string): string | null;
};

export function getActiveBranchCode(params: {
  searchParams?: SearchParamReader | null;
  branchCode?: string | null;
  subdomain?: string | null;
}): string | null {
  return (
    params.searchParams?.get("branch") ??
    params.branchCode ??
    params.subdomain ??
    null
  );
}

export function getOrgIdentifierFromHost(
  host: string | null | undefined,
): string | null {
  if (!host) return null;
  return getSubdomainFromHost(host);
}

export function appendBranchContext(
  params: URLSearchParams,
  context: {
    branchCode?: string | null;
    orgIdentifier?: string | null;
  },
): URLSearchParams {
  if (context.branchCode && !params.get("branch")) {
    params.set("branch", context.branchCode);
  }

  if (context.orgIdentifier && context.branchCode && !params.get("org")) {
    params.set("org", context.orgIdentifier);
  }

  return params;
}

export function buildCustomerPath(params: {
  locale: string;
  path: string;
  branchCode?: string | null;
  orgIdentifier?: string | null;
  searchParams?: URLSearchParams;
}): string {
  const query = appendBranchContext(
    params.searchParams ?? new URLSearchParams(),
    {
      branchCode: params.branchCode,
      orgIdentifier: params.orgIdentifier,
    },
  );
  const queryString = query.toString();

  return `/${params.locale}/${params.path}${queryString ? `?${queryString}` : ""}`;
}
