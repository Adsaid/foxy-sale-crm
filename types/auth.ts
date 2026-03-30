export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "ADMIN" | "DEV" | "SALES";
  /** Відсутність поля трактується як APPROVED (застарілі сесії). */
  accountStatus?: "APPROVED" | "PENDING";
  specialization?: "FRONTEND" | "BACKEND" | "FULLSTACK" | null;
  badgeBgColor?: string | null;
  badgeTextColor?: string | null;
  technologies?: Technology[];
  createdAt: string;
}

export interface AuthResponse {
  user: AuthUser;
}

export interface Technology {
  id: string;
  name: string;
}

export interface DashboardUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  specialization?: string | null;
  technologies: Technology[];
  createdAt: string | Date;
}
