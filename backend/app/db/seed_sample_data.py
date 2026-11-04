"""
Sample data seeder for smartEco CRM.
Populates rich, interconnected demo data across all modules:
- Pipeline stages (including Lost stage)
- Companies with multiple contacts
- Deals across every stage (New, Create papers, Invoice, In progress, Final invoice, Won, Lost)
- Tasks with all statuses (Completed, In Progress, Pending, Overdue) and priorities (Urgent, High, Medium, Low)
- Activities with all types (meeting, call, email, follow_up, note) in completed and scheduled states
"""

import sqlite3
import uuid
from datetime import datetime, timedelta, timezone

DB_PATHS = [
    "C:/Nithish/Projects/crm/dev_crm.db",
    "C:/Nithish/Projects/crm/backend/dev_crm.db",
]


def seed_database(db_path: str):
    print(f"Seeding database at: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    now = datetime.now(timezone.utc)
    now_str = now.strftime("%Y-%m-%d %H:%M:%S")

    # 1. Fetch available users
    cursor.execute("SELECT id, email, full_name FROM users WHERE is_active = 1")
    users = cursor.fetchall()
    if not users:
        print("No active users found. Skipping user assignments.")
        primary_user_id = None
        secondary_user_id = None
    else:
        primary_user_id = users[0][0]
        secondary_user_id = users[1][0] if len(users) > 1 else users[0][0]
        print(f"Using primary user: {users[0][1]} ({primary_user_id})")
        if len(users) > 1:
            print(f"Using secondary user: {users[1][1]} ({secondary_user_id})")

    # 2. Ensure Pipeline Stages (New, Create papers, Invoice, In progress, Final invoice, Won, Lost)
    stages = [
        ("a0000000-0000-0000-0000-000000000001", "New", 1, "#00AEEF", 0, 0),
        ("a0000000-0000-0000-0000-000000000002", "Create papers", 2, "#47BBEF", 0, 0),
        ("a0000000-0000-0000-0000-000000000003", "Invoice", 3, "#FFA900", 0, 0),
        ("a0000000-0000-0000-0000-000000000004", "In progress", 4, "#58CC02", 0, 0),
        ("a0000000-0000-0000-0000-000000000005", "Final invoice", 5, "#9B51E0", 0, 0),
        ("a0000000-0000-0000-0000-000000000006", "Close deal", 6, "#27AE60", 1, 0),
        ("a0000000-0000-0000-0000-000000000007", "Lost", 7, "#EB5757", 0, 1),
    ]

    for s_id, s_name, s_order, s_color, s_won, s_lost in stages:
        cursor.execute(
            """
            INSERT OR REPLACE INTO pipeline_stages (id, name, "order", color, is_won, is_lost, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (s_id, s_name, s_order, s_color, s_won, s_lost, now_str, now_str),
        )

    # 3. Companies
    companies_data = [
        (
            "c0000000-0000-0000-0000-000000000001",
            "Tesla Energy Middle East",
            "Renewable Energy",
            "+971 4 399 2211",
            "contact@tesla-energy.example.com",
            "https://tesla-energy.example.com",
            "Sheikh Zayed Road, Downtown, Dubai, UAE",
            "Active",
            primary_user_id,
        ),
        (
            "c0000000-0000-0000-0000-000000000002",
            "Apex Retail Global",
            "Retail & E-Commerce",
            "+1 415 555 0100",
            "info@apexretail.example.com",
            "https://apexretail.example.com",
            "500 Howard Street, San Francisco, CA, USA",
            "Lead",
            secondary_user_id,
        ),
        (
            "c0000000-0000-0000-0000-000000000003",
            "Nordic Health Systems",
            "Healthcare & Biotech",
            "+46 8 500 2000",
            "partners@nordichealth.example.com",
            "https://nordichealth.example.com",
            "Sveavägen 44, Stockholm, Sweden",
            "Negotiation",
            primary_user_id,
        ),
        (
            "c0000000-0000-0000-0000-000000000004",
            "Emirates Logistics Hub",
            "Logistics & Freight",
            "+971 4 800 5500",
            "operations@emirateslogistics.example.com",
            "https://emirateslogistics.example.com",
            "JAFZA Free Zone, Jebel Ali, Dubai, UAE",
            "Client",
            secondary_user_id,
        ),
    ]

    for c_id, name, ind, phone, email, web, addr, stage, uid in companies_data:
        cursor.execute(
            """
            INSERT OR REPLACE INTO companies (id, name, industry, phone, email, website, address, stage, user_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (c_id, name, ind, phone, email, web, addr, stage, uid, now_str, now_str),
        )

    # 4. Contacts (Multiple contacts per company to test 1-to-many relationship)
    contacts_data = [
        # Tesla Energy Middle East
        (
            "ct000000-0000-0000-0000-000000000001",
            "Alexander",
            "Wright",
            "alex.wright@tesla-energy.example.com",
            "+971 50 123 4567",
            "VP of Engineering",
            "c0000000-0000-0000-0000-000000000001",
            "Active",
            primary_user_id,
        ),
        (
            "ct000000-0000-0000-0000-000000000002",
            "Elena",
            "Rostova",
            "elena.r@tesla-energy.example.com",
            "+971 50 234 5678",
            "Operations Director",
            "c0000000-0000-0000-0000-000000000001",
            "Active",
            primary_user_id,
        ),
        (
            "ct000000-0000-0000-0000-000000000003",
            "Tariq",
            "Al-Mansoor",
            "tariq.m@tesla-energy.example.com",
            "+971 50 345 6789",
            "Head of Procurement",
            "c0000000-0000-0000-0000-000000000001",
            "Won",
            primary_user_id,
        ),
        # Apex Retail Global
        (
            "ct000000-0000-0000-0000-000000000004",
            "Sophia",
            "Martinez",
            "sophia.martinez@apexretail.example.com",
            "+1 415 555 0192",
            "VP Merchandising",
            "c0000000-0000-0000-0000-000000000002",
            "Contacted",
            secondary_user_id,
        ),
        (
            "ct000000-0000-0000-0000-000000000005",
            "Daniel",
            "Chen",
            "daniel.chen@apexretail.example.com",
            "+1 415 555 0184",
            "Chief Digital Officer",
            "c0000000-0000-0000-0000-000000000002",
            "Lead",
            secondary_user_id,
        ),
        # Nordic Health Systems
        (
            "ct000000-0000-0000-0000-000000000006",
            "Dr. Astrid",
            "Lindqvist",
            "astrid@nordichealth.example.com",
            "+46 8 123 4567",
            "Chief Medical Officer",
            "c0000000-0000-0000-0000-000000000003",
            "Negotiation",
            primary_user_id,
        ),
        (
            "ct000000-0000-0000-0000-000000000007",
            "Freja",
            "Sorensen",
            "freja@nordichealth.example.com",
            "+46 8 765 4321",
            "Hospital Administrator",
            "c0000000-0000-0000-0000-000000000003",
            "Won",
            primary_user_id,
        ),
        # Emirates Logistics Hub
        (
            "ct000000-0000-0000-0000-000000000008",
            "Rashid",
            "Al-Falasi",
            "rashid@emirateslogistics.example.com",
            "+971 4 800 1122",
            "Managing Director",
            "c0000000-0000-0000-0000-000000000004",
            "Active",
            secondary_user_id,
        ),
        (
            "ct000000-0000-0000-0000-000000000009",
            "Fatima",
            "Noor",
            "fatima@emirateslogistics.example.com",
            "+971 4 800 3344",
            "Supply Chain Coordinator",
            "c0000000-0000-0000-0000-000000000004",
            "Active",
            secondary_user_id,
        ),
    ]

    for ct_id, fn, ln, email, phone, title, comp_id, stage, uid in contacts_data:
        cursor.execute(
            """
            INSERT OR REPLACE INTO contacts (id, first_name, last_name, email, phone, job_title, company_id, stage, user_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (ct_id, fn, ln, email, phone, title, comp_id, stage, uid, now_str, now_str),
        )

    # 5. Deals (Across all pipeline stages, currencies, values)
    deals_data = [
        # Stage 1: New
        (
            "d0000000-0000-0000-0000-000000000001",
            "Next-Gen Fleet Telematics System",
            150000.00,
            "AED",
            "a0000000-0000-0000-0000-000000000001",
            "ct000000-0000-0000-0000-000000000008",
            "c0000000-0000-0000-0000-000000000004",
            secondary_user_id,
            (now + timedelta(days=45)).strftime("%Y-%m-%d"),
            "Complete GPS tracking, IoT fuel monitors, and predictive maintenance telemetry across 250 heavy vehicles.",
        ),
        (
            "d0000000-0000-0000-0000-000000000002",
            "Smart Energy Storage Pilot",
            75000.00,
            "USD",
            "a0000000-0000-0000-0000-000000000001",
            "ct000000-0000-0000-0000-000000000001",
            "c0000000-0000-0000-0000-000000000001",
            primary_user_id,
            (now + timedelta(days=60)).strftime("%Y-%m-%d"),
            "Proof-of-concept energy storage battery buffer for factory microgrid.",
        ),
        # Stage 2: Create papers
        (
            "d0000000-0000-0000-0000-000000000003",
            "Enterprise POS & Inventory License",
            48000.00,
            "USD",
            "a0000000-0000-0000-0000-000000000002",
            "ct000000-0000-0000-0000-000000000004",
            "c0000000-0000-0000-0000-000000000002",
            secondary_user_id,
            (now + timedelta(days=30)).strftime("%Y-%m-%d"),
            "Cloud POS terminal software licensing across 40 flagship retail storefronts.",
        ),
        # Stage 3: Invoice
        (
            "d0000000-0000-0000-0000-000000000004",
            "Clinical AI Diagnostic Integration",
            95000.00,
            "USD",
            "a0000000-0000-0000-0000-000000000003",
            "ct000000-0000-0000-0000-000000000006",
            "c0000000-0000-0000-0000-000000000003",
            primary_user_id,
            (now + timedelta(days=20)).strftime("%Y-%m-%d"),
            "Integration of pathology image analysis pipeline with hospital PACS archiving.",
        ),
        # Stage 4: In progress
        (
            "d0000000-0000-0000-0000-000000000005",
            "Cloud Infrastructure Migration & Cyber Audit",
            34000.00,
            "USD",
            "a0000000-0000-0000-0000-000000000004",
            "ct000000-0000-0000-0000-000000000005",
            "c0000000-0000-0000-0000-000000000002",
            secondary_user_id,
            (now + timedelta(days=15)).strftime("%Y-%m-%d"),
            "Zero-downtime migration of e-commerce databases with ISO 27001 vulnerability audit.",
        ),
        # Stage 5: Final invoice
        (
            "d0000000-0000-0000-0000-000000000006",
            "Automated Fulfillment Conveyor System",
            320000.00,
            "AED",
            "a0000000-0000-0000-0000-000000000005",
            "ct000000-0000-0000-0000-000000000009",
            "c0000000-0000-0000-0000-000000000004",
            secondary_user_id,
            (now + timedelta(days=7)).strftime("%Y-%m-%d"),
            "High-speed parcel sorting conveyor installation in Dubai Logistics City.",
        ),
        # Stage 6: Close deal (Won)
        (
            "d0000000-0000-0000-0000-000000000007",
            "Solar Grid Phase 2 Turnkey Installation",
            185000.00,
            "USD",
            "a0000000-0000-0000-0000-000000000006",
            "ct000000-0000-0000-0000-000000000003",
            "c0000000-0000-0000-0000-000000000001",
            primary_user_id,
            (now - timedelta(days=5)).strftime("%Y-%m-%d"),
            "Awarded contract for 1.2MW rooftop photovoltaic solar array with 10-year warranty.",
        ),
        (
            "d0000000-0000-0000-0000-000000000008",
            "Hospital Ward IoT Monitoring Contract",
            120000.00,
            "USD",
            "a0000000-0000-0000-0000-000000000006",
            "ct000000-0000-0000-0000-000000000007",
            "c0000000-0000-0000-0000-000000000003",
            primary_user_id,
            (now - timedelta(days=12)).strftime("%Y-%m-%d"),
            "Patient vital telemetry hardware rollout in 120 intensive care beds.",
        ),
        # Stage 7: Lost
        (
            "d0000000-0000-0000-0000-000000000009",
            "Legacy Warehouse RFID Pilot",
            22000.00,
            "USD",
            "a0000000-0000-0000-0000-000000000007",
            "ct000000-0000-0000-0000-000000000008",
            "c0000000-0000-0000-0000-000000000004",
            secondary_user_id,
            (now - timedelta(days=18)).strftime("%Y-%m-%d"),
            "Client postponed passive RFID tagging in favor of optical barcode scanners.",
        ),
    ]

    for d_id, title, amt, curr, stg_id, ct_id, comp_id, uid, close_dt, desc in deals_data:
        cursor.execute(
            """
            INSERT OR REPLACE INTO deals (id, title, amount, currency, stage_id, contact_id, company_id, responsible_user_id, expected_close_date, description, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (d_id, title, amt, curr, stg_id, ct_id, comp_id, uid, close_dt, desc, now_str, now_str),
        )

    # 6. Tasks (Completed, In Progress, Pending, Overdue across Urgent, High, Medium, Low)
    tasks_data = [
        # Completed on-time
        (
            "t0000000-0000-0000-0000-000000000001",
            "Deliver Architecture Design Document",
            "Finalize detailed architectural blueprint for the solar microgrid controller.",
            "completed",
            "urgent",
            "d0000000-0000-0000-0000-000000000007",
            "ct000000-0000-0000-0000-000000000001",
            "c0000000-0000-0000-0000-000000000001",
            primary_user_id,
            (now - timedelta(days=6)).strftime("%Y-%m-%d %H:%M:%S"),
            (now - timedelta(days=7)).strftime("%Y-%m-%d %H:%M:%S"),
            (now - timedelta(days=6, hours=2)).strftime("%Y-%m-%d %H:%M:%S"),
        ),
        (
            "t0000000-0000-0000-0000-000000000002",
            "Sign NDA & Data Processing Agreement",
            "Execute mutual GDPR and HIPAA compliance agreements with Dr. Astrid.",
            "completed",
            "high",
            "d0000000-0000-0000-0000-000000000004",
            "ct000000-0000-0000-0000-000000000006",
            "c0000000-0000-0000-0000-000000000003",
            primary_user_id,
            (now - timedelta(days=14)).strftime("%Y-%m-%d %H:%M:%S"),
            (now - timedelta(days=15)).strftime("%Y-%m-%d %H:%M:%S"),
            (now - timedelta(days=14, hours=1)).strftime("%Y-%m-%d %H:%M:%S"),
        ),
        # In Progress
        (
            "t0000000-0000-0000-0000-000000000003",
            "Prepare Final Commercial Invoice for Solar Grid",
            "Draft milestone payment breakdown with UAE VAT documentation.",
            "in_progress",
            "urgent",
            "d0000000-0000-0000-0000-000000000007",
            "ct000000-0000-0000-0000-000000000003",
            "c0000000-0000-0000-0000-000000000001",
            primary_user_id,
            (now + timedelta(days=2)).strftime("%Y-%m-%d %H:%M:%S"),
            now_str,
            now_str,
        ),
        (
            "t0000000-0000-0000-0000-000000000004",
            "Draft Warehouse Automation SLA Contract",
            "Define guaranteed 99.9% uptime uptime terms for conveyor sorting system.",
            "in_progress",
            "high",
            "d0000000-0000-0000-0000-000000000006",
            "ct000000-0000-0000-0000-000000000009",
            "c0000000-0000-0000-0000-000000000004",
            secondary_user_id,
            (now + timedelta(days=3)).strftime("%Y-%m-%d %H:%M:%S"),
            now_str,
            now_str,
        ),
        # Pending
        (
            "t0000000-0000-0000-0000-000000000005",
            "Follow up on POS Implementation Timeline",
            "Confirm delivery date of handheld terminals to retail distribution center.",
            "pending",
            "medium",
            "d0000000-0000-0000-0000-000000000003",
            "ct000000-0000-0000-0000-000000000004",
            "c0000000-0000-0000-0000-000000000002",
            secondary_user_id,
            (now + timedelta(days=4)).strftime("%Y-%m-%d %H:%M:%S"),
            now_str,
            now_str,
        ),
        (
            "t0000000-0000-0000-0000-000000000006",
            "Schedule Quarterly QBR with Alexander Wright",
            "Coordinate calendar invite with engineering leads for Q4 review.",
            "pending",
            "low",
            "d0000000-0000-0000-0000-000000000002",
            "ct000000-0000-0000-0000-000000000001",
            "c0000000-0000-0000-0000-000000000001",
            primary_user_id,
            (now + timedelta(days=7)).strftime("%Y-%m-%d %H:%M:%S"),
            now_str,
            now_str,
        ),
        # Overdue Tasks (Due date in past, not completed)
        (
            "t0000000-0000-0000-0000-000000000007",
            "Urgent: Resolve API Gateway Latency Incident",
            "Perform database query profile and scale read replicas for e-commerce catalog.",
            "pending",
            "urgent",
            "d0000000-0000-0000-0000-000000000005",
            "ct000000-0000-0000-0000-000000000005",
            "c0000000-0000-0000-0000-000000000002",
            secondary_user_id,
            (now - timedelta(days=2)).strftime("%Y-%m-%d %H:%M:%S"),
            (now - timedelta(days=4)).strftime("%Y-%m-%d %H:%M:%S"),
            now_str,
        ),
        (
            "t0000000-0000-0000-0000-000000000008",
            "Submit RFP Response to Emirates Logistics",
            "Complete freight telematics vendor evaluation questionnaire.",
            "pending",
            "high",
            "d0000000-0000-0000-0000-000000000001",
            "ct000000-0000-0000-0000-000000000008",
            "c0000000-0000-0000-0000-000000000004",
            secondary_user_id,
            (now - timedelta(days=3)).strftime("%Y-%m-%d %H:%M:%S"),
            (now - timedelta(days=5)).strftime("%Y-%m-%d %H:%M:%S"),
            now_str,
        ),
    ]

    for t_id, title, desc, status, priority, d_id, ct_id, comp_id, uid, due_dt, created_dt, upd_dt in tasks_data:
        cursor.execute(
            """
            INSERT OR REPLACE INTO tasks (id, title, description, status, priority, deal_id, contact_id, company_id, assigned_to_id, due_date, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (t_id, title, desc, status, priority, d_id, ct_id, comp_id, uid, due_dt, created_dt, upd_dt),
        )

    # 7. Activities (meeting, call, email, follow_up, note in completed and scheduled states)
    activities_data = [
        # Meetings
        (
            "ac000000-0000-0000-0000-000000000001",
            "meeting",
            "Executive Board Meeting: Solar Deployment Kickoff",
            "Presented phase 2 turnkey engineering milestones and EPC safety certification to Tariq Al-Mansoor.",
            1,  # completed
            "d0000000-0000-0000-0000-000000000007",
            "ct000000-0000-0000-0000-000000000003",
            "c0000000-0000-0000-0000-000000000001",
            primary_user_id,
            (now - timedelta(days=5, hours=3)).strftime("%Y-%m-%d %H:%M:%S"),
            (now - timedelta(days=6)).strftime("%Y-%m-%d %H:%M:%S"),
        ),
        (
            "ac000000-0000-0000-0000-000000000002",
            "meeting",
            "Quarterly Pipeline Review & Product Demo",
            "Live demonstration of multichannel inventory synchronization for flagship retail store managers.",
            0,  # pending / scheduled
            "d0000000-0000-0000-0000-000000000003",
            "ct000000-0000-0000-0000-000000000004",
            "c0000000-0000-0000-0000-000000000002",
            secondary_user_id,
            (now + timedelta(days=2, hours=4)).strftime("%Y-%m-%d %H:%M:%S"),
            now_str,
        ),
        # Calls
        (
            "ac000000-0000-0000-0000-000000000003",
            "call",
            "Discovery Call with Dr. Astrid Lindqvist",
            "Discussed FHIR interoperability standards and hospital cybersecurity protocols.",
            1,  # completed
            "d0000000-0000-0000-0000-000000000004",
            "ct000000-0000-0000-0000-000000000006",
            "c0000000-0000-0000-0000-000000000003",
            primary_user_id,
            (now - timedelta(days=8, hours=2)).strftime("%Y-%m-%d %H:%M:%S"),
            (now - timedelta(days=9)).strftime("%Y-%m-%d %H:%M:%S"),
        ),
        (
            "ac000000-0000-0000-0000-000000000004",
            "call",
            "Contract Negotiation Call with Tariq Al-Mansoor",
            "Review payment milestones and warranty penalty clauses.",
            0,  # pending / scheduled
            "d0000000-0000-0000-0000-000000000007",
            "ct000000-0000-0000-0000-000000000003",
            "c0000000-0000-0000-0000-000000000001",
            primary_user_id,
            (now + timedelta(days=1, hours=3)).strftime("%Y-%m-%d %H:%M:%S"),
            now_str,
        ),
        # Emails
        (
            "ac000000-0000-0000-0000-000000000005",
            "email",
            "Send Enterprise Architecture Blueprint & Pricing",
            "Dispatched comprehensive 35-page proposal PDF and SLA agreement.",
            1,  # completed
            "d0000000-0000-0000-0000-000000000002",
            "ct000000-0000-0000-0000-000000000001",
            "c0000000-0000-0000-0000-000000000001",
            primary_user_id,
            (now - timedelta(days=3)).strftime("%Y-%m-%d %H:%M:%S"),
            (now - timedelta(days=3)).strftime("%Y-%m-%d %H:%M:%S"),
        ),
        (
            "ac000000-0000-0000-0000-000000000006",
            "email",
            "Follow-up email regarding security questionnaire",
            "Confirmed SOC2 Type II compliance report download link sent to Daniel Chen.",
            1,  # completed
            "d0000000-0000-0000-0000-000000000005",
            "ct000000-0000-0000-0000-000000000005",
            "c0000000-0000-0000-0000-000000000002",
            secondary_user_id,
            (now - timedelta(days=2)).strftime("%Y-%m-%d %H:%M:%S"),
            (now - timedelta(days=2)).strftime("%Y-%m-%d %H:%M:%S"),
        ),
        # Follow-up
        (
            "ac000000-0000-0000-0000-000000000007",
            "follow_up",
            "Check-in on legal review of SLA",
            "Ensure corporate counsel has approved the revised liability terms.",
            0,  # pending / scheduled
            "d0000000-0000-0000-0000-000000000001",
            "ct000000-0000-0000-0000-000000000008",
            "c0000000-0000-0000-0000-000000000004",
            secondary_user_id,
            (now + timedelta(days=4)).strftime("%Y-%m-%d %H:%M:%S"),
            now_str,
        ),
        # Internal Note
        (
            "ac000000-0000-0000-0000-000000000008",
            "note",
            "Client prefers quarterly milestone billing in AED",
            "Noted that all cross-border wire transfers will be handled through Emirates NBD.",
            1,  # completed
            "d0000000-0000-0000-0000-000000000007",
            "ct000000-0000-0000-0000-000000000003",
            "c0000000-0000-0000-0000-000000000001",
            primary_user_id,
            now_str,
            now_str,
        ),
    ]

    for ac_id, a_type, subject, notes, is_comp, d_id, ct_id, comp_id, uid, sched_dt, created_dt in activities_data:
        cursor.execute(
            """
            INSERT OR REPLACE INTO activities (id, type, subject, notes, is_completed, deal_id, contact_id, company_id, user_id, scheduled_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (ac_id, a_type, subject, notes, is_comp, d_id, ct_id, comp_id, uid, sched_dt, created_dt, now_str),
        )

    conn.commit()
    conn.close()
    print(f"Successfully seeded sample CRM data into {db_path}!")


def main():
    import os
    for path in DB_PATHS:
        if os.path.exists(path) or "backend" not in path:
            seed_database(path)


if __name__ == "__main__":
    main()

