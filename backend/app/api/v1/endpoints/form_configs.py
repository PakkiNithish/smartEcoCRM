from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_active_user, get_db, require_role
from backend.app.models.form_config import FormConfig
from backend.app.models.user import User
from backend.app.schemas.form_config import FormConfigResponse, FormConfigUpdateRequest

router = APIRouter()

DEFAULT_CONFIGS: Dict[str, List[Dict[str, Any]]] = {
    "deal": [
        {"key": "title", "label": "Deal Title", "type": "text", "required": True, "enabled": True, "is_custom": False, "placeholder": "e.g., Enterprise Software Contract"},
        {"key": "amount", "label": "Deal Amount", "type": "number", "required": False, "enabled": True, "is_custom": False, "placeholder": "0.00"},
        {"key": "currency", "label": "Currency", "type": "select", "options": ["USD", "EUR", "GBP", "INR", "AED", "CAD", "AUD"], "required": True, "enabled": True, "is_custom": False},
        {"key": "stage_id", "label": "Pipeline Stage", "type": "select", "required": True, "enabled": True, "is_custom": False},
        {"key": "contact_id", "label": "Contact", "type": "select", "required": False, "enabled": True, "is_custom": False},
        {"key": "company_id", "label": "Company", "type": "select", "required": False, "enabled": True, "is_custom": False},
        {"key": "expected_close_date", "label": "Expected Close Date", "type": "date", "required": False, "enabled": True, "is_custom": False},
        {"key": "description", "label": "Description / Notes", "type": "textarea", "required": False, "enabled": True, "is_custom": False, "placeholder": "Additional deal details..."},
    ],
    "contact": [
        {"key": "salutation", "label": "Salutation", "type": "select", "options": ["Not selected", "Mr.", "Ms.", "Mrs.", "Dr.", "Prof."], "required": False, "enabled": True, "is_custom": False},
        {"key": "last_name", "label": "Last name", "type": "text", "required": False, "enabled": True, "is_custom": False, "placeholder": "Contact #"},
        {"key": "first_name", "label": "Name", "type": "text", "required": True, "enabled": True, "is_custom": False, "placeholder": "First name"},
        {"key": "stage", "label": "Stage", "type": "select", "options": ["Not Contacted", "Contacted (LinkedIn & Email )", "Follow-up Required", "Meeting Scheduled & Discussion", "Proposal Shared", "Negotiation", "Deal Won", "Lost / Not Interested"], "required": False, "enabled": True, "is_custom": False},
        {"key": "second_name", "label": "Second name", "type": "text", "required": False, "enabled": True, "is_custom": False, "placeholder": "Middle / second name"},
        {"key": "photo", "label": "Photo", "type": "text", "required": False, "enabled": True, "is_custom": False, "placeholder": "Photo URL / Avatar"},
        {"key": "date_of_birth", "label": "Date of birth", "type": "date", "required": False, "enabled": True, "is_custom": False},
        {"key": "job_title", "label": "Position", "type": "text", "required": False, "enabled": True, "is_custom": False, "placeholder": "VP of Operations"},
        {"key": "phone", "label": "Phone", "type": "text", "required": False, "enabled": True, "is_custom": False, "placeholder": "+91 98765 43210"},
        {"key": "email", "label": "Email", "type": "text", "required": False, "enabled": True, "is_custom": False, "placeholder": "jane.doe@example.com"},
        {"key": "company_id", "label": "Company", "type": "select", "required": False, "enabled": True, "is_custom": False},
        {"key": "website", "label": "Website", "type": "text", "required": False, "enabled": True, "is_custom": False, "placeholder": "https://example.com"},
        {"key": "messenger", "label": "Messenger", "type": "text", "required": False, "enabled": True, "is_custom": False, "placeholder": "Telegram/WhatsApp ID"},
        {"key": "address", "label": "Contact Address", "type": "text", "required": False, "enabled": True, "is_custom": False, "placeholder": "City, State, Country"},
        {"key": "details", "label": "Banking & Requisites", "type": "textarea", "required": False, "enabled": False, "is_custom": False, "placeholder": "Tax ID, Bank requisites..."},
        {"key": "linkedin", "label": "Linkedin link", "type": "text", "required": False, "enabled": True, "is_custom": False, "placeholder": "https://linkedin.com/in/..."},
        {"key": "contact_type", "label": "Contact type", "type": "select", "options": ["Clients", "Partners", "Suppliers", "Other"], "required": False, "enabled": True, "is_custom": False},
        {"key": "source", "label": "Source", "type": "select", "options": ["Call", "Web", "Email", "Advertising", "Referral", "Other"], "required": False, "enabled": True, "is_custom": False},
        {"key": "source_info", "label": "Source information", "type": "text", "required": False, "enabled": True, "is_custom": False, "placeholder": "Additional source details..."},
        {"key": "available_to_everyone", "label": "Available to everyone", "type": "checkbox", "required": False, "enabled": True, "is_custom": False},
        {"key": "included_in_export", "label": "Included in export", "type": "checkbox", "required": False, "enabled": True, "is_custom": False},
        {"key": "comment", "label": "Comment / Notes", "type": "textarea", "required": False, "enabled": True, "is_custom": False, "placeholder": "Internal notes or remarks..."},
    ],
    "company": [
        {"key": "name", "label": "Company Name", "type": "text", "required": True, "enabled": True, "is_custom": False, "placeholder": "e.g., Acme Innovations Ltd."},
        {"key": "stage", "label": "Stage", "type": "select", "options": ["Not Contacted", "Contacted (LinkedIn & Email )", "Responded", "Meeting Scheduled & Discussion", "Proposal Shared", "Negotiation", "Deal Won", "Lost / Not Interested"], "required": False, "enabled": True, "is_custom": False},
        {"key": "company_type", "label": "Company type", "type": "select", "options": ["Client", "Partner", "Supplier", "Competitor", "Other"], "required": False, "enabled": True, "is_custom": False},
        {"key": "industry", "label": "Industry", "type": "select", "options": ["Information Technology", "Manufacturing", "Sustainability", "Real Estate & Offices", "Education", "Healthcare", "Financial Services", "Retail", "Other"], "required": False, "enabled": True, "is_custom": False},
        {"key": "annual_revenue", "label": "Annual revenue", "type": "number", "required": False, "enabled": True, "is_custom": False, "placeholder": "0.00"},
        {"key": "currency", "label": "Currency", "type": "select", "options": ["INR", "AED", "USD", "EUR", "GBP"], "required": False, "enabled": True, "is_custom": False},
        {"key": "phone", "label": "Main Phone", "type": "text", "required": False, "enabled": True, "is_custom": False, "placeholder": "+1 800-555-0100"},
        {"key": "email", "label": "Company Email", "type": "text", "required": False, "enabled": True, "is_custom": False, "placeholder": "contact@acme.com"},
        {"key": "website", "label": "Website", "type": "text", "required": True, "enabled": True, "is_custom": False, "placeholder": "https://www.acme.com"},
        {"key": "messenger", "label": "Messenger", "type": "text", "required": False, "enabled": True, "is_custom": False, "placeholder": "Corporate messenger handle"},
        {"key": "address", "label": "Office Address", "type": "textarea", "required": False, "enabled": True, "is_custom": False, "placeholder": "123 Business Way, Suite 400"},
        {"key": "details", "label": "Banking & Requisites", "type": "textarea", "required": False, "enabled": False, "is_custom": False, "placeholder": "Tax ID, Bank requisites..."},
        {"key": "contact", "label": "Company contacts", "type": "select", "required": False, "enabled": True, "is_custom": False},
        {"key": "linkedin", "label": "Company Linkedin link", "type": "text", "required": False, "enabled": True, "is_custom": False, "placeholder": "https://linkedin.com/company/..."},
        {"key": "tags", "label": "Tags", "type": "text", "required": False, "enabled": True, "is_custom": False, "placeholder": "Keywords, tags..."},
        {"key": "employees_count", "label": "Employees count", "type": "select", "options": ["less than 50", "50-250", "250-1000", "over 1000"], "required": False, "enabled": True, "is_custom": False},
        {"key": "available_to_everyone", "label": "Available to everyone", "type": "checkbox", "required": False, "enabled": True, "is_custom": False},
        {"key": "included_in_export", "label": "Included in export", "type": "checkbox", "required": False, "enabled": True, "is_custom": False},
        {"key": "comment", "label": "Comment / Notes", "type": "textarea", "required": False, "enabled": True, "is_custom": False, "placeholder": "Corporate notes..."},
    ],
    "task": [
        {"key": "title", "label": "Task Title", "type": "text", "required": True, "enabled": True, "is_custom": False, "placeholder": "What needs to be done?"},
        {"key": "description", "label": "Description", "type": "textarea", "required": False, "enabled": True, "is_custom": False, "placeholder": "Task details..."},
        {"key": "status", "label": "Status", "type": "select", "options": ["pending", "in_progress", "completed", "cancelled"], "required": False, "enabled": True, "is_custom": False},
        {"key": "priority", "label": "Priority", "type": "select", "options": ["low", "medium", "high", "urgent"], "required": False, "enabled": True, "is_custom": False},
        {"key": "due_date", "label": "Due Date", "type": "date", "required": False, "enabled": True, "is_custom": False},
        {"key": "assigned_to_id", "label": "Responsible Person", "type": "select", "required": False, "enabled": True, "is_custom": False},
        {"key": "deal_id", "label": "Deal", "type": "select", "required": False, "enabled": True, "is_custom": False},
        {"key": "contact_id", "label": "Contact", "type": "select", "required": False, "enabled": True, "is_custom": False},
        {"key": "company_id", "label": "Company", "type": "select", "required": False, "enabled": True, "is_custom": False},
    ],
    "activity": [
        {"key": "type", "label": "Activity Type", "type": "select", "options": ["call", "meeting", "email", "note", "follow_up"], "required": True, "enabled": True, "is_custom": False},
        {"key": "subject", "label": "Subject / Title", "type": "text", "required": True, "enabled": True, "is_custom": False, "placeholder": "e.g., Follow-up Call"},
        {"key": "notes", "label": "Notes / Description", "type": "textarea", "required": False, "enabled": True, "is_custom": False, "placeholder": "Meeting notes, call log..."},
        {"key": "scheduled_at", "label": "Scheduled Date & Time", "type": "date", "required": False, "enabled": True, "is_custom": False},
        {"key": "is_completed", "label": "Completed", "type": "checkbox", "required": False, "enabled": True, "is_custom": False},
        {"key": "user_id", "label": "Responsible User", "type": "select", "required": False, "enabled": True, "is_custom": False},
        {"key": "deal_id", "label": "Deal", "type": "select", "required": False, "enabled": True, "is_custom": False},
        {"key": "contact_id", "label": "Contact", "type": "select", "required": False, "enabled": True, "is_custom": False},
        {"key": "company_id", "label": "Company", "type": "select", "required": False, "enabled": True, "is_custom": False},
    ],
}


