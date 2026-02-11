export type UserRole = "admin" | "instructor" | "student";

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
