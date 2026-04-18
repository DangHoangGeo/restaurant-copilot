export interface CustomerHomepageCompany {
  id: string;
  name: string;
  slug: string | null;
  publicSubdomain: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  description_en: string | null;
  description_ja: string | null;
  description_vi: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
}

export interface CustomerHomepageBranch {
  id: string;
  name: string;
  subdomain: string;
  branchCode: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  openingHours: unknown;
  currency: string | null;
  tagline_en: string | null;
  tagline_ja: string | null;
  tagline_vi: string | null;
  description_en: string | null;
  description_ja: string | null;
  description_vi: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  isCurrent: boolean;
}

export interface CustomerHomepageOwner {
  id: string;
  name: string | null;
  email: string | null;
  photoUrl: string | null;
}

export interface CustomerHomepageGalleryImage {
  id: string;
  imageUrl: string;
  altText: string;
  caption: string | null;
  sortOrder: number;
  isHero: boolean;
}

export interface CustomerHomepageFeaturedItem {
  id: string;
  name_en: string;
  name_ja: string | null;
  name_vi: string | null;
  description_en: string | null;
  description_ja: string | null;
  description_vi: string | null;
  price: number;
  currency: string | null;
  imageUrl: string | null;
  categoryName_en: string | null;
  categoryName_ja: string | null;
  categoryName_vi: string | null;
  sourceType: "shared" | "branch";
  branchId: string | null;
  branchName: string | null;
  branchCode: string | null;
  branchSubdomain: string | null;
}

export interface CustomerHomepageData {
  source: "organization" | "branch";
  company: CustomerHomepageCompany;
  currentBranch: CustomerHomepageBranch;
  branches: CustomerHomepageBranch[];
  owners: CustomerHomepageOwner[];
  gallery: CustomerHomepageGalleryImage[];
  featuredItems: CustomerHomepageFeaturedItem[];
}
