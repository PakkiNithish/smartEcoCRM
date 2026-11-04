import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict
from backend.app.schemas.activity import ActivityResponse
from backend.app.schemas.task import TaskResponse


class TaskMetrics(BaseModel):
    total: int = 0
    pending: int = 0
    in_progress: int = 0
    completed: int = 0
    cancelled: int = 0
    overdue: int = 0
    high_priority: int = 0


class ActivityMetrics(BaseModel):
    total: int = 0
    completed: int = 0
    pending: int = 0
    calls: int = 0
    meetings: int = 0
    emails: int = 0
    notes: int = 0
    follow_ups: int = 0


class DealSummaryMetrics(BaseModel):
    total: int = 0
    won: int = 0
    won_revenue: float = 0.0
    active: int = 0
    active_revenue: float = 0.0
    lost: int = 0
    lost_revenue: float = 0.0
    win_rate: float = 0.0


class NetworkMetrics(BaseModel):
    total_contacts: int = 0
    total_companies: int = 0


class EfficiencySnapshotMetrics(BaseModel):
    score: float = 0.0
    rating: str = "Good"
    completion_rate: float = 0.0
    on_time_rate: float = 0.0
    total_activities: int = 0
    deals_won: int = 0
    revenue_won: float = 0.0


class LeaderboardPreviewItem(BaseModel):
    user_id: uuid.UUID
    full_name: str
    email: str
    role: str
    efficiency_score: float = 0.0
    rating: str = "Good"
    tasks_completed: int = 0
    activities_total: int = 0
    deals_won: int = 0
    revenue_won: float = 0.0


class RecentDealSummary(BaseModel):
    id: uuid.UUID
    title: str
    amount: float
    currency: str
    stage_name: Optional[str] = None
    stage_color: Optional[str] = None
    is_won: bool = False
    is_lost: bool = False
    company_name: Optional[str] = None
    contact_name: Optional[str] = None
    created_at: datetime


class DashboardMetricsResponse(BaseModel):
    """Live multi-faceted CRM executive dashboard with tasks, activities, deals, reports snapshot, and network metrics."""
    tasks: TaskMetrics
    activities: ActivityMetrics
    deals: DealSummaryMetrics = DealSummaryMetrics()
    network: NetworkMetrics = NetworkMetrics()
    efficiency_snapshot: EfficiencySnapshotMetrics = EfficiencySnapshotMetrics()
    team_leaderboard: List[LeaderboardPreviewItem] = []
    upcoming_activities: List[ActivityResponse] = []
    recent_activities: List[ActivityResponse] = []
    follow_ups_due_soon: List[TaskResponse] = []
    recent_deals: List[RecentDealSummary] = []

    model_config = ConfigDict(from_attributes=True)
