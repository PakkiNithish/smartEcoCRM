import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_end_to_end_crm_workflow(client: AsyncClient):
    """Test the complete customer journey:

    Company -> Contact -> Deal -> Task -> Activity -> Follow-up -> Dashboard Metrics.
    """
    # 1. Create a Company
    comp_res = await client.post(
        "/api/v1/companies",
        json={
            "name": "Wayne Enterprises Global",
            "industry": "Defense & Tech",
            "email": "contact@waynecorp.com",
            "website": "https://waynecorp.com",
        },
    )
    assert comp_res.status_code == 201
    company_id = comp_res.json()["id"]

    # 2. Create a Contact linked to the Company
    contact_res = await client.post(
        "/api/v1/contacts",
        json={
            "first_name": "Lucius",
            "last_name": "Fox",
            "email": "lucius@waynecorp.com",
            "job_title": "CEO & Tech Lead",
            "company_id": company_id,
        },
    )
    assert contact_res.status_code == 201
    contact_id = contact_res.json()["id"]

    # 3. Create a Deal linked to Company & Contact
    stages_res = await client.get("/api/v1/pipeline-stages")
    assert stages_res.status_code == 200
    stage_id = stages_res.json()[0]["id"]

    deal_res = await client.post(
        "/api/v1/deals",
        json={
            "title": "Batmobile Fleet R&D",
            "amount": 2500000.00,
            "currency": "USD",
            "stage_id": stage_id,
            "company_id": company_id,
            "contact_id": contact_id,
            "description": "Next-gen tactical vehicle development contract",
        },
    )
    assert deal_res.status_code == 201
    deal_id = deal_res.json()["id"]

    # 4. Create a follow-up Task from the Deal
    task_res = await client.post(
        "/api/v1/tasks",
        json={
            "title": "Prepare blueprint specs for Lucius",
            "priority": "high",
            "status": "pending",
            "deal_id": deal_id,
            "contact_id": contact_id,
            "company_id": company_id,
        },
    )
    assert task_res.status_code == 201
    task_id = task_res.json()["id"]

    # 5. Record an Activity for the Deal
    activity_res = await client.post(
        "/api/v1/activities",
        json={
            "type": "meeting",
            "subject": "Kickoff review meeting with Lucius Fox",
            "notes": "Reviewed composite armor and battery specs.",
            "is_completed": True,
            "deal_id": deal_id,
            "contact_id": contact_id,
            "company_id": company_id,
        },
    )
    assert activity_res.status_code == 201
    activity_id = activity_res.json()["id"]

    # 6. Complete the Task
    update_task_res = await client.patch(
        f"/api/v1/tasks/{task_id}",
        json={"status": "completed"},
    )
    assert update_task_res.status_code == 200
    assert update_task_res.json()["status"] == "completed"

    # 7. Create the next follow-up Task
    next_task_res = await client.post(
        "/api/v1/tasks",
        json={
            "title": "Send prototype delivery schedule",
            "priority": "medium",
            "status": "pending",
            "deal_id": deal_id,
            "contact_id": contact_id,
            "company_id": company_id,
        },
    )
    assert next_task_res.status_code == 201

    # 8. Confirm tasks & activities are queryable by deal_id, contact_id, company_id
    deal_tasks_res = await client.get(f"/api/v1/tasks?deal_id={deal_id}")
    assert deal_tasks_res.status_code == 200
    assert deal_tasks_res.json()["total"] == 2

    contact_activities_res = await client.get(f"/api/v1/activities?contact_id={contact_id}")
    assert contact_activities_res.status_code == 200
    assert contact_activities_res.json()["total"] >= 1

    company_tasks_res = await client.get(f"/api/v1/tasks?company_id={company_id}")
    assert company_tasks_res.status_code == 200
    assert company_tasks_res.json()["total"] == 2

    # 9. Confirm that dashboard metrics reflect real records
    metrics_res = await client.get("/api/v1/dashboard/metrics")
    assert metrics_res.status_code == 200
    metrics = metrics_res.json()
    assert metrics["tasks"]["total"] >= 2
    assert metrics["tasks"]["completed"] >= 1
    assert metrics["activities"]["total"] >= 1
    assert metrics["activities"]["completed"] >= 1
    assert metrics["activities"]["meetings"] >= 1
