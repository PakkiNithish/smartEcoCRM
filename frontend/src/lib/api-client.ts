import {
  Activity,
  ActivityCreateInput,
  ActivityListResponse,
  ActivityUpdateInput,
  AuthResponse,
  Company,
  CompanyCreateInput,
  CompanyListResponse,
  CompanyUpdateInput,
  Contact,
  ContactCreateInput,
  ContactListResponse,
  ContactUpdateInput,
  DashboardMetricsResponse,
  Deal,
  DealCreateInput,
  DealListResponse,
  DealUpdateInput,
  FormConfig,
  FormFieldConfig,
  PipelineStage,
  ReportResponse,
  Task,
  TaskCreateInput,
  TaskListResponse,
  TaskUpdateInput,
  User,
} from "@/types/crm";

export function getApiBaseUrl(): string {
  // In the browser, always use relative path "" by default (unless explicitly overridden).
  // Relative paths route through the same origin (Nginx reverse proxy or Next.js rewrites),
  // which makes CORS errors architecturally impossible on ANY deployed domain or IP.
  if (typeof window !== "undefined") {
    if (process.env.NEXT_PUBLIC_API_URL) {
      const configured = process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
      // If deployed on HTTPS, avoid mixed-content blocking by falling back to relative proxy
      if (window.location.protocol === "https:" && configured.startsWith("http://")) {
        return "";
      }
      return configured;
    }
    return "";
  }

  // Server-side (Node.js SSR)
  return (
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://backend:8000"
  ).replace(/\/+$/, "");
}

let memoryToken: string | null = null;

export function setAuthToken(token: string | null) {
  memoryToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("access_token", token);
      document.cookie = `access_token=${token}; path=/; max-age=604800; SameSite=Lax`;
    } else {
      localStorage.removeItem("access_token");
      document.cookie = "access_token=; path=/; max-age=0; SameSite=Lax";
    }
  }
}

