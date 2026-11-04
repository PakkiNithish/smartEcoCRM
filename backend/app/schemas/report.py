import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class UserSummaryItem(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    role: str
    company_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TaskReportMetrics(BaseModel):
    total_assigned: int = 0
    completed: int = 0
    in_progress: int = 0
    pending: int = 0
    overdue: int = 0
    completed_on_time: int = 0
    completion_rate: float = 0.0
    on_time_rate: float = 0.0


class ActivityReportMetrics(BaseModel):
    total: int = 0
    completed: int = 0
    pending: int = 0
    completion_rate: float = 0.0
    calls: int = 0
    meetings: int = 0
    emails: int = 0
    notes: int = 0
    follow_ups: int = 0


class DealReportMetrics(BaseModel):
    total: int = 0
    won: int = 0
    won_amount: float = 0.0
    lost: int = 0
    lost_amount: float = 0.0
    active: int = 0
    active_amount: float = 0.0
    win_rate: float = 0.0


class CRMImpactReportMetrics(BaseModel):
    contacts_created: int = 0
    companies_created: int = 0


class TaskItemSummary(BaseModel):
    id: uuid.UUID
    title: str
    status: str
    priority: str
    due_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class ActivityItemSummary(BaseModel):
    id: uuid.UUID
    type: str
    subject: str
    is_completed: bool
    scheduled_at: Optional[datetime] = None
    created_at: datetime


class DealItemSummary(BaseModel):
    id: uuid.UUID
    title: str
    amount: float
    currency: str
    stage_name: Optional[str] = None
    is_won: bool = False
    is_lost: bool = False
    created_at: datetime


class UserEfficiencyReport(BaseModel):
    user: UserSummaryItem
    period_start: str
    period_end: str
    efficiency_score: float = Field(..., description="Calculated efficiency score between 0 and 100")
    performance_rating: str = Field(..., description="Top Performer | High Efficiency | Good | Needs Improvement")
    tasks: TaskReportMetrics
    activities: ActivityReportMetrics
    deals: DealReportMetrics
    crm_impact: CRMImpactReportMetrics
    recent_tasks: List[TaskItemSummary] = []
    recent_activities: List[ActivityItemSummary] = []
    recent_deals: List[DealItemSummary] = []

    model_config = ConfigDict(from_attributes=True)


class ReportResponse(BaseModel):
    period_start: str
    period_end: str
    is_admin: bool
    selected_user_id: Optional[uuid.UUID] = None
    is_team_overview: bool = False
    total_team_members: int = 0
    team_average_efficiency: float = 0.0
    team_tasks_completed: int = 0
    team_activities_logged: int = 0
    team_deals_won: int = 0
    team_revenue_won: float = 0.0
    user_reports: List[UserEfficiencyReport] = []
    report: Optional[UserEfficiencyReport] = None

    model_config = ConfigDict(from_attributes=True)
