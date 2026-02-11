import type { UserRole } from "./database";
export type { UserRole } from "./database";

export interface UserProfile {
  id: string;
  organizationId: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  phone: string | null;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserWithRoles extends UserProfile {
  roles: UserRole[];
}
