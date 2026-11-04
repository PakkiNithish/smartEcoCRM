"use client";

import React, { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Contact, Company, ContactCreateInput, ContactUpdateInput, FormFieldConfig } from "@/types/crm";
import { api, ApiError } from "@/lib/api-client";
import {
  Loader2,
  AlertCircle,
  Building2,
  Mail,
  Phone,
  Briefcase,
  Pencil,
  Calendar,
  X,
  Upload,
  ChevronDown,
  Plus,
  Clock,
  CheckSquare,
} from "lucide-react";
import dynamic from "next/dynamic";
import { FormFieldWrapper } from "./form-field-wrapper";
import { FormBuilderActions } from "./form-builder-actions";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DEFAULT_CONTACT_FIELDS, CONTACT_STAGES } from "@/lib/form-defaults";
import { normalizePhone } from "@/lib/utils";

const CompanyForm = dynamic(
  () => import("./company-form").then((m) => m.CompanyForm),
  { ssr: false }
);

interface ContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContact?: Contact | null;
  defaultCompanyId?: string | null;
  onSuccess: (contact: Contact) => void;
}

const COUNTRY_CODES = [
  { code: "+91", label: "🇮🇳 +91 (India)" },
  { code: "+1", label: "🇺🇸 +1 (USA/Canada)" },
  { code: "+44", label: "🇬🇧 +44 (UK)" },
  { code: "+971", label: "🇦🇪 +971 (UAE)" },
  { code: "+61", label: "🇦🇺 +61 (Australia)" },
  { code: "+49", label: "🇩🇪 +49 (Germany)" },
  { code: "+65", label: "🇸🇬 +65 (Singapore)" },
];

const PHONE_TYPES = ["Work Phone", "Mobile Phone", "Home Phone", "Other"];