export function getAuthToken(): string | null {
  if (memoryToken) return memoryToken;
  if (typeof window !== "undefined") {
    memoryToken = localStorage.getItem("access_token");
    return memoryToken;
  }
  return null;
}

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path}`;
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      credentials: "include",
      ...options,
      headers,
    });

    if (res.status === 204) {
      return null as T;
    }

    let data: any;
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    if (!res.ok) {
      if (res.status === 401) {
        setAuthToken(null);
        if (
          typeof window !== "undefined" &&
          !window.location.pathname.startsWith("/login")
        ) {
          const returnUrl = encodeURIComponent(window.location.pathname);
          window.location.href = `/login?redirect=${returnUrl}`;
        }
      }

      let message = `Request failed with status ${res.status}`;
      if (data && typeof data === "object") {
        if (typeof data.detail === "string") {
          message = data.detail;
        } else if (Array.isArray(data.detail)) {
          message = data.detail
            .map((e: any) => e.msg || JSON.stringify(e))
            .join(", ");
        }
      }
      throw new ApiError(res.status, message);
    }

    return data as T;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      0,
      err.message || "Network error. Please verify the backend is running."
    );
  }
}

export const api = {
  // Pipeline Stages
  async getPipelineStages(): Promise<PipelineStage[]> {
    return request<PipelineStage[]>("/api/v1/pipeline-stages");
  },

  // Deals
  async getDeals(params: {
    skip?: number;
    limit?: number;
    search?: string;
    stage_id?: string;
    company_id?: string;
    contact_id?: string;
  } = {}): Promise<DealListResponse> {
    const query = new URLSearchParams();
    if (params.skip !== undefined) query.set("skip", params.skip.toString());
    if (params.limit !== undefined) query.set("limit", params.limit.toString());
    if (params.search && params.search.trim()) query.set("search", params.search.trim());
    if (params.stage_id) query.set("stage_id", params.stage_id);
    if (params.company_id) query.set("company_id", params.company_id);
    if (params.contact_id) query.set("contact_id", params.contact_id);

    const queryString = query.toString();
    const endpoint = `/api/v1/deals${queryString ? `?${queryString}` : ""}`;
    return request<DealListResponse>(endpoint);
  },

  async getDeal(id: string): Promise<Deal> {
    return request<Deal>(`/api/v1/deals/${id}`);
  },

  async createDeal(deal: DealCreateInput): Promise<Deal> {
    return request<Deal>("/api/v1/deals", {
      method: "POST",
      body: JSON.stringify(deal),
    });
  },

  async updateDeal(id: string, deal: DealUpdateInput): Promise<Deal> {
    return request<Deal>(`/api/v1/deals/${id}`, {
      method: "PATCH",
      body: JSON.stringify(deal),
    });
  },

  async deleteDeal(id: string): Promise<void> {
    return request<void>(`/api/v1/deals/${id}`, {
      method: "DELETE",
    });
  },

  async bulkCreateDeals(items: DealCreateInput[]): Promise<{ created_count: number; items: Deal[] }> {
    return request<{ created_count: number; items: Deal[] }>("/api/v1/deals/bulk", {
      method: "POST",
      body: JSON.stringify({ items }),
    });
  },

  async bulkDeleteDeals(ids: string[]): Promise<{ deleted_count: number; message: string }> {
    return request<{ deleted_count: number; message: string }>("/api/v1/deals/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  },

  // Contacts
  async getContacts(params: {
    skip?: number;
    limit?: number;
    search?: string;
    company_id?: string;
    sort_field?: string;
    sort_order?: "asc" | "desc";
  } = {}): Promise<ContactListResponse> {
    const query = new URLSearchParams();
    if (params.skip !== undefined) query.set("skip", params.skip.toString());
    if (params.limit !== undefined) query.set("limit", params.limit.toString());
    if (params.search && params.search.trim()) query.set("search", params.search.trim());
    if (params.company_id) query.set("company_id", params.company_id);
    if (params.sort_field) query.set("sort_field", params.sort_field);
    if (params.sort_order) query.set("sort_order", params.sort_order);

    const queryString = query.toString();
    const endpoint = `/api/v1/contacts${queryString ? `?${queryString}` : ""}`;
    return request<ContactListResponse>(endpoint);
  },

  async getContact(id: string): Promise<Contact> {
    return request<Contact>(`/api/v1/contacts/${id}`);
  },

  async createContact(data: ContactCreateInput): Promise<Contact> {
    return request<Contact>("/api/v1/contacts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async bulkCreateContacts(items: ContactCreateInput[]): Promise<{ created_count: number; items: Contact[] }> {
    return request<{ created_count: number; items: Contact[] }>("/api/v1/contacts/bulk", {
      method: "POST",
      body: JSON.stringify({ items }),
    });
  },

  async updateContact(id: string, data: ContactUpdateInput): Promise<Contact> {
    return request<Contact>(`/api/v1/contacts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteContact(id: string): Promise<void> {
    return request<void>(`/api/v1/contacts/${id}`, {
      method: "DELETE",
    });
  },

  async bulkDeleteContacts(ids: string[]): Promise<{ deleted_count: number; message: string }> {
    return request<{ deleted_count: number; message: string }>("/api/v1/contacts/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  },

  // Companies
  async getCompanies(params: {
    skip?: number;
    limit?: number;
    search?: string;
    sort_field?: string;
    sort_order?: "asc" | "desc";
  } = {}): Promise<CompanyListResponse> {
    const query = new URLSearchParams();
    if (params.skip !== undefined) query.set("skip", params.skip.toString());
    if (params.limit !== undefined) query.set("limit", params.limit.toString());
    if (params.search && params.search.trim()) query.set("search", params.search.trim());
    if (params.sort_field) query.set("sort_field", params.sort_field);
    if (params.sort_order) query.set("sort_order", params.sort_order);

    const queryString = query.toString();
    const endpoint = `/api/v1/companies${queryString ? `?${queryString}` : ""}`;
    return request<CompanyListResponse>(endpoint);
  },

  async getCompany(id: string): Promise<Company> {
    return request<Company>(`/api/v1/companies/${id}`);
  },

  async createCompany(data: CompanyCreateInput): Promise<Company> {
    return request<Company>("/api/v1/companies", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async bulkCreateCompanies(items: CompanyCreateInput[]): Promise<{ created_count: number; items: Company[] }> {
    return request<{ created_count: number; items: Company[] }>("/api/v1/companies/bulk", {
      method: "POST",
      body: JSON.stringify({ items }),
    });
  },

  async updateCompany(id: string, data: CompanyUpdateInput): Promise<Company> {
    return request<Company>(`/api/v1/companies/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteCompany(id: string): Promise<void> {
    return request<void>(`/api/v1/companies/${id}`, {
      method: "DELETE",
    });
  },

  async bulkDeleteCompanies(ids: string[]): Promise<{ deleted_count: number; message: string }> {
    return request<{ deleted_count: number; message: string }>("/api/v1/companies/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  },

  // Tasks
  async getTasks(params: {
    skip?: number;
    limit?: number;
    search?: string;
    status?: string;
    priority?: string;
    assigned_to_id?: string;
    deal_id?: string;
    contact_id?: string;
    company_id?: string;
  } = {}): Promise<TaskListResponse> {
    const query = new URLSearchParams();
    if (params.skip !== undefined) query.set("skip", params.skip.toString());
    if (params.limit !== undefined) query.set("limit", params.limit.toString());
    if (params.search && params.search.trim()) query.set("search", params.search.trim());
    if (params.status) query.set("status", params.status);
    if (params.priority) query.set("priority", params.priority);
    if (params.assigned_to_id) query.set("assigned_to_id", params.assigned_to_id);
    if (params.deal_id) query.set("deal_id", params.deal_id);
    if (params.contact_id) query.set("contact_id", params.contact_id);
    if (params.company_id) query.set("company_id", params.company_id);

    const queryString = query.toString();
    const endpoint = `/api/v1/tasks${queryString ? `?${queryString}` : ""}`;
    return request<TaskListResponse>(endpoint);
  },

  async getTask(id: string): Promise<Task> {
    return request<Task>(`/api/v1/tasks/${id}`);
  },

  async createTask(data: TaskCreateInput): Promise<Task> {
    return request<Task>("/api/v1/tasks", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateTask(id: string, data: TaskUpdateInput): Promise<Task> {
    return request<Task>(`/api/v1/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteTask(id: string): Promise<void> {
    return request<void>(`/api/v1/tasks/${id}`, {
      method: "DELETE",
    });
  },

  // Activities
  async getActivities(params: {
    skip?: number;
    limit?: number;
    search?: string;
    type?: string;
    activity_type?: string;
    is_completed?: boolean;
    deal_id?: string;
    contact_id?: string;
    company_id?: string;
    user_id?: string;
  } = {}): Promise<ActivityListResponse> {
    const query = new URLSearchParams();
    if (params.skip !== undefined) query.set("skip", params.skip.toString());
    if (params.limit !== undefined) query.set("limit", params.limit.toString());
    if (params.search && params.search.trim()) query.set("search", params.search.trim());
    const typeVal = params.type || params.activity_type;
    if (typeVal) query.set("type", typeVal);
    if (params.is_completed !== undefined) query.set("is_completed", params.is_completed.toString());
    if (params.deal_id) query.set("deal_id", params.deal_id);
    if (params.contact_id) query.set("contact_id", params.contact_id);
    if (params.company_id) query.set("company_id", params.company_id);
    if (params.user_id) query.set("user_id", params.user_id);

    const queryString = query.toString();
    const endpoint = `/api/v1/activities${queryString ? `?${queryString}` : ""}`;
    return request<ActivityListResponse>(endpoint);
  },

  async getActivity(id: string): Promise<Activity> {
    return request<Activity>(`/api/v1/activities/${id}`);
  },

  async createActivity(data: ActivityCreateInput): Promise<Activity> {
    return request<Activity>("/api/v1/activities", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateActivity(id: string, data: ActivityUpdateInput): Promise<Activity> {
    return request<Activity>(`/api/v1/activities/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteActivity(id: string): Promise<void> {
    return request<void>(`/api/v1/activities/${id}`, {
      method: "DELETE",
    });
  },

  // Dashboard
  async getDashboardMetrics(): Promise<DashboardMetricsResponse> {
    return request<DashboardMetricsResponse>("/api/v1/dashboard/metrics");
  },

  // Users
  async getUsers(): Promise<User[]> {
    return request<User[]>("/api/v1/users");
  },

  // Authentication
  async register(
    email: string,
    full_name: string,
    password: string,
    company_name?: string
  ): Promise<AuthResponse> {
    const res = await request<AuthResponse>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, full_name, password, company_name: company_name || undefined }),
    });
    if (res?.access_token) {
      setAuthToken(res.access_token);
    }
    return res;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await request<AuthResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (res?.access_token) {
      setAuthToken(res.access_token);
    }
    return res;
  },

  async logout(): Promise<{ message: string }> {
    try {
      await request<{ message: string }>("/api/v1/auth/logout", {
        method: "POST",
      });
    } catch {
      // Ignored if network fails on logout
    } finally {
      setAuthToken(null);
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return { message: "Successfully logged out" };
  },

  async getCurrentUser(): Promise<User> {
    const token = getAuthToken();
    if (!token && typeof window !== "undefined") {
      throw new ApiError(401, "Not authenticated");
    }
    return request<User>("/api/v1/auth/me");
  },

  async updateCurrentUserProfile(data: {
    full_name?: string;
    email?: string;
    company_name?: string;
    current_password?: string;
    new_password?: string;
  }): Promise<User> {
    return request<User>("/api/v1/auth/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  // Admin User Management
  async getCompanyUsers(): Promise<User[]> {
    return request<User[]>("/api/v1/admin/users");
  },

  async createCompanyUser(data: {
    email: string;
    full_name: string;
    password: string;
    role?: string;
  }): Promise<User> {
    return request<User>("/api/v1/admin/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateCompanyUser(
    userId: string,
    data: { is_active?: boolean; role?: string; password?: string }
  ): Promise<User> {
    return request<User>(`/api/v1/admin/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteCompanyUser(userId: string): Promise<void> {
    return request<void>(`/api/v1/admin/users/${userId}`, {
      method: "DELETE",
    });
  },

  // Form Configuration & Custom Fields
  async getFormConfig(entityType: string): Promise<FormConfig> {
    return request<FormConfig>(`/api/v1/forms/${entityType}`);
  },

  async updateFormConfig(
    entityType: string,
    fields_config: FormFieldConfig[]
  ): Promise<FormConfig> {
    return request<FormConfig>(`/api/v1/forms/${entityType}`, {
      method: "PUT",
      body: JSON.stringify({ fields_config }),
    });
  },

  // User Lookups
  async getUsersLookup(): Promise<User[]> {
    return request<User[]>("/api/v1/users");
  },

  // Performance & Efficiency Reports
  async getEfficiencyReport(params?: {
    start_date?: string;
    end_date?: string;
    user_id?: string;
    stage?: string | string[];
  }): Promise<ReportResponse> {
    const query = new URLSearchParams();
    if (params?.start_date) query.set("start_date", params.start_date);
    if (params?.end_date) query.set("end_date", params.end_date);
    if (params?.user_id) query.set("user_id", params.user_id);
    if (params?.stage) {
      const stageVal = Array.isArray(params.stage) ? params.stage.filter(Boolean).join(",") : params.stage;
      if (stageVal.trim()) query.set("stage", stageVal.trim());
    }
    const qs = query.toString();
    return request<ReportResponse>(`/api/v1/reports/efficiency${qs ? `?${qs}` : ""}`);
  },

  getReportExportUrl(params?: {
    start_date?: string;
    end_date?: string;
    user_id?: string;
    stage?: string | string[];
  }): string {
    const baseUrl = getApiBaseUrl();
    const query = new URLSearchParams();
    if (params?.start_date) query.set("start_date", params.start_date);
    if (params?.end_date) query.set("end_date", params.end_date);
    if (params?.user_id) query.set("user_id", params.user_id);
    if (params?.stage) {
      const stageVal = Array.isArray(params.stage) ? params.stage.filter(Boolean).join(",") : params.stage;
      if (stageVal.trim()) query.set("stage", stageVal.trim());
    }
    query.set("format", "csv");
    return `${baseUrl}/api/v1/reports/export?${query.toString()}`;
  },

  async downloadReportCsv(params?: {
    start_date?: string;
    end_date?: string;
    user_id?: string;
    stage?: string | string[];
  }): Promise<void> {
    const query = new URLSearchParams();
    if (params?.start_date) query.set("start_date", params.start_date);
    if (params?.end_date) query.set("end_date", params.end_date);
    if (params?.user_id) query.set("user_id", params.user_id);
    if (params?.stage) {
      const stageVal = Array.isArray(params.stage) ? params.stage.filter(Boolean).join(",") : params.stage;
      if (stageVal.trim()) query.set("stage", stageVal.trim());
    }
    query.set("format", "csv");

    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const url = `${getApiBaseUrl()}/api/v1/reports/export?${query.toString()}`;
    const res = await fetch(url, { headers, credentials: "include" });
    if (!res.ok) {
      throw new ApiError(res.status, "Failed to download CSV report");
    }
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `crm_efficiency_report_${params?.start_date || "from"}_to_${params?.end_date || "today"}${params?.stage ? `_${params.stage}` : ""}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  },
};
