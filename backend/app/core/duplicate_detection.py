import re
import uuid
from typing import Optional
from urllib.parse import urlparse
from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.company import Company
from backend.app.models.contact import Contact


def extract_domain(url: Optional[str]) -> Optional[str]:
    """Extract clean base domain from a website URL.
    
    Examples:
        'https://www.google.com/about' -> 'google.com'
        'http://google.com/' -> 'google.com'
        'www.google.com' -> 'google.com'
        'google.com' -> 'google.com'
        'https://sub.domain.co.uk' -> 'sub.domain.co.uk'
        'https://google.com:8080/path' -> 'google.com'
    """
    if not url or not isinstance(url, str):
        return None
    cleaned = url.strip().lower()
    if not cleaned:
        return None

    # Prepend scheme if absent so urlparse can reliably parse host
    if not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", cleaned):
        cleaned = "http://" + cleaned

    try:
        parsed = urlparse(cleaned)
        host = parsed.netloc or parsed.path.split("/")[0]

        # Strip user:password credentials if present
        if "@" in host:
            host = host.split("@")[-1]

        # Strip port number
        host = host.split(":")[0]

        # Strip leading 'www.'
        if host.startswith("www."):
            host = host[4:]

        host = host.strip()
        # Must have at least a label and a domain dot (e.g. acme.com or localhost)
        if not host:
            return None
        return host
    except Exception:
        return None


def normalize_phone(phone: Optional[str]) -> Optional[str]:
    """Extract digits only for phone comparison (minimum 7 digits)."""
    if not phone or not isinstance(phone, str):
        return None
    digits = re.sub(r"\D", "", phone)
    return digits if len(digits) >= 7 else None


async def check_company_duplicate(
    db: AsyncSession,
    website: str,
    exclude_id: Optional[uuid.UUID] = None,
    workspace: Optional[str] = None,
    user_id: Optional[uuid.UUID] = None,
    is_admin: bool = False,
) -> str:
    """Verify website URL is valid and its domain does not conflict with existing company in the workspace.
    
    Returns the extracted normalized domain on success.
    Raises HTTPException 400 for invalid website or 409 for duplicate domain conflict.
    """
    domain = extract_domain(website)
    if not domain or ("." not in domain and domain != "localhost"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid corporate website URL with domain is required (e.g. acme.com or https://www.acme.com)",
        )

    query = select(Company).where(Company.website.isnot(None))
    if exclude_id:
        query = query.where(Company.id != exclude_id)

    if workspace:
        query = query.where(Company.company_name == workspace)
    elif user_id and not is_admin:
        query = query.where(Company.user_id == user_id)

    result = await db.execute(query)
    existing_companies = result.scalars().all()

    for comp in existing_companies:
        if comp.website:
            comp_domain = extract_domain(comp.website)
            if comp_domain and comp_domain == domain:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Duplicate company detected: A company with website domain '{domain}' "
                        f"already exists ('{comp.name}')."
                    ),
                )

    return domain


async def check_contact_duplicate(
    db: AsyncSession,
    first_name: str,
    last_name: str,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    exclude_id: Optional[uuid.UUID] = None,
    workspace: Optional[str] = None,
    user_id: Optional[uuid.UUID] = None,
    is_admin: bool = False,
) -> None:
    """Check for duplicate contacts in workspace based on:
    1. First Name + Last Name (case-insensitive exact match)
    2. Email address (when provided, normalized case-insensitive)
    3. Phone number (when provided, digits-only normalized match)
    
    Raises HTTPException 409 for duplicate contact conflict.
    """
    fn_clean = (first_name or "").strip().lower()
    ln_clean = (last_name or "").strip().lower()
    em_clean = (email or "").strip().lower() if email and email.strip() else None
    ph_digits = normalize_phone(phone)

    query = select(Contact)
    if exclude_id:
        query = query.where(Contact.id != exclude_id)

    if workspace:
        query = query.where(Contact.company_name == workspace)
    elif user_id and not is_admin:
        query = query.where(Contact.user_id == user_id)

    result = await db.execute(query)
    existing_contacts = result.scalars().all()

    for c in existing_contacts:
        c_fn = (c.first_name or "").strip().lower()
        c_ln = (c.last_name or "").strip().lower()

        # 1. Match First Name + Last Name
        if fn_clean and ln_clean and fn_clean == c_fn and ln_clean == c_ln:
            company_info = f" (Company: {c.company.name})" if getattr(c, "company", None) else ""
            email_info = f", {c.email}" if c.email else ""
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Duplicate contact detected: A contact with the name '{c.first_name} {c.last_name}' "
                    f"already exists{company_info}{email_info}."
                ),
            )

        # 2. Match Email Address
        if em_clean and c.email:
            c_em = c.email.strip().lower()
            if em_clean == c_em:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Duplicate contact detected: A contact with email '{c.email}' "
                        f"already exists ({c.first_name} {c.last_name})."
                    ),
                )

        # 3. Match Phone Number
        if ph_digits and c.phone:
            c_ph_digits = normalize_phone(c.phone)
            if c_ph_digits and ph_digits == c_ph_digits:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Duplicate contact detected: A contact with phone '{c.phone}' "
                        f"already exists ({c.first_name} {c.last_name})."
                    ),
                )