@router.get(
    "/{entity_type}",
    response_model=FormConfigResponse,
    summary="Get form configuration and custom fields for an entity type",
)
async def get_form_config(
    entity_type: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve the creation form configuration for deals, contacts, or companies."""
    entity_type = entity_type.lower().strip()
    if entity_type not in DEFAULT_CONFIGS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invalid entity type '{entity_type}'. Must be one of: {list(DEFAULT_CONFIGS.keys())}",
        )

    company = current_user.company_name or "default"
    stmt = select(FormConfig).where(
        FormConfig.company_name == company,
        FormConfig.entity_type == entity_type,
    )
    saved_config = await db.scalar(stmt)

    if saved_config:
        saved_keys = {f.get("key") for f in saved_config.fields_config if isinstance(f, dict)}
        merged_fields = list(saved_config.fields_config)
        for def_field in DEFAULT_CONFIGS[entity_type]:
            if def_field["key"] not in saved_keys:
                merged_fields.append(def_field)

        # Ensure stage is present in section options if sections are defined
        section_covered_keys = set()
        for f in merged_fields:
            if isinstance(f, dict) and (f.get("type") == "section" or str(f.get("key", "")).startswith("__section__")):
                opts = f.get("options")
                if isinstance(opts, list):
                    section_covered_keys.update(opts)
        if section_covered_keys and "stage" not in section_covered_keys:
            for f in merged_fields:
                if isinstance(f, dict) and f.get("key") == "__section__about" and isinstance(f.get("options"), list):
                    target_after = "name" if entity_type == "company" else "last_name"
                    opts = f["options"]
                    insert_idx = (opts.index(target_after) + 1) if target_after in opts else 0
                    opts.insert(insert_idx, "stage")
                    break

        return FormConfigResponse(
            entity_type=entity_type,
            company_name=company,
            fields_config=merged_fields,
        )

    return FormConfigResponse(
        entity_type=entity_type,
        company_name=company,
        fields_config=DEFAULT_CONFIGS[entity_type],
    )


@router.put(
    "/{entity_type}",
    response_model=FormConfigResponse,
    summary="Update form configuration and custom fields for an entity type",
)
async def update_form_config(
    entity_type: str,
    update_data: FormConfigUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Updates the form configuration (toggles fields, adds custom fields) for the company workspace."""
    entity_type = entity_type.lower().strip()
    if entity_type not in DEFAULT_CONFIGS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invalid entity type '{entity_type}'. Must be one of: {list(DEFAULT_CONFIGS.keys())}",
        )

    company = current_user.company_name or "default"
    stmt = select(FormConfig).where(
        FormConfig.company_name == company,
        FormConfig.entity_type == entity_type,
    )
    existing = await db.scalar(stmt)

    if existing:
        existing.fields_config = update_data.fields_config
        await db.commit()
        await db.refresh(existing)
        return FormConfigResponse(
            entity_type=entity_type,
            company_name=company,
            fields_config=existing.fields_config,
        )

    new_config = FormConfig(
        company_name=company,
        entity_type=entity_type,
        fields_config=update_data.fields_config,
    )
    db.add(new_config)
    await db.commit()
    await db.refresh(new_config)
    return FormConfigResponse(
        entity_type=entity_type,
        company_name=company,
        fields_config=new_config.fields_config,
    )
