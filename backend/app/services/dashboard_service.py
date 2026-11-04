from datetime import datetime, timedelta, timezone
from typing import List, Optional
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.models.activity import Activity
from backend.app.models.company import Company
from backend.app.models.contact import Contact
from backend.app.models.deal import Deal
from backend.app.models.task import Task
from backend.app.models.user import User
from backend.app.schemas.dashboard import (
    ActivityMetrics,
    DashboardMetricsResponse,
    DealSummaryMetrics,
    EfficiencySnapshotMetrics,
    LeaderboardPreviewItem,
    NetworkMetrics,
    RecentDealSummary,
    TaskMetrics,
)


def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


class DashboardService:
    @staticmethod
    async def get_metrics(
        db: AsyncSession, current_user: Optional[User] = None
    ) -> DashboardMetricsResponse:
        """Calculate live database metrics for tasks, activities, deals, efficiency reports snapshot, and CRM ecosystem."""
        now = datetime.now(timezone.utc)
        in_7_days = now + timedelta(days=7)
        is_admin = bool(current_user and getattr(current_user, "role", "agent") == "admin")

        # Base filters
        task_user_filter = []
        activity_user_filter = []
        deal_user_filter = []
        contact_user_filter = []
        company_user_filter = []

        if current_user:
            if getattr(current_user, "company_name", None):
                task_user_filter.append(Task.company_name == current_user.company_name)
                activity_user_filter.append(Activity.company_name == current_user.company_name)
                deal_user_filter.append(Deal.company_name == current_user.company_name)
                contact_user_filter.append(Contact.company_name == current_user.company_name)
                company_user_filter.append(Company.company_name == current_user.company_name)
            elif not is_admin:
                task_user_filter.append(
                    or_(
                        Task.assigned_to_id == current_user.id,
                        Task.created_by_id == current_user.id,
                    )
                )
                activity_user_filter.append(Activity.user_id == current_user.id)
                deal_user_filter.append(Deal.responsible_user_id == current_user.id)
                contact_user_filter.append(Contact.user_id == current_user.id)
                company_user_filter.append(Company.user_id == current_user.id)

        # 1. Tasks Summary
        total_tasks = await db.scalar(select(func.count(Task.id)).where(*task_user_filter)) or 0
        pending_tasks = await db.scalar(
            select(func.count(Task.id)).where(Task.status == "pending", *task_user_filter)
        ) or 0
        in_progress_tasks = await db.scalar(
            select(func.count(Task.id)).where(Task.status == "in_progress", *task_user_filter)
        ) or 0
        completed_tasks = await db.scalar(
            select(func.count(Task.id)).where(Task.status == "completed", *task_user_filter)
        ) or 0
        cancelled_tasks = await db.scalar(
            select(func.count(Task.id)).where(Task.status == "cancelled", *task_user_filter)
        ) or 0

        # Overdue tasks: pending or in_progress with due_date in the past
        overdue_tasks = await db.scalar(
            select(func.count(Task.id)).where(
                Task.status.in_(["pending", "in_progress"]),
                Task.due_date < now,
                *task_user_filter,
            )
        ) or 0

        # High priority tasks: priority in ('high', 'urgent') and not completed
        high_priority_tasks = await db.scalar(
            select(func.count(Task.id)).where(
                Task.priority.in_(["high", "urgent"]),
                Task.status != "completed",
                *task_user_filter,
            )
        ) or 0

        task_metrics = TaskMetrics(
            total=total_tasks,
            pending=pending_tasks,
            in_progress=in_progress_tasks,
            completed=completed_tasks,
            cancelled=cancelled_tasks,
            overdue=overdue_tasks,
            high_priority=high_priority_tasks,
        )

        # 2. Activities Summary
        total_activities = await db.scalar(select(func.count(Activity.id)).where(*activity_user_filter)) or 0
        completed_activities = await db.scalar(
            select(func.count(Activity.id)).where(Activity.is_completed == True, *activity_user_filter)
        ) or 0
        pending_activities = await db.scalar(
            select(func.count(Activity.id)).where(Activity.is_completed == False, *activity_user_filter)
        ) or 0
        calls_count = await db.scalar(
            select(func.count(Activity.id)).where(Activity.type == "call", *activity_user_filter)
        ) or 0
        meetings_count = await db.scalar(
            select(func.count(Activity.id)).where(Activity.type == "meeting", *activity_user_filter)
        ) or 0
        emails_count = await db.scalar(
            select(func.count(Activity.id)).where(Activity.type == "email", *activity_user_filter)
        ) or 0
        notes_count = await db.scalar(
            select(func.count(Activity.id)).where(Activity.type == "note", *activity_user_filter)
        ) or 0
        follow_ups_count = await db.scalar(
            select(func.count(Activity.id)).where(Activity.type == "follow_up", *activity_user_filter)
        ) or 0

        activity_metrics = ActivityMetrics(
            total=total_activities,
            completed=completed_activities,
            pending=pending_activities,
            calls=calls_count,
            meetings=meetings_count,
            emails=emails_count,
            notes=notes_count,
            follow_ups=follow_ups_count,
        )

        # 3. Deals Summary & Commercial Pipeline
        deal_stmt = (
            select(Deal)
            .where(*deal_user_filter)
            .options(
                selectinload(Deal.stage),
                selectinload(Deal.company),
                selectinload(Deal.contact),
            )
            .order_by(Deal.updated_at.desc())
        )
        deal_res = await db.execute(deal_stmt)
        all_deals = list(deal_res.scalars().all())

        won_deals = [d for d in all_deals if d.stage and d.stage.is_won]
        lost_deals = [d for d in all_deals if d.stage and d.stage.is_lost]
        active_deals = [d for d in all_deals if d.stage and not d.stage.is_won and not d.stage.is_lost]

        won_revenue = sum(float(d.amount or 0) for d in won_deals)
        active_revenue = sum(float(d.amount or 0) for d in active_deals)
        lost_revenue = sum(float(d.amount or 0) for d in lost_deals)

        closed_deals_count = len(won_deals) + len(lost_deals)
        win_rate = (
            round((len(won_deals) / closed_deals_count * 100), 1)
            if closed_deals_count > 0
            else (round(len(won_deals) / len(all_deals) * 100, 1) if all_deals else 0.0)
        )

        deal_metrics = DealSummaryMetrics(
            total=len(all_deals),
            won=len(won_deals),
            won_revenue=round(won_revenue, 2),
            active=len(active_deals),
            active_revenue=round(active_revenue, 2),
            lost=len(lost_deals),
            lost_revenue=round(lost_revenue, 2),
            win_rate=win_rate,
        )

        # 4. Network Metrics (Contacts & Companies)
        total_contacts = await db.scalar(select(func.count(Contact.id)).where(*contact_user_filter)) or 0
        total_companies = await db.scalar(select(func.count(Company.id)).where(*company_user_filter)) or 0
        network_metrics = NetworkMetrics(
            total_contacts=total_contacts,
            total_companies=total_companies,
        )

        # 5. Efficiency & Performance Snapshot
        task_completion_rate = (
            round((completed_tasks / total_tasks * 100), 1)
            if total_tasks > 0
            else (100.0 if completed_tasks > 0 else 0.0)
        )
        task_on_time_rate = max(0.0, min(100.0, 100.0 - (overdue_tasks * 10.0)))
        task_score = (0.6 * task_completion_rate) + (0.4 * task_on_time_rate)

        act_vol_points = min(100.0, completed_activities * 10.0)
        act_comp_rate = (
            round((completed_activities / total_activities * 100), 1)
            if total_activities > 0
            else 0.0
        )
        activity_score = (0.5 * act_vol_points) + (0.5 * act_comp_rate)

        deal_score = win_rate if closed_deals_count > 0 else (100.0 if len(won_deals) > 0 else (50.0 if len(active_deals) > 0 else 0.0))

        active_weights = []
        weighted_scores = []
        if total_tasks > 0:
            active_weights.append(0.40)
            weighted_scores.append(task_score * 0.40)
        if total_activities > 0:
            active_weights.append(0.35)
            weighted_scores.append(activity_score * 0.35)
        if len(all_deals) > 0:
            active_weights.append(0.25)
            weighted_scores.append(deal_score * 0.25)

        composite_score = (
            round(sum(weighted_scores) / sum(active_weights), 1)
            if active_weights
            else 0.0
        )
        composite_score = max(0.0, min(100.0, composite_score))

        if composite_score >= 85.0:
            rating = "Top Performer"
        elif composite_score >= 70.0:
            rating = "High Efficiency"
        elif composite_score >= 50.0:
            rating = "Good"
        else:
            rating = "Needs Attention"

        efficiency_snapshot = EfficiencySnapshotMetrics(
            score=composite_score,
            rating=rating,
            completion_rate=task_completion_rate,
            on_time_rate=round(task_on_time_rate, 1),
            total_activities=total_activities,
            deals_won=len(won_deals),
            revenue_won=round(won_revenue, 2),
        )

        # 6. Recent Deals
        recent_deals = [
            RecentDealSummary(
                id=d.id,
                title=d.title,
                amount=float(d.amount or 0),
                currency=d.currency or "INR",
                stage_name=d.stage.name if d.stage else None,
                stage_color=d.stage.color if d.stage else "#00AEEF",
                is_won=d.stage.is_won if d.stage else False,
                is_lost=d.stage.is_lost if d.stage else False,
                company_name=d.company.name if d.company else (d.company_name or None),
                contact_name=f"{d.contact.first_name} {d.contact.last_name}".strip() if d.contact else None,
                created_at=d.created_at,
            )
            for d in all_deals[:6]
        ]

        # 7. Team Leaderboard Preview (for admins)
        team_leaderboard: List[LeaderboardPreviewItem] = []
        if is_admin:
            users_stmt = select(User).where(User.is_active == True)
            if current_user and current_user.company_name:
                users_stmt = users_stmt.where(User.company_name == current_user.company_name)
            users_stmt = users_stmt.order_by(User.full_name.asc()).limit(5)
            u_res = await db.execute(users_stmt)
            top_users = list(u_res.scalars().all())

            for u in top_users:
                u_tasks_done = await db.scalar(
                    select(func.count(Task.id)).where(Task.assigned_to_id == u.id, Task.status == "completed")
                ) or 0
                u_activities = await db.scalar(
                    select(func.count(Activity.id)).where(Activity.user_id == u.id)
                ) or 0
                
                # deals won
                won_d_res = await db.execute(
                    select(Deal).join(Deal.stage).where(Deal.responsible_user_id == u.id, Deal.stage.has(is_won=True))
                )
                u_won_deals = list(won_d_res.scalars().all())
                u_won_count = len(u_won_deals)
                u_won_rev = sum(float(d.amount or 0) for d in u_won_deals)

                u_score = min(100.0, round((u_tasks_done * 8.0) + (u_activities * 5.0) + (u_won_count * 20.0), 1))

                u_rating = (
                    "Top Performer" if u_score >= 85
                    else "High Efficiency" if u_score >= 70
                    else "Good" if u_score >= 50
                    else "Needs Attention"
                )

                team_leaderboard.append(
                    LeaderboardPreviewItem(
                        user_id=u.id,
                        full_name=u.full_name,
                        email=u.email,
                        role=u.role,
                        efficiency_score=u_score,
                        rating=u_rating,
                        tasks_completed=u_tasks_done,
                        activities_total=u_activities,
                        deals_won=u_won_count,
                        revenue_won=round(u_won_rev, 2),
                    )
                )
            team_leaderboard.sort(key=lambda x: x.efficiency_score, reverse=True)

        # 8. Upcoming / Open Activities (not completed)
        upcoming_stmt = (
            select(Activity)
            .where(Activity.is_completed == False, *activity_user_filter)
            .options(
                selectinload(Activity.deal),
                selectinload(Activity.contact),
                selectinload(Activity.company),
                selectinload(Activity.user),
            )
            .order_by(Activity.scheduled_at.asc().nullslast(), Activity.created_at.desc())
            .limit(10)
        )
        upcoming_res = await db.execute(upcoming_stmt)
        upcoming_activities = list(upcoming_res.scalars().all())

        # 9. Recent Activities
        recent_stmt = (
            select(Activity)
            .where(*activity_user_filter)
            .options(
                selectinload(Activity.deal),
                selectinload(Activity.contact),
                selectinload(Activity.company),
                selectinload(Activity.user),
            )
            .order_by(Activity.created_at.desc())
            .limit(10)
        )
        recent_res = await db.execute(recent_stmt)
        recent_activities = list(recent_res.scalars().all())

        # 10. Follow-ups & Open Tasks (pending or in_progress)
        due_soon_stmt = (
            select(Task)
            .where(
                Task.status.in_(["pending", "in_progress"]),
                or_(Task.due_date <= in_7_days, Task.due_date.is_(None)),
                *task_user_filter,
            )
            .options(
                selectinload(Task.deal),
                selectinload(Task.contact),
                selectinload(Task.company),
                selectinload(Task.assigned_to),
                selectinload(Task.created_by),
            )
            .order_by(Task.due_date.asc().nullslast(), Task.created_at.desc())
            .limit(10)
        )
        due_soon_res = await db.execute(due_soon_stmt)
        follow_ups_due_soon = list(due_soon_res.scalars().all())

        return DashboardMetricsResponse(
            tasks=task_metrics,
            activities=activity_metrics,
            deals=deal_metrics,
            network=network_metrics,
            efficiency_snapshot=efficiency_snapshot,
            team_leaderboard=team_leaderboard,
            upcoming_activities=upcoming_activities,  # type: ignore
            recent_activities=recent_activities,  # type: ignore
            follow_ups_due_soon=follow_ups_due_soon,  # type: ignore
            recent_deals=recent_deals,
        )
