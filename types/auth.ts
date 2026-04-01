export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "DEV" | "DESIGNER" | "SALES";
  teamId?: string | null;
  /** Відсутність поля трактується як APPROVED (застарілі сесії). */
  accountStatus?: "APPROVED" | "PENDING";
  teamStatus?: "APPROVED" | "PENDING";
  pendingApproval?: boolean;
  specialization?: "FRONTEND" | "BACKEND" | "FULLSTACK" | "UX_UI" | "UI" | "UX" | null;
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
  stackAudience?: "DEV" | "DESIGNER";
}

export interface DashboardUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  teamId?: string | null;
  specialization?: string | null;
  technologies: Technology[];
  createdAt: string | Date;
}
