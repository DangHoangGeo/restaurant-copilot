export interface DiscoverOrg {
  id: string;
  name: string;
  logoUrl: string | null;
  brandColor: string | null;
  publicSubdomain: string | null;
}

export interface DiscoverBranch {
  id: string;
  name: string;
  subdomain: string;
  branchCode: string | null;
  address: string | null;
  province: string | null;
  district: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  tagline_en: string | null;
  tagline_ja: string | null;
  tagline_vi: string | null;
  description_en: string | null;
  description_ja: string | null;
  description_vi: string | null;
  currency: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  org: DiscoverOrg | null;
}

export interface DiscoverApiResponse {
  branches: DiscoverBranch[];
  provinces: string[];
  districts: string[];
}
