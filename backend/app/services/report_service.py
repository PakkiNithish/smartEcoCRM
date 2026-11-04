import csv
from datetime import date, datetime, time, timedelta, timezone
import io
from typing import List, Optional, Tuple, Union
import uuid
from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.models.activity import Activity
from backend.app.models.company import Company
from backend.app.models.contact import Contact
from backend.app.models.deal import Deal
from backend.app.models.pipeline_stage import PipelineStage
from backend.app.models.task import Task
from backend.app.models.user import User
from backend.app.schemas.report import (
    ActivityItemSummary,
    ActivityReportMetrics,
    CRMImpactReportMetrics,
    DealItemSummary,
    DealReportMetrics,
    ReportResponse,
    TaskItemSummary,
    TaskReportMetrics,
    UserEfficiencyReport,
    UserSummaryItem,
)


def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def parse_report_stage_filter(stage: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    """
    Parse stage string into (category, subcategory).
    Category is one of: 'activity', 'task', 'deal', 'company', 'contact', None.
    Subcategory is specific filter or 'all' for main category.
    """
    if not stage or not stage.strip():
        return None, None
    raw = stage.strip()
    norm = raw.lower()

    # 1. Main categories directly
    if norm in ["activity", "activities", "activity:all", "all_activities"]:
        return "activity", "all"
    if norm in ["task", "tasks", "task:all", "all_tasks"]:
        return "task", "all"
    if norm in ["deal", "deals", "deal:all", "all_deals"]:
        return "deal", "all"
    if norm in ["company", "companies", "company:all", "all_companies"]:
        return "company", "all"
    if norm in ["contact", "contacts", "contact:all", "all_contacts"]:
        return "contact", "all"

    # 2. Prefixes
    if norm.startswith("activity:") or norm.startswith("activity_"):
        sub = norm[len("activity:"):] if norm.startswith("activity:") else norm[len("activity_"):]
        sub = sub.strip()
        return "activity", "all" if sub in ["", "all"] else sub

    if norm.startswith("task:") or norm.startswith("task_"):
        sub = norm[len("task:"):] if norm.startswith("task:") else norm[len("task_"):]
        sub = sub.strip()
        return "task", "all" if sub in ["", "all"] else sub

    if norm.startswith("deal:") or norm.startswith("deal_"):
        sub = norm[len("deal:"):] if norm.startswith("deal:") else norm[len("deal_"):]
        if sub.startswith("stage:"):
            sub = sub[len("stage:"):]
        elif sub.startswith("stage_"):
            sub = sub[len("stage_"):]
        sub = sub.strip()
        return "deal", "all" if sub in ["", "all"] else sub

    if norm.startswith("company:") or norm.startswith("company_"):
        sub = raw[len("company:"):] if norm.startswith("company:") else raw[len("company_"):]
        sub = sub.strip().replace("_", " ")
        return "company", "all" if sub.lower() in ["", "all"] else sub

    if norm.startswith("contact:") or norm.startswith("contact_"):
        sub = raw[len("contact:"):] if norm.startswith("contact:") else raw[len("contact_"):]
        sub = sub.strip().replace("_", " ")
        return "contact", "all" if sub.lower() in ["", "all"] else sub

    # 3. Backward compatibility / legacy matches
    if norm in ["call", "meeting", "email", "note", "follow_up"]:
        return "activity", norm
    if norm in ["pending", "in_progress", "completed", "overdue"]:
        return "task", norm
    if norm in ["won", "lost"]:
        return "deal", norm

    # Fallback to deal stage name
    return "deal", norm


def parse_multiple_stage_filters(stage: Optional[Union[str, List[str]]]) -> List[Tuple[str, str]]:
    """
    Parse a stage filter input (single string, comma-separated string, or list of strings)
    into a list of (category, subcategory) tuples.
    Returns empty list if no valid filters or if 'all categories' is selected.
    """
    if not stage:
        return []
    raw_items: List[str] = []
    if isinstance(stage, list):
        for item in stage:
            if isinstance(item, str):
                raw_items.extend([s.strip() for s in item.split(",") if s.strip()])
    elif isinstance(stage, str):
        raw_items = [s.strip() for s in stage.split(",") if s.strip()]

    parsed: List[Tuple[str, str]] = []
    for item in raw_items:
        cat, sub = parse_report_stage_filter(item)
        if cat and sub:
            parsed.append((cat, sub))
    return parsed


class ReportService:
    @staticmethod
    def parse_date_range(
        start_date_str: Optional[str] = None,
        end_date_str: Optional[str] = None,
    ) -> Tuple[datetime, datetime, str, str]:
        """Parse or calculate standard timezone-aware UTC date boundaries."""
        now = datetime.now(timezone.utc)
        
        if end_date_str:
            try:
                parsed_end = date.fromisoformat(end_date_str.strip()[:10])
                end_dt = datetime.combine(parsed_end, time.max).replace(tzinfo=timezone.utc)
            except ValueError:
                end_dt = now
        else:
            end_dt = now

        if start_date_str:
            try:
                parsed_start = date.fromisoformat(start_date_str.strip()[:10])
                start_dt = datetime.combine(parsed_start, time.min).replace(tzinfo=timezone.utc)
            except ValueError:
                start_dt = end_dt - timedelta(days=30)
        else:
            start_dt = end_dt - timedelta(days=30)

        if start_dt > end_dt:
            end_dt = datetime.combine(start_dt.date(), time.max).replace(tzinfo=timezone.utc)

        return start_dt, end_dt, start_dt.strftime("%Y-%m-%d"), end_dt.strftime("%Y-%m-%d")

    @classmethod
    async def generate_user_report(
        cls,
        db: AsyncSession,
        user: User,
        start_dt: datetime,
        end_dt: datetime,
        start_str: str,
        end_str: str,
        stage: Optional[Union[str, List[str]]] = None,
        company_name: Optional[str] = None,
        is_workspace: bool = False,
    ) -> UserEfficiencyReport:
        """Calculate comprehensive efficiency and performance metrics for an individual user or workspace."""
        now = datetime.now(timezone.utc)
        parsed_filters = parse_multiple_stage_filters(stage)
        categories_selected = {cat for cat, sub in parsed_filters}

        # 1. Fetch relevant Tasks
        if is_workspace and company_name:
            task_conditions = [Task.company_name == company_name]
        else:
            user_task_cond = or_(Task.assigned_to_id == user.id, Task.created_by_id == user.id)
            if company_name:
                task_conditions = [user_task_cond, Task.company_name == company_name]
            else:
                task_conditions = [Task.assigned_to_id == user.id]

        task_conditions.append(
            or_(
                Task.created_at.between(start_dt, end_dt),
                Task.updated_at.between(start_dt, end_dt),
                Task.due_date.between(start_dt, end_dt),
                and_(Task.status.in_(["pending", "in_progress"]), Task.created_at <= end_dt),
            )
        )

        if categories_selected:
            if "task" not in categories_selected:
                task_conditions.append(Task.id.is_(None))
            else:
                task_subs = {sub for cat, sub in parsed_filters if cat == "task"}
                if "all" not in task_subs:
                    task_sub_conditions = []
                    for sub in task_subs:
                        if sub == "overdue":
                            task_sub_conditions.append(and_(Task.status.in_(["pending", "in_progress"]), Task.due_date < now))
                        elif sub in ["pending", "in_progress", "completed"]:
                            task_sub_conditions.append(Task.status == sub)
                        else:
                            task_sub_conditions.append(Task.status.ilike(f"%{sub}%"))
                    if task_sub_conditions:
                        task_conditions.append(or_(*task_sub_conditions))

        task_stmt = select(Task).where(*task_conditions).order_by(Task.updated_at.desc())
        task_res = await db.execute(task_stmt)
        user_tasks = list(task_res.scalars().all())

        total_tasks = len(user_tasks)
        completed_tasks = [t for t in user_tasks if t.status == "completed"]
        in_progress_tasks = [t for t in user_tasks if t.status == "in_progress"]
        pending_tasks = [t for t in user_tasks if t.status == "pending"]
        
        # Overdue: pending or in_progress with due_date in the past
        overdue_tasks = [
            t for t in user_tasks
            if t.status in ["pending", "in_progress"] and ensure_utc(t.due_date) is not None and ensure_utc(t.due_date) < now
        ]

        # Completed on-time: completed and (no due date or updated_at <= due_date + grace period of 1 hour)
        completed_on_time = []
        for t in completed_tasks:
            due_dt = ensure_utc(t.due_date)
            upd_dt = ensure_utc(t.updated_at)
            if due_dt is None or (upd_dt and upd_dt <= (due_dt + timedelta(hours=1))):
                completed_on_time.append(t)

        task_completion_rate = round((len(completed_tasks) / total_tasks * 100), 1) if total_tasks > 0 else (100.0 if len(completed_tasks) > 0 else 0.0)
        task_on_time_rate = round((len(completed_on_time) / len(completed_tasks) * 100), 1) if len(completed_tasks) > 0 else (100.0 if total_tasks == 0 else 0.0)

        task_metrics = TaskReportMetrics(
            total_assigned=total_tasks,
            completed=len(completed_tasks),
            in_progress=len(in_progress_tasks),
            pending=len(pending_tasks),
            overdue=len(overdue_tasks),
            completed_on_time=len(completed_on_time),
            completion_rate=task_completion_rate,
            on_time_rate=task_on_time_rate,
        )

        # 2. Fetch relevant Activities
        if is_workspace and company_name:
            act_conditions = [Activity.company_name == company_name]
        else:
            if company_name:
                act_conditions = [Activity.user_id == user.id, Activity.company_name == company_name]
            else:
                act_conditions = [Activity.user_id == user.id]

        act_conditions.append(
            or_(
                Activity.created_at.between(start_dt, end_dt),
                Activity.scheduled_at.between(start_dt, end_dt),
                Activity.updated_at.between(start_dt, end_dt),
            )
        )

        if categories_selected:
            if "activity" not in categories_selected:
                act_conditions.append(Activity.id.is_(None))
            else:
                act_subs = {sub for cat, sub in parsed_filters if cat == "activity"}
                if "all" not in act_subs:
                    act_conditions.append(Activity.type.in_(list(act_subs)))

        activity_stmt = select(Activity).where(*act_conditions).order_by(Activity.created_at.desc())
        activity_res = await db.execute(activity_stmt)
        user_activities = list(activity_res.scalars().all())

        total_activities = len(user_activities)
        completed_activities = [a for a in user_activities if a.is_completed]
        pending_activities = [a for a in user_activities if not a.is_completed]

        calls = sum(1 for a in user_activities if a.type == "call")
        meetings = sum(1 for a in user_activities if a.type == "meeting")
        emails = sum(1 for a in user_activities if a.type == "email")
        notes = sum(1 for a in user_activities if a.type == "note")
        follow_ups = sum(1 for a in user_activities if a.type == "follow_up")

        activity_completion_rate = round((len(completed_activities) / total_activities * 100), 1) if total_activities > 0 else (100.0 if len(completed_activities) > 0 else 0.0)

        activity_metrics = ActivityReportMetrics(
            total=total_activities,
            completed=len(completed_activities),
            pending=len(pending_activities),
            completion_rate=activity_completion_rate,
            calls=calls,
            meetings=meetings,
            emails=emails,
            notes=notes,
            follow_ups=follow_ups,
        )

        # 3. Fetch Deals
        if is_workspace and company_name:
            deal_conditions = [Deal.company_name == company_name]
        else:
            if company_name:
                deal_conditions = [Deal.responsible_user_id == user.id, Deal.company_name == company_name]
            else:
                deal_conditions = [Deal.responsible_user_id == user.id]

        deal_conditions.append(
            or_(
                Deal.created_at.between(start_dt, end_dt),
                Deal.updated_at.between(start_dt, end_dt),
                and_(Deal.stage.has(and_(PipelineStage.is_won == False, PipelineStage.is_lost == False)), Deal.created_at <= end_dt),
            )
        )

        if categories_selected:
            if "deal" not in categories_selected:
                deal_conditions.append(Deal.id.is_(None))
            else:
                deal_subs = {sub for cat, sub in parsed_filters if cat == "deal"}
                if "all" not in deal_subs:
                    deal_sub_conditions = []
                    for sub in deal_subs:
                        if sub == "won":
                            deal_sub_conditions.append(Deal.stage.has(PipelineStage.is_won == True))
                        elif sub == "lost":
                            deal_sub_conditions.append(Deal.stage.has(PipelineStage.is_lost == True))
                        else:
                            try:
                                stg_uuid = uuid.UUID(sub)
                                deal_sub_conditions.append(Deal.stage_id == stg_uuid)
                            except ValueError:
                                deal_sub_conditions.append(Deal.stage.has(PipelineStage.name.ilike(f"%{sub}%")))
                    if deal_sub_conditions:
                        deal_conditions.append(or_(*deal_sub_conditions))

        deal_stmt = (
            select(Deal)
            .where(*deal_conditions)
            .options(selectinload(Deal.stage))
            .order_by(Deal.updated_at.desc())
        )
        deal_res = await db.execute(deal_stmt)
        user_deals = list(deal_res.scalars().all())

        total_deals = len(user_deals)
        won_deals = [d for d in user_deals if d.stage and d.stage.is_won]
        lost_deals = [d for d in user_deals if d.stage and d.stage.is_lost]
        active_deals = [d for d in user_deals if d.stage and not d.stage.is_won and not d.stage.is_lost]

        won_amount = sum(float(d.amount or 0) for d in won_deals)
        lost_amount = sum(float(d.amount or 0) for d in lost_deals)
        active_amount = sum(float(d.amount or 0) for d in active_deals)

        closed_count = len(won_deals) + len(lost_deals)
        win_rate = round((len(won_deals) / closed_count * 100), 1) if closed_count > 0 else (
            round((len(won_deals) / total_deals * 100), 1) if total_deals > 0 else 0.0
        )

        deal_metrics = DealReportMetrics(
            total=total_deals,
            won=len(won_deals),
            won_amount=round(won_amount, 2),
            lost=len(lost_deals),
            lost_amount=round(lost_amount, 2),
            active=len(active_deals),
            active_amount=round(active_amount, 2),
            win_rate=win_rate,
        )

        # 4. CRM Impact: Contacts & Companies
        if is_workspace and company_name:
            contact_filter = [
                Contact.company_name == company_name,
                Contact.created_at.between(start_dt, end_dt),
            ]
            company_filter = [
                Company.company_name == company_name,
                Company.created_at.between(start_dt, end_dt),
            ]
        else:
            contact_filter = [
                Contact.user_id == user.id,
                Contact.created_at.between(start_dt, end_dt),
            ]
            company_filter = [
                Company.user_id == user.id,
                Company.created_at.between(start_dt, end_dt),
            ]
            if company_name:
                contact_filter.append(Contact.company_name == company_name)
                company_filter.append(Company.company_name == company_name)

        if categories_selected:
            if "company" not in categories_selected:
                company_filter.append(Company.id.is_(None))
            else:
                comp_subs = {sub for cat, sub in parsed_filters if cat == "company"}
                if "all" not in comp_subs:
                    company_filter.append(or_(*[Company.stage.ilike(f"%{s}%") for s in comp_subs]))

            if "contact" not in categories_selected:
                contact_filter.append(Contact.id.is_(None))
            else:
                contact_subs = {sub for cat, sub in parsed_filters if cat == "contact"}
                if "all" not in contact_subs:
                    contact_filter.append(or_(*[Contact.stage.ilike(f"%{s}%") for s in contact_subs]))

        contacts_count = await db.scalar(select(func.count(Contact.id)).where(*contact_filter)) or 0
        companies_count = await db.scalar(select(func.count(Company.id)).where(*company_filter)) or 0

        crm_impact = CRMImpactReportMetrics(
            contacts_created=contacts_count,
            companies_created=companies_count,
        )

        # 5. Composite Efficiency Score Calculation (0 to 100) - Dynamic weighting based on active scope
        active_weights: List[float] = []
        weighted_scores: List[float] = []

        if total_tasks > 0:
            task_score = (0.6 * task_completion_rate) + (0.4 * task_on_time_rate)
            active_weights.append(0.40)
            weighted_scores.append(task_score * 0.40)

        if total_activities > 0:
            vol_points = min(100.0, len(completed_activities) * 10.0)
            act_score = (0.5 * vol_points) + (0.5 * activity_completion_rate)
            active_weights.append(0.35)
            weighted_scores.append(act_score * 0.35)

        if total_deals > 0:
            if closed_count > 0:
                d_score = win_rate
            elif len(won_deals) > 0:
                d_score = 100.0
            elif len(active_deals) > 0:
                d_score = 50.0
            else:
                d_score = 0.0
            active_weights.append(0.25)
            weighted_scores.append(d_score * 0.25)

        if active_weights:
            efficiency_score = round(sum(weighted_scores) / sum(active_weights), 1)
        else:
            efficiency_score = 0.0

        efficiency_score = max(0.0, min(100.0, efficiency_score))

        # Performance Rating Tier
        if efficiency_score >= 85.0:
            rating = "Top Performer"
        elif efficiency_score >= 70.0:
            rating = "High Efficiency"
        elif efficiency_score >= 50.0:
            rating = "Good"
        else:
            rating = "Needs Attention"

        # Item summaries
        recent_tasks = [
            TaskItemSummary(
                id=t.id,
                title=t.title,
                status=t.status,
                priority=t.priority,
                due_date=t.due_date,
                created_at=t.created_at,
                updated_at=t.updated_at,
            )
            for t in user_tasks[:50]
        ]

        recent_activities = [
            ActivityItemSummary(
                id=a.id,
                type=a.type,
                subject=a.subject,
                is_completed=a.is_completed,
                scheduled_at=a.scheduled_at,
                created_at=a.created_at,
            )
            for a in user_activities[:50]
        ]

        recent_deals = [
            DealItemSummary(
                id=d.id,
                title=d.title,
                amount=float(d.amount or 0),
                currency=d.currency or "INR",
                stage_name=d.stage.name if d.stage else None,
                is_won=d.stage.is_won if d.stage else False,
                is_lost=d.stage.is_lost if d.stage else False,
                created_at=d.created_at,
            )
            for d in user_deals[:50]
        ]

        user_summary = UserSummaryItem(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            role=user.role,
            company_name=company_name or user.company_name,
        )

        return UserEfficiencyReport(
            user=user_summary,
            period_start=start_str,
            period_end=end_str,
            efficiency_score=efficiency_score,
            performance_rating=rating,
            tasks=task_metrics,
            activities=activity_metrics,
            deals=deal_metrics,
            crm_impact=crm_impact,
            recent_tasks=recent_tasks,
            recent_activities=recent_activities,
            recent_deals=recent_deals,
        )

    @classmethod
    async def get_efficiency_report(
        cls,
        db: AsyncSession,
        current_user: User,
        target_user_id: Optional[uuid.UUID] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        stage: Optional[Union[str, List[str]]] = None,
    ) -> ReportResponse:
        """Main service entry for generating efficiency reports with account and role security."""
        start_dt, end_dt, start_str, end_str = cls.parse_date_range(start_date, end_date)
        is_admin = (current_user.role == "admin")

        # If not admin, enforce viewing own report only
        if not is_admin:
            if target_user_id and target_user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Non-administrator accounts can only generate their own performance report.",
                )
            target_user_id = current_user.id

        # Case 1: Specific User Report (requested by admin or regular agent)
        if target_user_id:
            target_user = await db.get(User, target_user_id)
            if not target_user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Requested user could not be found.",
                )

            # Security: If admin has company_name, target user must match that company
            if is_admin and current_user.company_name and target_user.company_name != current_user.company_name:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot view reports for users outside your company workspace.",
                )

            user_report = await cls.generate_user_report(
                db=db,
                user=target_user,
                start_dt=start_dt,
                end_dt=end_dt,
                start_str=start_str,
                end_str=end_str,
                stage=stage,
                company_name=target_user.company_name,
                is_workspace=False,
            )

            return ReportResponse(
                period_start=start_str,
                period_end=end_str,
                is_admin=is_admin,
                selected_user_id=target_user.id,
                is_team_overview=False,
                total_team_members=1,
                team_average_efficiency=user_report.efficiency_score,
                team_tasks_completed=user_report.tasks.completed,
                team_activities_logged=user_report.activities.total,
                team_deals_won=user_report.deals.won,
                team_revenue_won=user_report.deals.won_amount,
                user_reports=[user_report],
                report=user_report,
            )

        # Case 2: Team Overview for Admin (no target_user_id selected)
        users_stmt = select(User).where(User.is_active == True)
        if current_user.company_name:
            users_stmt = users_stmt.where(User.company_name == current_user.company_name)
        users_stmt = users_stmt.order_by(User.full_name.asc())

        users_res = await db.execute(users_stmt)
        team_users = list(users_res.scalars().all())

        user_reports: List[UserEfficiencyReport] = []
        for member in team_users:
            rep = await cls.generate_user_report(
                db=db,
                user=member,
                start_dt=start_dt,
                end_dt=end_dt,
                start_str=start_str,
                end_str=end_str,
                stage=stage,
                company_name=member.company_name,
                is_workspace=False,
            )
            user_reports.append(rep)

        # Sort team reports by efficiency_score descending (Leaderboard)
        user_reports.sort(key=lambda x: x.efficiency_score, reverse=True)

        total_members = len(user_reports)
        avg_efficiency = (
            round(sum(r.efficiency_score for r in user_reports) / total_members, 1)
            if total_members > 0 else 0.0
        )

        workspace_pseudo_user = User(
            id=uuid.UUID("00000000-0000-0000-0000-000000000000"),
            full_name=f"{current_user.company_name or 'Company'} Workspace",
            email=current_user.email,
            role="admin",
            company_name=current_user.company_name,
        )
        workspace_report = await cls.generate_user_report(
            db=db,
            user=workspace_pseudo_user,
            start_dt=start_dt,
            end_dt=end_dt,
            start_str=start_str,
            end_str=end_str,
            stage=stage,
            company_name=current_user.company_name,
            is_workspace=True,
        )

        return ReportResponse(
            period_start=start_str,
            period_end=end_str,
            is_admin=is_admin,
            selected_user_id=None,
            is_team_overview=True,
            total_team_members=total_members,
            team_average_efficiency=workspace_report.efficiency_score if workspace_report.efficiency_score > 0 else avg_efficiency,
            team_tasks_completed=workspace_report.tasks.completed,
            team_activities_logged=workspace_report.activities.total,
            team_deals_won=workspace_report.deals.won,
            team_revenue_won=workspace_report.deals.won_amount,
            user_reports=user_reports,
            report=workspace_report,
        )

    @classmethod
    async def export_csv(
        cls,
        db: AsyncSession,
        current_user: User,
        target_user_id: Optional[uuid.UUID] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        stage: Optional[Union[str, List[str]]] = None,
    ) -> str:
        """Generate a structured CSV export of user or team efficiency metrics."""
        rep_resp = await cls.get_efficiency_report(
            db=db,
            current_user=current_user,
            target_user_id=target_user_id,
            start_date=start_date,
            end_date=end_date,
            stage=stage,
        )

        output = io.StringIO()
        writer = csv.writer(output)

        # Title Block
        writer.writerow(["smartEco CRM - User Efficiency & Performance Report"])
        writer.writerow(["Period Start", rep_resp.period_start])
        writer.writerow(["Period End", rep_resp.period_end])
        writer.writerow(["Generated At (UTC)", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")])
        writer.writerow(["Generated By", current_user.full_name])
        writer.writerow(["Company Workspace", current_user.company_name or "Standard CRM"])
        writer.writerow([])

        # Summary Overview
        if rep_resp.is_team_overview:
            writer.writerow(["--- TEAM PERFORMANCE OVERVIEW ---"])
            writer.writerow(["Total Team Members", rep_resp.total_team_members])
            writer.writerow(["Team Average Efficiency", f"{rep_resp.team_average_efficiency}%"])
            writer.writerow(["Team Tasks Completed", rep_resp.team_tasks_completed])
            writer.writerow(["Team Activities Logged", rep_resp.team_activities_logged])
            writer.writerow(["Team Deals Won", rep_resp.team_deals_won])
            writer.writerow(["Team Revenue Won ($)", rep_resp.team_revenue_won])
            writer.writerow([])

            # Team Leaderboard Table
            writer.writerow([
                "Rank",
                "Full Name",
                "Email",
                "Role",
                "Efficiency Score (%)",
                "Performance Rating",
                "Tasks Completed",
                "Tasks Total",
                "Task Completion Rate (%)",
                "On-Time Rate (%)",
                "Activities Logged",
                "Calls",
                "Meetings",
                "Emails",
                "Deals Won",
                "Won Revenue ($)",
                "Win Rate (%)",
                "Contacts Added",
            ])

            for rank, r in enumerate(rep_resp.user_reports, start=1):
                writer.writerow([
                    rank,
                    r.user.full_name,
                    r.user.email,
                    r.user.role,
                    f"{r.efficiency_score}%",
                    r.performance_rating,
                    r.tasks.completed,
                    r.tasks.total_assigned,
                    f"{r.tasks.completion_rate}%",
                    f"{r.tasks.on_time_rate}%",
                    r.activities.total,
                    r.activities.calls,
                    r.activities.meetings,
                    r.activities.emails,
                    r.deals.won,
                    f"${r.deals.won_amount:,.2f}",
                    f"{r.deals.win_rate}%",
                    r.crm_impact.contacts_created,
                ])
        else:
            single = rep_resp.report
            if single:
                writer.writerow(["--- INDIVIDUAL USER EFFICIENCY REPORT ---"])
                writer.writerow(["User Name", single.user.full_name])
                writer.writerow(["User Email", single.user.email])
                writer.writerow(["Role", single.user.role])
                writer.writerow(["Efficiency Score", f"{single.efficiency_score}%"])
                writer.writerow(["Performance Rating", single.performance_rating])
                writer.writerow([])

                writer.writerow(["--- METRICS BREAKDOWN ---"])
                writer.writerow(["Metric Category", "Metric Name", "Value"])
                writer.writerow(["Tasks", "Total Assigned", single.tasks.total_assigned])
                writer.writerow(["Tasks", "Completed", single.tasks.completed])
                writer.writerow(["Tasks", "In Progress", single.tasks.in_progress])
                writer.writerow(["Tasks", "Pending", single.tasks.pending])
                writer.writerow(["Tasks", "Overdue", single.tasks.overdue])
                writer.writerow(["Tasks", "Completion Rate", f"{single.tasks.completion_rate}%"])
                writer.writerow(["Tasks", "On-Time Completion Rate", f"{single.tasks.on_time_rate}%"])
                writer.writerow(["Activities", "Total Logged", single.activities.total])
                writer.writerow(["Activities", "Completed", single.activities.completed])
                writer.writerow(["Activities", "Calls Made", single.activities.calls])
                writer.writerow(["Activities", "Meetings Held", single.activities.meetings])
                writer.writerow(["Activities", "Emails Sent", single.activities.emails])
                writer.writerow(["Activities", "Notes Added", single.activities.notes])
                writer.writerow(["Activities", "Follow-ups", single.activities.follow_ups])
                writer.writerow(["Deals", "Total Deals Managed", single.deals.total])
                writer.writerow(["Deals", "Deals Won", single.deals.won])
                writer.writerow(["Deals", "Revenue Won ($)", f"${single.deals.won_amount:,.2f}"])
                writer.writerow(["Deals", "Deals Lost", single.deals.lost])
                writer.writerow(["Deals", "Deal Win Rate", f"{single.deals.win_rate}%"])
                writer.writerow(["CRM Growth", "Contacts Added", single.crm_impact.contacts_created])
                writer.writerow(["CRM Growth", "Companies Added", single.crm_impact.companies_created])
                writer.writerow([])

                if single.recent_tasks:
                    writer.writerow(["--- COMPLETED & RECENT TASKS ---"])
                    writer.writerow(["Task Title", "Status", "Priority", "Due Date", "Created At"])
                    for t in single.recent_tasks:
                        writer.writerow([
                            t.title,
                            t.status,
                            t.priority,
                            t.due_date.strftime("%Y-%m-%d %H:%M") if t.due_date else "None",
                            t.created_at.strftime("%Y-%m-%d"),
                        ])
                    writer.writerow([])

                if single.recent_activities:
                    writer.writerow(["--- RECENT LOGGED ACTIVITIES ---"])
                    writer.writerow(["Type", "Subject", "Completed", "Scheduled At", "Created At"])
                    for a in single.recent_activities:
                        writer.writerow([
                            a.type,
                            a.subject,
                            "Yes" if a.is_completed else "No",
                            a.scheduled_at.strftime("%Y-%m-%d %H:%M") if a.scheduled_at else "N/A",
                            a.created_at.strftime("%Y-%m-%d"),
                        ])

        return output.getvalue()
