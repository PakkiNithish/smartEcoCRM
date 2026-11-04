import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string, currency = "INR"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  const curr = currency || "INR";
  if (isNaN(num)) {
    return curr === "INR" ? "₹0.00" : `${curr} 0.00`;
  }
  try {
    const locale = curr === "INR" ? "en-IN" : curr === "AED" ? "en-AE" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: curr,
      minimumFractionDigits: 2,
    }).format(num);
  } catch {
    if (curr === "INR") return `₹${num.toFixed(2)}`;
    return `${curr} ${num.toFixed(2)}`;
  }
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "No date";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function getContactName(contact?: { first_name?: string; last_name?: string; full_name?: string | null } | null): string {
  if (!contact) return "";
  if (contact.full_name) return contact.full_name;
  return `${contact.first_name || ""} ${contact.last_name || ""}`.trim();
}

/**
 * Extracts and normalizes the base domain from a website URL.
 * e.g., 'https://www.google.com/about' -> 'google.com'
 *       'http://google.com' -> 'google.com'
 *       'www.google.com' -> 'google.com'
 *       'google.com' -> 'google.com'
 */
export function extractDomain(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  let cleaned = url.trim().toLowerCase();
  if (!cleaned) return null;

  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(cleaned)) {
    cleaned = "http://" + cleaned;
  }

  try {
    const parsed = new URL(cleaned);
    let host = parsed.hostname;
    if (host.startsWith("www.")) {
      host = host.slice(4);
    }
    return host.trim() || null;
  } catch {
    cleaned = cleaned.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "");
    cleaned = cleaned.split("/")[0].split("?")[0].split("#")[0].split(":")[0];
    if (cleaned.startsWith("www.")) {
      cleaned = cleaned.slice(4);
    }
    return cleaned.trim() || null;
  }
}

/**
 * Extracts only digits for phone number comparison.
 */
export function normalizePhone(phone?: string | null): string | null {
  if (!phone || typeof phone !== "string") return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 7 ? digits : null;
}