export function ContactForm({
  open,
  onOpenChange,
  initialContact,
  defaultCompanyId,
  onSuccess,
}: ContactFormProps) {
  const isEditing = !!initialContact;

  // Form Standard Fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [stage, setStage] = useState<string>("Not Contacted");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("+91");
  const [phoneType, setPhoneType] = useState("Work Phone");
  const [jobTitle, setJobTitle] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);

  // Extra screenshot fields & custom fields
  const [salutation, setSalutation] = useState("Not selected");
  const [secondName, setSecondName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [customFields, setCustomFields] = useState<Record<string, any>>({});

  // Initial Activity & Task Options (When creating new contact)
  const [scheduleActivity, setScheduleActivity] = useState(false);
  const [activityType, setActivityType] = useState("call");
  const [activitySubject, setActivitySubject] = useState("");
  const [activityDate, setActivityDate] = useState("");

  const [scheduleTask, setScheduleTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");

  // Dynamic Form Config
  const [formConfig, setFormConfig] = useState<FormFieldConfig[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("crm_form_config_contact");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const keys = new Set(parsed.map((f: any) => f.key));
            const merged = [...parsed];
            DEFAULT_CONTACT_FIELDS.forEach((def) => {
              if (!keys.has(def.key)) merged.push(def);
            });
            return merged;
          }
        }
      } catch {}
    }
    return [...DEFAULT_CONTACT_FIELDS];
  });

  // Companies lookup
  const [companies, setCompanies] = useState<Company[]>([]);
  const [existingContacts, setExistingContacts] = useState<Contact[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // Status & Validation
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Initialize or reset form
  useEffect(() => {
    if (open) {
      setErrors({});
      setApiError(null);

      if (initialContact) {
        setFirstName(initialContact.first_name || "");
        setLastName(initialContact.last_name || "");
        setStage(initialContact.stage || "Not Contacted");
        setEmail(initialContact.email || "");

        // Parse phone
        const rawPhone = initialContact.phone || "";
        const matchedCountry = COUNTRY_CODES.find((c) => rawPhone.startsWith(c.code));
        if (matchedCountry) {
          setPhoneCountry(matchedCountry.code);
          setPhone(rawPhone.slice(matchedCountry.code.length).trim());
        } else {
          setPhone(rawPhone);
        }

        setJobTitle(initialContact.job_title || "");
        setCompanyId(initialContact.company_id || "");

        const cf = initialContact.custom_fields || {};
        setSalutation(cf.salutation || "Not selected");
        setSecondName(cf.second_name || "");
        setDateOfBirth(cf.date_of_birth ? cf.date_of_birth.substring(0, 10) : "");
        setPhotoUrl(cf.photo || "");
        setPhoneType(cf.phone_type || "Work Phone");
        setCustomFields(cf);
      } else {
        setFirstName("");
        setLastName("");
        setStage("Not Contacted");
        setEmail("");
        setPhone("");
        setPhoneCountry("+91");
        setPhoneType("Work Phone");
        setJobTitle("");
        setCompanyId(defaultCompanyId || "");
        setSalutation("Not selected");
        setSecondName("");
        setDateOfBirth("");
        setPhotoUrl("");
        setCustomFields({});
        setScheduleActivity(false);
        setActivityType("call");
        setActivitySubject("");
        setActivityDate("");
        setScheduleTask(false);
        setTaskTitle("");
        setTaskDueDate("");
        setTaskPriority("medium");
      }

      loadLookups();
    }
  }, [open, initialContact, defaultCompanyId]);

  async function loadLookups() {
    setLoadingCompanies(true);
    try {
      // Check cached config first
      let cachedConfig: FormFieldConfig[] | null = null;
      try {
        const raw = localStorage.getItem("crm_form_config_contact");
        if (raw) cachedConfig = JSON.parse(raw);
      } catch {}

      const [compRes, cfgRes, contRes] = await Promise.allSettled([
        api.getCompanies({ limit: 100 }),
        api.getFormConfig("contact"),
        api.getContacts({ limit: 100 }),
      ]);

      if (compRes.status === "fulfilled") {
        setCompanies(compRes.value.items);
      }

      if (contRes.status === "fulfilled") {
        setExistingContacts(contRes.value.items);
      }

      if (cfgRes.status === "fulfilled" && cfgRes.value?.fields_config) {
        const cleanFields = cfgRes.value.fields_config.filter(
          (f: any) => !f.key?.startsWith("__section__") && f.type !== "section"
        );
        DEFAULT_CONTACT_FIELDS.forEach((def) => {
          if (!cleanFields.some((f: any) => f.key === def.key)) {
            cleanFields.push(def);
          }
        });
        const backendKeys = new Set(cleanFields.map((f: FormFieldConfig) => f.key));
        const merged = [...cleanFields];
        if (cachedConfig && Array.isArray(cachedConfig)) {
          cachedConfig.forEach((c) => {
            if (c.is_custom && !backendKeys.has(c.key)) {
              merged.push(c);
            }
          });
        }
        setFormConfig(merged);
        try {
          localStorage.setItem("crm_form_config_contact", JSON.stringify(merged));
        } catch {}
      } else if (cachedConfig && Array.isArray(cachedConfig) && cachedConfig.length > 0) {
        const mergedCached = [...cachedConfig];
        DEFAULT_CONTACT_FIELDS.forEach((def) => {
          if (!mergedCached.some((f) => f.key === def.key)) {
            mergedCached.push(def);
          }
        });
        setFormConfig(mergedCached);
      }
    } catch {
      // Ignored non-fatal
    } finally {
      setLoadingCompanies(false);
    }
  }

  // Sync Form Configuration
  async function updateFormConfigAndSync(updated: FormFieldConfig[]) {
    setFormConfig(updated);
    try {
      localStorage.setItem("crm_form_config_contact", JSON.stringify(updated));
    } catch {}

    try {
      await api.updateFormConfig("contact", updated);
    } catch (err) {
      console.error("Failed to sync contact form config:", err);
    }
  }

  // Field Config Actions
  function toggleFieldRequired(key: string) {
    const updated = formConfig.map((f) =>
      f.key === key ? { ...f, required: !f.required } : f
    );
    updateFormConfigAndSync(updated);
  }

  function removeFieldFromForm(key: string) {
    const updated = formConfig.map((f) =>
      f.key === key ? { ...f, enabled: false } : f
    );
    updateFormConfigAndSync(updated);
  }

  function addFieldToForm(key: string) {
    const existing = formConfig.find((f) => f.key === key);
    let updated: FormFieldConfig[];
    if (existing) {
      updated = formConfig.map((f) => (f.key === key ? { ...f, enabled: true } : f));
    } else {
      const def = DEFAULT_CONTACT_FIELDS.find((f) => f.key === key);
      if (def) {
        updated = [...formConfig, { ...def, enabled: true }];
      } else {
        return;
      }
    }
    updateFormConfigAndSync(updated);
  }

  function deleteField(key: string) {
    const updated = formConfig.filter((f) => f.key !== key);
    updateFormConfigAndSync(updated);
    const newCf = { ...customFields };
    delete newCf[key];
    setCustomFields(newCf);
  }

  function createCustomField(newField: FormFieldConfig) {
    const updated = [...formConfig, newField];
    updateFormConfigAndSync(updated);
    setCustomFields((prev) => ({
      ...prev,
      [newField.key]: newField.type === "checkbox" ? false : "",
    }));
  }

  function getField(key: string): FormFieldConfig | undefined {
    return (
      formConfig.find((f) => f.key === key) ||
      DEFAULT_CONTACT_FIELDS.find((f) => f.key === key)
    );
  }

  function getFieldLabel(key: string, defVal: string): string {
    const f = getField(key);
    return f?.label || defVal;
  }

  function getFieldOptions(key: string, defVal: string[] = []): string[] {
    const f = getField(key);
    return f?.options && f.options.length > 0 ? f.options : defVal;
  }

  function updateFieldConfig(
    key: string,
    updates: {
      label?: string;
      options?: string[];
      required?: boolean;
      placeholder?: string;
    }
  ) {
    const updated = formConfig.map((f) => {
      if (f.key === key) {
        return {
          ...f,
          ...(updates.label !== undefined ? { label: updates.label } : {}),
          ...(updates.options !== undefined ? { options: updates.options } : {}),
          ...(updates.required !== undefined ? { required: updates.required } : {}),
          ...(updates.placeholder !== undefined ? { placeholder: updates.placeholder } : {}),
        };
      }
      return f;
    });
    updateFormConfigAndSync(updated);
  }

  function isEnabled(key: string, defVal = true): boolean {
    if (formConfig.length === 0) return defVal;
    const f = getField(key);
    return f ? Boolean(f.enabled) : defVal;
  }

  function isRequired(key: string, defVal = false): boolean {
    const f = getField(key);
    return f ? Boolean(f.required) : defVal;
  }

  function validate() {
    const errs: { [key: string]: string } = {};

    if (isEnabled("first_name", true) && isRequired("first_name", true) && !firstName.trim()) {
      errs.firstName = "Name is required";
    }

    if (isEnabled("last_name", true) && isRequired("last_name", false) && !lastName.trim()) {
      errs.lastName = "Last name is required";
    }

    if (isEnabled("second_name", true) && isRequired("second_name", false) && !secondName.trim()) {
      errs.secondName = "Second name is required";
    }

    if (isEnabled("email", true)) {
      if (email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          errs.email = "Please enter a valid email address";
        }
      } else if (isRequired("email", false)) {
        errs.email = "Email is required";
      }
    }

    if (isEnabled("phone", true) && isRequired("phone", false) && !phone.trim()) {
      errs.phone = "Phone number is required";
    }

    if (isEnabled("job_title", true) && isRequired("job_title", false) && !jobTitle.trim()) {
      errs.jobTitle = "Position is required";
    }

    if (isEnabled("company_id", true) && isRequired("company_id", false) && !companyId) {
      errs.companyId = "Company selection is required";
    }

    // Duplicate detection checks: First + Last Name, Email, and Phone
    const fnClean = firstName.trim().toLowerCase();
    const lnClean = lastName.trim().toLowerCase();
    const emClean = email.trim().toLowerCase();
    const phDigits = normalizePhone(phone.trim());

    if (fnClean && lnClean) {
      const nameDuplicate = existingContacts.find(
        (c) =>
          c.id !== initialContact?.id &&
          (c.first_name || "").trim().toLowerCase() === fnClean &&
          (c.last_name || "").trim().toLowerCase() === lnClean
      );
      if (nameDuplicate) {
        errs.firstName = `Duplicate detected: A contact with name '${nameDuplicate.first_name} ${nameDuplicate.last_name}' already exists.`;
      }
    }

    if (emClean) {
      const emailDuplicate = existingContacts.find(
        (c) =>
          c.id !== initialContact?.id &&
          c.email &&
          c.email.trim().toLowerCase() === emClean
      );
      if (emailDuplicate) {
        errs.email = `Duplicate detected: A contact with email '${emailDuplicate.email}' already exists (${emailDuplicate.first_name} ${emailDuplicate.last_name}).`;
      }
    }

    if (phDigits) {
      const phoneDuplicate = existingContacts.find(
        (c) =>
          c.id !== initialContact?.id &&
          c.phone &&
          normalizePhone(c.phone) === phDigits
      );
      if (phoneDuplicate) {
        errs.phone = `Duplicate detected: A contact with phone '${phoneDuplicate.phone}' already exists (${phoneDuplicate.first_name} ${phoneDuplicate.last_name}).`;
      }
    }

    // Dynamic custom fields validation
    formConfig
      .filter((f) => f.is_custom && f.enabled && f.required)
      .forEach((f) => {
        const val = customFields[f.key];
        if (val === undefined || val === null || val === "") {
          errs[f.key] = `${f.label} is required`;
        }
      });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const fullPhone = phone.trim() ? `${phoneCountry} ${phone.trim()}` : null;
      const combinedCustomFields = {
        ...customFields,
        salutation: salutation !== "Not selected" ? salutation : undefined,
        second_name: secondName.trim() || undefined,
        date_of_birth: dateOfBirth || undefined,
        photo: photoUrl.trim() || undefined,
        phone_type: phoneType,
      };

      if (isEditing && initialContact) {
        const payload: ContactUpdateInput = {
          first_name: firstName.trim() || initialContact.first_name,
          last_name: lastName.trim() || initialContact.last_name,
          stage: stage.trim() || "Not Contacted",
          email: email.trim() || null,
          phone: fullPhone,
          job_title: jobTitle.trim() || null,
          company_id: companyId || null,
          custom_fields: combinedCustomFields,
        };

        const updated = await api.updateContact(initialContact.id, payload);
        onSuccess(updated);
        onOpenChange(false);
      } else {
        const payload: ContactCreateInput = {
          first_name: firstName.trim() || "Contact",
          last_name: lastName.trim() || "User",
          stage: stage.trim() || "Not Contacted",
          email: email.trim() || null,
          phone: fullPhone,
          job_title: jobTitle.trim() || null,
          company_id: companyId || null,
          custom_fields: combinedCustomFields,
        };

        const created = await api.createContact(payload);

        // Generate activity if planned while creating contact
        if (scheduleActivity && activitySubject.trim()) {
          try {
            await api.createActivity({
              type: activityType,
              subject: activitySubject.trim(),
              scheduled_at: activityDate ? new Date(activityDate).toISOString() : undefined,
              contact_id: created.id,
              company_id: created.company_id || undefined,
            });
          } catch (actErr) {
            console.error("Failed to create linked activity:", actErr);
          }
        }

        // Generate task if planned while creating contact
        if (scheduleTask && taskTitle.trim()) {
          try {
            await api.createTask({
              title: taskTitle.trim(),
              due_date: taskDueDate ? new Date(taskDueDate).toISOString() : undefined,
              priority: taskPriority,
              contact_id: created.id,
              company_id: created.company_id || undefined,
            });
          } catch (tskErr) {
            console.error("Failed to create linked task:", tskErr);
          }
        }

        onSuccess(created);
        onOpenChange(false);
      }
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.detail : (err.message || "Failed to save contact. Please try again.");
      setApiError(msg);
      if (typeof msg === "string") {
        const lower = msg.toLowerCase();
        if (lower.includes("name")) {
          setErrors((prev) => ({ ...prev, firstName: msg }));
        } else if (lower.includes("email")) {
          setErrors((prev) => ({ ...prev, email: msg }));
        } else if (lower.includes("phone")) {
          setErrors((prev) => ({ ...prev, phone: msg }));
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const currentKeys = new Set(formConfig.map((f) => f.key));
  const missingDefaults = DEFAULT_CONTACT_FIELDS.filter(
    (f) => !currentKeys.has(f.key)
  ).map((f) => ({ ...f, enabled: false }));
  const hiddenFields = [
    ...formConfig.filter((f) => !f.enabled),
    ...missingDefaults,
  ];
  const standardContactKeys = new Set([
    "salutation",
    "last_name",
    "first_name",
    "second_name",
    "photo",
    "date_of_birth",
    "job_title",
    "phone",
    "email",
    "company_id",
  ]);
  const customVisibleFields = formConfig.filter(
    (f) => f.enabled && (!standardContactKeys.has(f.key) || f.is_custom)
  );

  if (!open) return null;

  return (
    <>
      <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title=""
      description=""
      maxWidth="max-w-xl"
    >
      <div className="pt-1">
        {/* Header: ABOUT CONTACT with Pencil (into mark ✕ handled by Dialog) */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 pr-8">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold tracking-wider text-slate-500 uppercase select-none">
              ABOUT CONTACT
            </h2>
            <Pencil className="h-3 w-3 text-slate-400" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* API Error Notification */}
          {apiError && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{apiError}</span>
            </div>
          )}

          {/* 1. Salutation (Dropdown) */}
          {isEnabled("salutation", true) && (
            <FormFieldWrapper
              fieldKey="salutation"
              label={getFieldLabel("salutation", "Salutation")}
              required={isRequired("salutation", false)}
              options={getFieldOptions("salutation", ["Not selected", "Mr.", "Ms.", "Mrs.", "Dr.", "Prof."])}
              onToggleRequired={toggleFieldRequired}
              onRemoveField={removeFieldFromForm}
              onDeleteField={deleteField}
              onUpdateField={updateFieldConfig}
            >
              <div className="relative">
                <select
                  value={salutation}
                  onChange={(e) => setSalutation(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-2xs focus:outline-none focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF] appearance-none"
                >
                  {getFieldOptions("salutation", ["Not selected", "Mr.", "Ms.", "Mrs.", "Dr.", "Prof."]).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </FormFieldWrapper>
          )}

          {/* 2. Last name */}
          {isEnabled("last_name", true) && (
            <FormFieldWrapper
              fieldKey="last_name"
              label={getFieldLabel("last_name", "Last name")}
              required={isRequired("last_name", false)}
              placeholder={getField("last_name")?.placeholder || "Contact #"}
              error={errors.lastName}
              onToggleRequired={toggleFieldRequired}
              onRemoveField={removeFieldFromForm}
              onDeleteField={deleteField}
              onUpdateField={updateFieldConfig}
            >
              <Input
                placeholder={getField("last_name")?.placeholder || "Contact #"}
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  if (errors.lastName) setErrors({ ...errors, lastName: "" });
                }}
                className={`h-9 border-slate-200 bg-white text-sm shadow-2xs ${
                  errors.lastName ? "border-red-500 bg-red-50/20" : ""
                }`}
              />
            </FormFieldWrapper>
          )}

          {/* 3. Name* */}
          {isEnabled("first_name", true) && (
            <FormFieldWrapper
              fieldKey="first_name"
              label={getFieldLabel("first_name", "Name")}
              required={isRequired("first_name", true)}
              placeholder={getField("first_name")?.placeholder || "First name"}
              error={errors.firstName}
              onToggleRequired={toggleFieldRequired}
              onRemoveField={removeFieldFromForm}
              onDeleteField={deleteField}
              onUpdateField={updateFieldConfig}
            >
              <Input
                placeholder={getField("first_name")?.placeholder || "First name"}
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (errors.firstName) setErrors({ ...errors, firstName: "" });
                }}
                className={`h-9 border-slate-200 bg-white text-sm shadow-2xs ${
                  errors.firstName ? "border-red-500 bg-red-50/20" : ""
                }`}
              />
            </FormFieldWrapper>
          )}

          {/* Stage */}
          {isEnabled("stage", true) && (
            <FormFieldWrapper
              fieldKey="stage"
              label={getFieldLabel("stage", "Lifecycle Stage")}
              required={isRequired("stage", false)}
              options={getFieldOptions("stage", [...CONTACT_STAGES])}
              onToggleRequired={toggleFieldRequired}
              onRemoveField={removeFieldFromForm}
              onDeleteField={deleteField}
              onUpdateField={updateFieldConfig}
            >
              <div className="relative">
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm shadow-2xs focus:outline-none focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF] appearance-none"
                >
                  {getFieldOptions("stage", [...CONTACT_STAGES]).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </FormFieldWrapper>
          )}

          {/* 4. Second name */}
          {isEnabled("second_name", true) && (
            <FormFieldWrapper
              fieldKey="second_name"
              label={getFieldLabel("second_name", "Second name")}
              required={isRequired("second_name", false)}
              placeholder={getField("second_name")?.placeholder || ""}
              error={errors.secondName}
              onToggleRequired={toggleFieldRequired}
              onRemoveField={removeFieldFromForm}
              onDeleteField={deleteField}
              onUpdateField={updateFieldConfig}
            >
              <Input
                placeholder={getField("second_name")?.placeholder || ""}
                value={secondName}
                onChange={(e) => {
                  setSecondName(e.target.value);
                  if (errors.secondName) setErrors({ ...errors, secondName: "" });
                }}
                className="h-9 border-slate-200 bg-white text-sm shadow-2xs"
              />
            </FormFieldWrapper>
          )}

          {/* 5. Photo */}
          {isEnabled("photo", true) && (
            <FormFieldWrapper
              fieldKey="photo"
              label={getFieldLabel("photo", "Photo")}
              required={isRequired("photo", false)}
              onToggleRequired={toggleFieldRequired}
              onRemoveField={removeFieldFromForm}
              onDeleteField={deleteField}
              onUpdateField={updateFieldConfig}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <label className="flex items-center justify-center gap-2 px-4 py-1.5 border border-slate-300 rounded-md text-xs font-semibold uppercase tracking-wider text-slate-700 bg-slate-50 hover:bg-slate-100 cursor-pointer shadow-2xs transition-colors">
                    <Upload className="h-3.5 w-3.5 text-slate-500" />
                    <span>ADD IMAGE</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => setPhotoUrl(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  {photoUrl && (
                    <span className="text-[11px] text-emerald-600 font-medium">Image attached</span>
                  )}
                </div>
                <p className="text-[11px] italic text-slate-400">
                  File size must not exceed 3 Mb.
                </p>
              </div>
            </FormFieldWrapper>
          )}

          {/* 6. Date of birth */}
          {isEnabled("date_of_birth", true) && (
            <FormFieldWrapper
              fieldKey="date_of_birth"
              label={getFieldLabel("date_of_birth", "Date of birth")}
              required={isRequired("date_of_birth", false)}
              onToggleRequired={toggleFieldRequired}
              onRemoveField={removeFieldFromForm}
              onDeleteField={deleteField}
              onUpdateField={updateFieldConfig}
            >
              <div className="relative">
                <Input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="h-9 border-slate-200 bg-white text-sm shadow-2xs pr-8"
                />
              </div>
            </FormFieldWrapper>
          )}

          {/* 7. Position (Job Title) */}
          {isEnabled("job_title", true) && (
            <FormFieldWrapper
              fieldKey="job_title"
              label={getFieldLabel("job_title", "Position")}
              required={isRequired("job_title", false)}
              placeholder={getField("job_title")?.placeholder || "e.g. Procurement Manager"}
              error={errors.jobTitle}
              onToggleRequired={toggleFieldRequired}
              onRemoveField={removeFieldFromForm}
              onDeleteField={deleteField}
              onUpdateField={updateFieldConfig}
            >
              <Input
                placeholder={getField("job_title")?.placeholder || "e.g. Procurement Manager"}
                value={jobTitle}
                onChange={(e) => {
                  setJobTitle(e.target.value);
                  if (errors.jobTitle) setErrors({ ...errors, jobTitle: "" });
                }}
                className={`h-9 border-slate-200 bg-white text-sm shadow-2xs ${
                  errors.jobTitle ? "border-red-500 bg-red-50/20" : ""
                }`}
              />
            </FormFieldWrapper>
          )}

          {/* 8. Phone with Flag, Work Phone dropdown, and Clear 'x' button */}
          {isEnabled("phone", true) && (
            <FormFieldWrapper
              fieldKey="phone"
              label={getFieldLabel("phone", "Phone")}
              required={isRequired("phone", false)}
              options={getFieldOptions("phone_type", PHONE_TYPES)}
              error={errors.phone}
              onToggleRequired={toggleFieldRequired}
              onRemoveField={removeFieldFromForm}
              onDeleteField={deleteField}
              onUpdateField={updateFieldConfig}
            >
              <div className="flex items-center gap-1.5">
                {/* Flag + Country Code Dropdown */}
                <select
                  value={phoneCountry}
                  onChange={(e) => setPhoneCountry(e.target.value)}
                  className="h-9 w-24 shrink-0 rounded-md border border-slate-200 bg-white px-2 text-xs shadow-2xs focus:outline-none focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF]"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>

                {/* Phone Number Input */}
                <div className="relative flex-1">
                  <Input
                    placeholder={getField("phone")?.placeholder || "Phone number"}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (errors.phone) setErrors({ ...errors, phone: "" });
                    }}
                    className={`h-9 border-slate-200 bg-white text-sm shadow-2xs pr-7 ${
                      errors.phone ? "border-red-500 bg-red-50/20" : ""
                    }`}
                  />
                  {phone && (
                    <button
                      type="button"
                      onClick={() => setPhone("")}
                      className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Phone Type Dropdown */}
                <div className="relative shrink-0">
                  <select
                    value={phoneType}
                    onChange={(e) => setPhoneType(e.target.value)}
                    className="h-9 rounded-md border border-slate-200 bg-white pl-2.5 pr-7 text-xs shadow-2xs focus:outline-none focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF] appearance-none"
                  >
                    {getFieldOptions("phone_type", PHONE_TYPES).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </FormFieldWrapper>
          )}

          {/* 9. Email */}
          {isEnabled("email", true) && (
            <FormFieldWrapper
              fieldKey="email"
              label={getFieldLabel("email", "E-mail")}
              required={isRequired("email", false)}
              placeholder={getField("email")?.placeholder || "name@example.com"}
              error={errors.email}
              onToggleRequired={toggleFieldRequired}
              onRemoveField={removeFieldFromForm}
              onDeleteField={deleteField}
              onUpdateField={updateFieldConfig}
            >
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="email"
                  placeholder={getField("email")?.placeholder || "name@example.com"}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: "" });
                  }}
                  className={`h-9 pl-9 border-slate-200 bg-white text-sm shadow-2xs ${
                    errors.email ? "border-red-500 bg-red-50/20" : ""
                  }`}
                />
              </div>
            </FormFieldWrapper>
          )}

          {/* 10. Company */}
          {isEnabled("company_id", true) && (
            <FormFieldWrapper
              fieldKey="company_id"
              label={getFieldLabel("company_id", "Company")}
              required={isRequired("company_id", false)}
              error={errors.companyId}
              onToggleRequired={toggleFieldRequired}
              onRemoveField={removeFieldFromForm}
              onDeleteField={deleteField}
              onUpdateField={updateFieldConfig}
            >
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <SearchableSelect
                    options={companies.map((c) => ({
                      value: c.id,
                      label: c.name,
                      sublabel: c.website || c.industry || undefined,
                      icon: Building2,
                    }))}
                    value={companyId}
                    onChange={(val) => {
                      setCompanyId(val);
                      if (errors.companyId) setErrors({ ...errors, companyId: "" });
                    }}
                    placeholder="Search & choose company..."
                    searchPlaceholder="Search companies by name..."
                    emptyText="No companies match search"
                    icon={Building2}
                    error={Boolean(errors.companyId)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsCompanyModalOpen(true)}
                  className="h-9 px-2.5 text-xs text-[#00AEEF] bg-[#00AEEF]/5 hover:bg-[#00AEEF]/10 border border-[#00AEEF]/30 rounded-md shrink-0 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Quick Add
                </button>
              </div>
            </FormFieldWrapper>
          )}

          {/* 11. Dynamic Custom Fields */}
          {customVisibleFields.map((f) => (
            <FormFieldWrapper
              key={f.key}
              fieldKey={f.key}
              label={getFieldLabel(f.key, f.label)}
              required={f.required}
              isCustom={true}
              error={errors[f.key]}
              options={getFieldOptions(f.key, f.options || [])}
              placeholder={f.placeholder}
              onToggleRequired={toggleFieldRequired}
              onRemoveField={removeFieldFromForm}
              onDeleteField={deleteField}
              onUpdateField={updateFieldConfig}
            >
              {f.type === "select" ? (
                <div className="relative">
                  <select
                    value={customFields[f.key] || ""}
                    onChange={(e) =>
                      setCustomFields({ ...customFields, [f.key]: e.target.value })
                    }
                    className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs sm:text-sm shadow-2xs focus:outline-none focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF] appearance-none"
                  >
                    <option value="">Select option...</option>
                    {getFieldOptions(f.key, f.options || []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              ) : f.type === "textarea" ? (
                <textarea
                  rows={2}
                  value={customFields[f.key] || ""}
                  onChange={(e) =>
                    setCustomFields({ ...customFields, [f.key]: e.target.value })
                  }
                  placeholder={f.placeholder || `Enter ${f.label}...`}
                  className="w-full rounded-md border border-slate-200 bg-white p-2 text-xs sm:text-sm shadow-2xs focus:outline-none focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF]"
                />
              ) : f.type === "checkbox" ? (
                <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(customFields[f.key])}
                    onChange={(e) =>
                      setCustomFields({ ...customFields, [f.key]: e.target.checked })
                    }
                    className="rounded border-slate-300 text-[#00AEEF] focus:ring-[#00AEEF]"
                  />
                  <span className="text-xs text-slate-700">Yes / Enabled</span>
                </label>
              ) : f.type === "datetime" ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">Date</span>
                    <Input
                      type="date"
                      value={customFields[f.key] ? String(customFields[f.key]).substring(0, 10) : ""}
                      onChange={(e) => {
                        const d = e.target.value;
                        const cur = customFields[f.key] || "";
                        const t = String(cur).includes("T") ? String(cur).substring(11, 16) : "12:00";
                        setCustomFields({ ...customFields, [f.key]: d ? `${d}T${t}` : "" });
                      }}
                      className="h-9 border-slate-200 bg-white text-sm shadow-2xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">Time</span>
                    <Input
                      type="time"
                      value={
                        customFields[f.key] && String(customFields[f.key]).includes("T")
                          ? String(customFields[f.key]).substring(11, 16)
                          : ""
                      }
                      onChange={(e) => {
                        const t = e.target.value;
                        const cur = customFields[f.key] || "";
                        const d = cur
                          ? String(cur).substring(0, 10)
                          : new Date().toISOString().substring(0, 10);
                        setCustomFields({ ...customFields, [f.key]: t ? `${d}T${t}` : "" });
                      }}
                      className="h-9 border-slate-200 bg-white text-sm shadow-2xs"
                    />
                  </div>
                </div>
              ) : (
                <Input
                  type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                  value={customFields[f.key] || ""}
                  onChange={(e) =>
                    setCustomFields({ ...customFields, [f.key]: e.target.value })
                  }
                  placeholder={f.placeholder || `Enter ${f.label}...`}
                  className="h-9 border-slate-200 bg-white text-sm shadow-2xs"
                />
              )}
            </FormFieldWrapper>
          ))}

          {/* Initial Activity & Task Options (When creating new contact) */}
          {!isEditing && (
            <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-[#00AEEF]" />
                  Plan Initial Activity & Task
                </span>
                <span className="text-[10px] text-sky-600 font-medium">Optional</span>
              </div>

              {/* Activity Option */}
              <div className="bg-white rounded-md border border-sky-100 p-2.5 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={scheduleActivity}
                    onChange={(e) => setScheduleActivity(e.target.checked)}
                    className="rounded border-slate-300 text-[#00AEEF] focus:ring-[#00AEEF]"
                  />
                  <span>Schedule initial activity (Call, Meeting, Email, Note)</span>
                </label>
                {scheduleActivity && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 animate-in fade-in">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Type</label>
                      <select
                        value={activityType}
                        onChange={(e) => setActivityType(e.target.value)}
                        className="h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-[#00AEEF]"
                      >
                        <option value="call">Phone Call</option>
                        <option value="meeting">Meeting</option>
                        <option value="email">Email</option>
                        <option value="note">Note</option>
                        <option value="follow_up">Follow-up</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Subject</label>
                      <Input
                        placeholder="e.g. Intro discovery call"
                        value={activitySubject}
                        onChange={(e) => setActivitySubject(e.target.value)}
                        className="h-8 text-xs border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Date & Time</label>
                      <Input
                        type="datetime-local"
                        value={activityDate}
                        onChange={(e) => setActivityDate(e.target.value)}
                        className="h-8 text-xs border-slate-200 bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Task Option */}
              <div className="bg-white rounded-md border border-sky-100 p-2.5 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={scheduleTask}
                    onChange={(e) => setScheduleTask(e.target.checked)}
                    className="rounded border-slate-300 text-[#00AEEF] focus:ring-[#00AEEF]"
                  />
                  <span>Assign follow-up task</span>
                </label>
                {scheduleTask && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 animate-in fade-in">
                    <div className="sm:col-span-1">
                      <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Task Title</label>
                      <Input
                        placeholder="e.g. Send welcome kit & deck"
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        className="h-8 text-xs border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Due Date</label>
                      <Input
                        type="datetime-local"
                        value={taskDueDate}
                        onChange={(e) => setTaskDueDate(e.target.value)}
                        className="h-8 text-xs border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Priority</label>
                      <select
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value as any)}
                        className="h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-[#00AEEF]"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 12. Bottom Inline Form Builder Actions (Select field + Create field) */}
          <FormBuilderActions
            hiddenFields={hiddenFields}
            onAddField={addFieldToForm}
            onCreateCustomField={createCustomField}
            entityName="Contact"
          />

          {/* Form Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="submit"
              variant="bitrix"
              disabled={isSubmitting}
              className="gap-2 min-w-[120px]"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>

    {/* Quick-Add Company Modal */}
    {isCompanyModalOpen && (
      <CompanyForm
        open={isCompanyModalOpen}
        onOpenChange={setIsCompanyModalOpen}
        onSuccess={(newCompany) => {
          setCompanies((prev) => [newCompany, ...prev.filter((c) => c.id !== newCompany.id)]);
          setCompanyId(newCompany.id);
          setIsCompanyModalOpen(false);
        }}
      />
    )}
  </>
  );
}
