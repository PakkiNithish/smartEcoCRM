export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color: string;
  is_won: boolean;
  is_lost: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  company_name?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  last_active_at?: string | null;
  dateLastActive?: string | null;
}

export interface FormFieldConfig {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "date" | "datetime" | "textarea" | "checkbox" | "section";
  required: boolean;
  enabled: boolean;
  is_custom: boolean;
  options?: string[];
  placeholder?: string;
}

export interface FormConfig {
  entity_type: string;
  company_name: string;
  fields_config: FormFieldConfig[];
}

export interface FormSection {
  id: string;
  title: string;
  fieldKeys: string[];
  isCustom?: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ContactDealSummary {
  id: string;
  title: string;
  amount: number | string;
  currency: string;
}

export interface ContactCompanySummary {
  id: string;
  name: string;
  industry?: string | null;
  company_type?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface LatestActivitySummary {
  id: string;
  type: string;
  subject: string;
  scheduled_at?: string | null;
  is_completed?: boolean;
}

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  job_title?: string | null;
  company_id?: string | null;
  user_id?: string | null;
  company_name?: string | null;
  stage?: string | null;
  custom_fields?: Record<string, any>;
  company?: ContactCompanySummary | null;
  user?: User | null;
  deals?: ContactDealSummary[];
  deals_count?: number;
  activities_count?: number;
  latest_activity?: LatestActivitySummary | null;
  created_at?: string;
  updated_at?: string;
}

export interface ContactCreateInput {
  first_name: string;
  last_name?: string;
  email?: string | null;
  phone?: string | null;
  job_title?: string | null;
  stage?: string | null;
  company_id?: string | null;
  company_name?: string | null;
  custom_fields?: Record<string, any>;
}

export interface ContactUpdateInput {
  first_name?: string;
  last_name?: string;
  email?: string | null;
  phone?: string | null;
  job_title?: string | null;
  stage?: string | null;
  company_id?: string | null;
  custom_fields?: Record<string, any>;
}

export interface ContactListResponse {
  items: Contact[];
  total: number;
  skip: number;
  limit: number;
}

export interface CompanyContactSummary {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  job_title?: string | null;
}

export interface CompanyDealSummary {
  id: string;
  title: string;
  amount: number | string;
  currency: string;
}

export interface Company {
  id: string;
  name: string;
  company_type?: string | null;
  industry?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  user_id?: string | null;
  company_name?: string | null;
  stage?: string | null;
  custom_fields?: Record<string, any>;
  contacts?: CompanyContactSummary[];
  deals?: CompanyDealSummary[];
  user?: User | null;
  contacts_count?: number;
  deals_count?: number;
  activities_count?: number;
  latest_activity?: LatestActivitySummary | null;
  created_at?: string;
  updated_at?: string;
}

export interface CompanyCreateInput {
  name: string;
  industry?: string | null;
  phone?: string | null;
  email?: string | null;
  website: string;
  address?: string | null;
  stage?: string | null;
  company_name?: string | null;
  custom_fields?: Record<string, any>;
}

export interface CompanyUpdateInput {
  name?: string;
  industry?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  stage?: string | null;
  custom_fields?: Record<string, any>;
}

export interface CompanyListResponse {
  items: Company[];
  total: number;
  skip: number;
  limit: number;
}

export interface Deal {
  id: string;
  title: string;
  amount: string | number;
  currency: string;
  stage_id: string;
  contact_id?: string | null;
  company_id?: string | null;
  responsible_user_id?: string | null;
  expected_close_date?: string | null;
  description?: string | null;
  company_name?: string | null;
  custom_fields?: Record<string, any>;
  created_at: string;
  updated_at: string;
  stage?: PipelineStage | null;
  contact?: Contact | null;
  company?: Company | null;
  responsible_user?: User | null;
}

export interface DealCreateInput {
  title: string;
  amount: number;
  currency: string;
  stage_id?: string | null;
  contact_id?: string | null;
  company_id?: string | null;
  responsible_user_id?: string | null;
  expected_close_date?: string | null;
  description?: string | null;
  company_name?: string | null;
  custom_fields?: Record<string, any>;
}

export interface DealUpdateInput {
  title?: string;
  amount?: number;
  currency?: string;
  stage_id?: string | null;
  contact_id?: string | null;
  company_id?: string | null;
  responsible_user_id?: string | null;
  expected_close_date?: string | null;
  description?: string | null;
}

export interface DealListResponse {
  items: Deal[];
  total: number;
  skip: number;
  limit: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled" | string;
  priority: "low" | "medium" | "high" | "urgent" | string;
  due_date?: string | null;
  deal_id?: string | null;
  contact_id?: string | null;
  company_id?: string | null;
  assigned_to_id?: string | null;
  created_by_id?: string | null;
  created_at: string;
  updated_at: string;
  custom_fields?: Record<string, any>;
  deal?: { id: string; title: string; amount: number | string; currency: string } | null;
  contact?: Contact | null;
  company?: Company | null;
  assigned_to?: User | null;
  created_by?: User | null;
}

export interface TaskCreateInput {
  title: string;
  description?: string | null;
  status?: string;
  priority?: string;
  due_date?: string | null;
  deal_id?: string | null;
  contact_id?: string | null;
  company_id?: string | null;
  assigned_to_id?: string | null;
  custom_fields?: Record<string, any>;
}

export interface TaskUpdateInput {
  title?: string;
  description?: string | null;
  status?: string;
  priority?: string;
  due_date?: string | null;
  deal_id?: string | null;
  contact_id?: string | null;
  company_id?: string | null;
  assigned_to_id?: string | null;
  custom_fields?: Record<string, any>;
}

export interface TaskListResponse {
  items: Task[];
  total: number;
  skip: number;
  limit: number;
}

export interface Activity {
  id: string;
  type: "call" | "meeting" | "email" | "note" | "follow_up" | string;
  subject: string;
  notes?: string | null;
  description?: string | null;
  scheduled_at?: string | null;
  activity_date?: string | null;
  is_completed: boolean;
  deal_id?: string | null;
  contact_id?: string | null;
  company_id?: string | null;
  user_id?: string | null;
  created_at: string;
  updated_at: string;
  custom_fields?: Record<string, any>;
  deal?: { id: string; title: string; amount: number | string; currency: string } | null;
  contact?: Contact | null;
  company?: Company | null;
  user?: User | null;
}

export interface ActivityCreateInput {
  type: string;
  subject: string;
  notes?: string | null;
  scheduled_at?: string | null;
  is_completed?: boolean;
  deal_id?: string | null;
  contact_id?: string | null;
  company_id?: string | null;
  user_id?: string | null;
  custom_fields?: Record<string, any>;
}

export interface ActivityUpdateInput {
  type?: string;
  subject?: string;
  notes?: string | null;
  scheduled_at?: string | null;
  is_completed?: boolean;
  deal_id?: string | null;
  contact_id?: string | null;
  company_id?: string | null;
  user_id?: string | null;
  custom_fields?: Record<string, any>;
}

export interface ActivityListResponse {
  items: Activity[];
  total: number;
  skip: number;
  limit: number;
}

export interface TaskMetrics {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  overdue: number;
  high_priority: number;
}

export interface ActivityMetrics {
  total: number;
  completed: number;
  pending: number;
  calls: number;
  meetings: number;
  emails: number;
  notes: number;
  follow_ups: number;
}

export interface DealSummaryMetrics {
  total: number;
  won: number;
  won_revenue: number;
  active: number;
  active_revenue: number;
  lost: number;
  lost_revenue: number;
  win_rate: number;
}

export interface NetworkMetrics {
  total_contacts: number;
  total_companies: number;
}

export interface EfficiencySnapshotMetrics {
  score: number;
  rating: string;
  completion_rate: number;
  on_time_rate: number;
  total_activities: number;
  deals_won: number;
  revenue_won: number;
}

export interface LeaderboardPreviewItem {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  efficiency_score: number;
  rating: string;
  tasks_completed: number;
  activities_total: number;
  deals_won: number;
  revenue_won: number;
}

export interface RecentDealSummary {
  id: string;
  title: string;
  amount: number;
  currency: string;
  stage_name?: string | null;
  stage_color?: string | null;
  is_won: boolean;
  is_lost: boolean;
  company_name?: string | null;
  contact_name?: string | null;
  created_at: string;
}

export interface DashboardMetricsResponse {
  tasks: TaskMetrics;
  activities: ActivityMetrics;
  deals?: DealSummaryMetrics;
  network?: NetworkMetrics;
  efficiency_snapshot?: EfficiencySnapshotMetrics;
  team_leaderboard?: LeaderboardPreviewItem[];
  upcoming_activities: Activity[];
  recent_activities: Activity[];
  follow_ups_due_soon: Task[];
  recent_deals?: RecentDealSummary[];
}

export interface UserSummaryItem {
  id: string;
  full_name: string;
  email: string;
  role: string;
  company_name?: string | null;
}

export interface TaskReportMetrics {
  total_assigned: number;
  completed: number;
  in_progress: number;
  pending: number;
  overdue: number;
  completed_on_time: number;
  completion_rate: number;
  on_time_rate: number;
}

export interface ActivityReportMetrics {
  total: number;
  completed: number;
  pending: number;
  completion_rate: number;
  calls: number;
  meetings: number;
  emails: number;
  notes: number;
  follow_ups: number;
}

export interface DealReportMetrics {
  total: number;
  won: number;
  won_amount: number;
  lost: number;
  lost_amount: number;
  active: number;
  active_amount: number;
  win_rate: number;
}

export interface CRMImpactReportMetrics {
  contacts_created: number;
  companies_created: number;
}

export interface TaskItemSummary {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityItemSummary {
  id: string;
  type: string;
  subject: string;
  is_completed: boolean;
  scheduled_at?: string | null;
  created_at: string;
}

export interface DealItemSummary {
  id: string;
  title: string;
  amount: number;
  currency: string;
  stage_name?: string | null;
  is_won: boolean;
  is_lost: boolean;
  created_at: string;
}

export interface UserEfficiencyReport {
  user: UserSummaryItem;
  period_start: string;
  period_end: string;
  efficiency_score: number;
  performance_rating: "Top Performer" | "High Efficiency" | "Good" | "Needs Improvement" | string;
  tasks: TaskReportMetrics;
  activities: ActivityReportMetrics;
  deals: DealReportMetrics;
  crm_impact: CRMImpactReportMetrics;
  recent_tasks: TaskItemSummary[];
  recent_activities: ActivityItemSummary[];
  recent_deals: DealItemSummary[];
}

export interface ReportResponse {
  period_start: string;
  period_end: string;
  is_admin: boolean;
  selected_user_id?: string | null;
  is_team_overview: boolean;
  total_team_members: number;
  team_average_efficiency: number;
  team_tasks_completed: number;
  team_activities_logged: number;
  team_deals_won: number;
  team_revenue_won: number;
  user_reports: UserEfficiencyReport[];
  report?: UserEfficiencyReport | null;
}
