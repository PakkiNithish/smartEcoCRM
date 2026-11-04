"use client";

import React, { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Company, CompanyCreateInput, CompanyUpdateInput, Contact, FormFieldConfig } from "@/types/crm";
import { api, ApiError } from "@/lib/api-client";
import {
  Loader2,
  AlertCircle,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Tag,
  Pencil,
  ChevronDown,
  Plus,
  X,
  Users,
  User as UserIcon,
  Clock,
  CheckSquare,
} from "lucide-react";
import { FormFieldWrapper } from "./form-field-wrapper";
import { FormBuilderActions } from "./form-builder-actions";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DEFAULT_COMPANY_FIELDS, COMPANY_STAGES } from "@/lib/form-defaults";
import { extractDomain } from "@/lib/utils";
import { ContactForm } from "./contact-form";

interface CompanyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCompany?: Company | null;
  onSuccess: (company: Company) => void;
}

export function CompanyForm({
  open,
  onOpenChange,
  initialCompany,
  onSuccess,
}: CompanyFormProps) {
  const isEditing = !!initialCompany;

  // Form Fields
  const [name, setName] = useState("");
  const [stage, setStage] = useState<string>("Not Contacted");
  const [industry, setIndustry] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [formConfig, setFormConfig] = useState<FormFieldConfig[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("crm_form_config_company");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const keys = new Set(parsed.map((f: any) => f.key));
            const merged = [...parsed];
            DEFAULT_COMPANY_FIELDS.forEach((def) => {
              if (!keys.has(def.key)) merged.push(def);
            });
            return merged;
          }
        }
      } catch {}
    }
    return DEFAULT_COMPANY_FIELDS;
  });

  // Contacts & Quick-Add States
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [existingCompanies, setExistingCompanies] = useState<Company[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  // Initial Activity & Task Options (When creating new company)
  const [scheduleActivity, setScheduleActivity] = useState(false);
  const [activityType, setActivityType] = useState("call");
  const [activitySubject, setActivitySubject] = useState("");
  const [activityDate, setActivityDate] = useState("");

  const [scheduleTask, setScheduleTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");

  // Status & Validation
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Initialize or reset form
  useEffect(() => {
    if (open) {
      setErrors({});
      setApiError(null);

      if (initialCompany) {
        setName(initialCompany.name || "");
        setStage(initialCompany.stage || "Not Contacted");
        setIndustry(initialCompany.industry || "");
        setPhone(initialCompany.phone || "");
        setEmail(initialCompany.email || "");
        setWebsite(initialCompany.website || "");
        setAddress(initialCompany.address || "");
        setCustomFields(initialCompany.custom_fields || {});
      } else {
        setName("");
        setStage("Not Contacted");
        setIndustry("");
        setPhone("");
        setEmail("");
        setWebsite("");
        setAddress("");
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

      loadConfig();
    }
  }, [open, initialCompany]);

  async function loadConfig() {
    try {
      let cached: FormFieldConfig[] | null = null;
      try {
        const raw = localStorage.getItem("crm_form_config_company");
        if (raw) cached = JSON.parse(raw);
      } catch {}

      const [res, fetchedContacts, fetchedCompanies] = await Promise.all([
        api.getFormConfig("company").catch(() => null),
        api.getContacts({ limit: 100 }).catch(() => null),
        api.getCompanies({ limit: 100 }).catch(() => null),
      ]);

      if (fetchedContacts?.items) {
        setContacts(fetchedContacts.items);
      }

      if (fetchedCompanies?.items) {
        setExistingCompanies(fetchedCompanies.items);
      }

      if (initialCompany?.id) {
        api.getContacts({ company_id: initialCompany.id, limit: 50 }).then((cRes) => {
          if (cRes?.items) {
            setSelectedContactIds(cRes.items.map((c) => c.id));
          }
        }).catch(() => {});
      } else {
        setSelectedContactIds([]);
      }

      if (res?.fields_config && res.fields_config.length > 0) {
        const backendKeys = new Set(res.fields_config.map((f: FormFieldConfig) => f.key));
        const merged = [...res.fields_config];
        DEFAULT_COMPANY_FIELDS.forEach((def) => {
          if (!backendKeys.has(def.key)) {
            merged.push(def);
          }
        });
        if (cached && Array.isArray(cached)) {
          cached.forEach((c) => {
            if (c.is_custom && !backendKeys.has(c.key)) {
              merged.push(c);
            }
          });
        }
        setFormConfig(merged);
        try {
          localStorage.setItem("crm_form_config_company", JSON.stringify(merged));
        } catch {}
      } else if (cached && Array.isArray(cached) && cached.length > 0) {
        setFormConfig(cached);
      }
    } catch {
      // Ignored non-fatal
    }
  }

  async function updateFormConfigAndSync(updated: FormFieldConfig[]) {
    setFormConfig(updated);
    try {
      localStorage.setItem("crm_form_config_company", JSON.stringify(updated));
    } catch {}

    try {
      await api.updateFormConfig("company", updated);
    } catch (err) {
      console.error("Failed to sync company form config:", err);
    }
  }

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
      const def = DEFAULT_COMPANY_FIELDS.find((f) => f.key === key);
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
      DEFAULT_COMPANY_FIELDS.find((f) => f.key === key)
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

    if (isEnabled("name", true) && isRequired("name", true) && !name.trim()) {
      errs.name = "Company name is required";
    }

    if (isEnabled("email", true)) {
      if (email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          errs.email = "Please enter a valid email address (e.g. info@company.com)";
        }
      } else if (isRequired("email", false)) {
        errs.email = "Email is required";
      }
    }

    if (isEnabled("industry", true) && isRequired("industry", false) && !industry.trim()) {
      errs.industry = "Industry is required";
    }
    if (isEnabled("phone", true) && isRequired("phone", false) && !phone.trim()) {
      errs.phone = "Phone is required";
    }
    if (isEnabled("website", true)) {
      if (!website.trim()) {
        if (isRequired("website", true)) {
          errs.website = "Website URL is required";
        }
      } else {
        const domain = extractDomain(website.trim());
        if (!domain || (!domain.includes(".") && domain !== "localhost")) {
          errs.website = "Please enter a valid website URL or domain (e.g. acme.com or https://www.acme.com)";
        } else {
          const duplicate = existingCompanies.find(
            (c) => c.id !== initialCompany?.id && c.website && extractDomain(c.website) === domain
          );
          if (duplicate) {
            errs.website = `Duplicate detected: A company with domain '${domain}' already exists (${duplicate.name}).`;
          }
        }
      }
    }
    if (isEnabled("address", true) && isRequired("address", false) && !address.trim()) {
      errs.address = "Address is required";
    }

    // Custom fields validation
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
      if (isEditing && initialCompany) {
        const payload: CompanyUpdateInput = {
          name: name.trim() || initialCompany.name,
          stage: stage.trim() || "Not Contacted",
          industry: industry.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          website: website.trim() || null,
          address: address.trim() || null,
          custom_fields: customFields,
        };

        const updated = await api.updateCompany(initialCompany.id, payload);

        if (selectedContactIds.length > 0) {
          await Promise.allSettled(
            selectedContactIds.map((cid) =>
              api.updateContact(cid, { company_id: updated.id })
            )
          );
        }

        onSuccess(updated);
        onOpenChange(false);
      } else {
        const payload: CompanyCreateInput = {
          name: name.trim() || "Organization",
          stage: stage.trim() || "Not Contacted",
          industry: industry.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          website: website.trim(),
          address: address.trim() || null,
          custom_fields: customFields,
        };

        const created = await api.createCompany(payload);

        // Generate activity if planned while creating company
        if (scheduleActivity && activitySubject.trim()) {
          try {
            await api.createActivity({
              type: activityType,
              subject: activitySubject.trim(),
              scheduled_at: activityDate ? new Date(activityDate).toISOString() : undefined,
              company_id: created.id,
            });
          } catch (actErr) {
            console.error("Failed to create linked activity for company:", actErr);
          }
        }

        // Generate task if planned while creating company
        if (scheduleTask && taskTitle.trim()) {
          try {
            await api.createTask({
              title: taskTitle.trim(),
              due_date: taskDueDate ? new Date(taskDueDate).toISOString() : undefined,
              priority: taskPriority,
              company_id: created.id,
            });
          } catch (tskErr) {
            console.error("Failed to create linked task for company:", tskErr);
          }
        }

        if (selectedContactIds.length > 0) {
          await Promise.allSettled(
            selectedContactIds.map((cid) =>
              api.updateContact(cid, { company_id: created.id })
            )
          );
        }

        onSuccess(created);
        onOpenChange(false);
      }
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.detail : (err.message || "Failed to save company. Please try again.");
      setApiError(msg);
      if (typeof msg === "string" && (msg.toLowerCase().includes("domain") || msg.toLowerCase().includes("website"))) {
        setErrors((prev) => ({ ...prev, website: msg }));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const currentKeys = new Set(formConfig.map((f) => f.key));
  const missingDefaults = DEFAULT_COMPANY_FIELDS.filter(
    (f) => !currentKeys.has(f.key)
  ).map((f) => ({ ...f, enabled: false }));
  const hiddenFields = [
    ...formConfig.filter((f) => !f.enabled),
    ...missingDefaults,
  ];
  const standardCompanyKeys = new Set([
    "name",
    "industry",
    "phone",
    "email",
    "website",
    "address",
    "contact",
  ]);
  const customVisibleFields = formConfig.filter(
    (f) => f.enabled && (!standardCompanyKeys.has(f.key) || f.is_custom)
  );
  const selectedContactsList = contacts.filter((c) => selectedContactIds.includes(c.id));
  const unselectedContacts = contacts.filter(
    (c) =>
      (!c.company_id || (initialCompany?.id && c.company_id === initialCompany.id)) &&
      !selectedContactIds.includes(c.id)
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
        {/* Header: ABOUT COMPANY with Pencil (into mark ✕ handled by Dialog) */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 pr-8">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold tracking-wider text-slate-500 uppercase select-none">
              ABOUT COMPANY
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

          {/* Company Name */}
          {isEnabled("name", true) && (
            <FormFieldWrapper
              fieldKey="name"
              label={getFieldLabel("name", "Company Name")}
              required={isRequired("name", true)}
              error={errors.name}
              placeholder={getField("name")?.placeholder || "Acme Corporation"}
              onToggleRequired={toggleFieldRequired}
              onRemoveField={removeFieldFromForm}
              onDeleteField={deleteField}
              onUpdateField={updateFieldConfig}
            >
              <div className="relative">
                <Building2 className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={getField("name")?.placeholder || "Acme Corporation"}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors({ ...errors, name: "" });
                  }}
                  className={`h-9 pl-9 border-slate-200 bg-white text-sm shadow-2xs ${
                    errors.name ? "border-red-500 bg-red-50/20" : ""
                  }`}
                />
              </div>
            </FormFieldWrapper>
          )}

          {/* Stage */}
          {isEnabled("stage", true) && (
            <FormFieldWrapper
              fieldKey="stage"
              label={getFieldLabel("stage", "Lifecycle Stage")}
              required={isRequired("stage", false)}
              options={getFieldOptions("stage", [...COMPANY_STAGES])}
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
                  {getFieldOptions("stage", [...COMPANY_STAGES]).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </FormFieldWrapper>
          )}

          {/* Industry */}
          {isEnabled("industry", true) && (
            <FormFieldWrapper
              fieldKey="industry"
              label={getFieldLabel("industry", "Industry")}
              required={isRequired("industry", false)}
              error={errors.industry}
              options={getFieldOptions("industry", [
                "Information Technology",
                "Manufacturing",
                "Sustainability",
                "Real Estate & Offices",
                "Education",
                "Healthcare",
                "Financial Services",
                "Retail",
                "Other",
              ])}
              onToggleRequired={toggleFieldRequired}
              onRemoveField={removeFieldFromForm}
              onDeleteField={deleteField}
              onUpdateField={updateFieldConfig}
            >
              <div className="relative">
                <Tag className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <select
                  value={industry}
                  onChange={(e) => {
                    setIndustry(e.target.value);
                    if (errors.industry) setErrors({ ...errors, industry: "" });
                  }}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white pl-9 pr-8 text-sm shadow-2xs focus:outline-none focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF] appearance-none"
                >
                  <option value="">Select industry...</option>
                  {getFieldOptions("industry", [
                    "Information Technology",
                    "Manufacturing",
                    "Sustainability",
                    "Real Estate & Offices",
                    "Education",
                    "Healthcare",
                    "Financial Services",
                    "Retail",
                    "Other",
                  ]).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </FormFieldWrapper>
          )}

          {/* Phone */}
          {isEnabled("phone", true) && (
            <FormFieldWrapper
              fieldKey="phone"
              label={getFieldLabel("phone", "Corporate Phone")}
              required={isRequired("phone", false)}
              error={errors.phone}
              placeholder={getField("phone")?.placeholder || "+1 (800) 555-0199"}
              onToggleRequired={toggleFieldRequired}
              onRemoveField={removeFieldFromForm}
              onDeleteField={deleteField}
              onUpdateField={updateFieldConfig}
            >
              <div className="relative">
                <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={getField("phone")?.placeholder || "+1 (800) 555-0199"}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (errors.phone) setErrors({ ...errors, phone: "" });
                  }}
                  className="h-9 pl-9 border-slate-200 bg-white text-sm shadow-2xs"
                />
              </div>
            </FormFieldWrapper>
          )}

          {/* Email */}
          {isEnabled("email", true) && (
            <FormFieldWrapper
              fieldKey="email"
              label={getFieldLabel("email", "Company Email")}
              required={isRequired("email", false)}
              error={errors.email}
              placeholder={getField("email")?.placeholder || "contact@acme.com"}
              onToggleRequired={toggleFieldRequired}
              onRemoveField={removeFieldFromForm}
              onDeleteField={deleteField}
              onUpdateField={updateFieldConfig}
            >
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="email"
                  placeholder={getField("email")?.placeholder || "contact@acme.com"}
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

          {/* Website */}
          {isEnabled("website", true) && (
            <FormFieldWrapper
              fieldKey="website"
              label={getFieldLabel("website", "Website")}
              required={isRequired("website", true)}
              error={errors.website}
              placeholder={getField("website")?.placeholder || "https://acme.com"}
              onToggleRequired={toggleFieldRequired}
              onRemoveField={removeFieldFromForm}
              onDeleteField={deleteField}
              onUpdateField={updateFieldConfig}
            >
              <div className="relative">
                <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={getField("website")?.placeholder || "https://acme.com"}
                  value={website}
                  onChange={(e) => {
                    setWebsite(e.target.value);
                    if (errors.website) setErrors({ ...errors, website: "" });
                  }}
                  className={`h-9 pl-9 border-slate-200 bg-white text-sm shadow-2xs ${
                    errors.website ? "border-red-500 bg-red-50/20" : ""
                  }`}
                />
              </div>
            </FormFieldWrapper>
          )}

          {/* Office Address */}
          {isEnabled("address", true) && (
            <FormFieldWrapper
              fieldKey="address"
              label={getFieldLabel("address", "Office Address")}
              required={isRequired("address", false)}
              error={errors.address}
              placeholder={getField("address")?.placeholder || "100 Enterprise Way, Suite 400"}
              onToggleRequired={toggleFieldRequired}
              onRemoveField={removeFieldFromForm}
              onDeleteField={deleteField}
              onUpdateField={updateFieldConfig}
            >
              <div className="relative">
                <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={getField("address")?.placeholder || "100 Enterprise Way, Suite 400"}
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    if (errors.address) setErrors({ ...errors, address: "" });
                  }}
                  className="h-9 pl-9 border-slate-200 bg-white text-sm shadow-2xs"
                />
              </div>
            </FormFieldWrapper>
          )}

          {/* Company Contacts */}
          {isEnabled("contact", true) && (
            <FormFieldWrapper
              fieldKey="contact"
              label={getFieldLabel("contact", "Company contacts")}
              required={isRequired("contact", false)}
              onToggleRequired={toggleFieldRequired}
              onRemoveField={removeFieldFromForm}
              onDeleteField={deleteField}
              onUpdateField={updateFieldConfig}
            >
              <div className="space-y-2">
                {/* Selected Contact Badges */}
                {selectedContactsList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    {selectedContactsList.map((ct) => (
                      <div
                        key={ct.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 border border-sky-200 text-sky-800 rounded-md text-xs font-medium"
                      >
                        <UserIcon className="h-3 w-3 text-sky-500" />
                        <span>
                          {ct.first_name} {ct.last_name}
                          {ct.job_title ? ` (${ct.job_title})` : ""}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedContactIds((prev) => prev.filter((id) => id !== ct.id))
                          }
                          className="text-sky-400 hover:text-red-500 p-0.5 rounded transition-colors"
                          title="Remove"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Dropdown and Quick Add Trigger */}
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <SearchableSelect
                      options={unselectedContacts.map((ct) => ({
                        value: ct.id,
                        label: `${ct.first_name} ${ct.last_name}`.trim() || ct.full_name || "Untitled",
                        sublabel: [ct.job_title, ct.email, ct.phone].filter(Boolean).join(" • "),
                        icon: UserIcon,
                      }))}
                      value=""
                      onChange={(val) => {
                        if (val && !selectedContactIds.includes(val)) {
                          setSelectedContactIds((prev) => [...prev, val]);
                        }
                      }}
                      placeholder={
                        unselectedContacts.length === 0
                          ? (selectedContactsList.length > 0
                              ? "All available contacts selected"
                              : "No contacts available — click Quick Add")
                          : "Search & choose contact to associate..."
                      }
                      searchPlaceholder="Search contacts by name, email, title..."
                      emptyText="No contacts match search"
                      icon={UserIcon}
                      disabled={unselectedContacts.length === 0}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsContactModalOpen(true)}
                    className="h-9 px-2.5 text-xs text-[#00AEEF] bg-[#00AEEF]/5 hover:bg-[#00AEEF]/10 border border-[#00AEEF]/30 rounded-md shrink-0 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Quick Add
                  </button>
                </div>
              </div>
            </FormFieldWrapper>
          )}

          {/* Dynamic Custom Fields */}
          {customVisibleFields.map((f) => (
            <FormFieldWrapper
              key={f.key}
              fieldKey={f.key}
              label={f.label}
              required={f.required}
              isCustom={true}
              error={errors[f.key]}
              options={f.options}
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
                    {f.options?.map((opt) => (
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

          {/* Initial Activity & Task Options (When creating new company) */}
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
                        placeholder="e.g. Discovery call with stakeholders"
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
                        placeholder="e.g. Research company background & requirements"
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

          {/* Form Actions: Select Field + Create Field */}
          <FormBuilderActions
            hiddenFields={hiddenFields}
            onAddField={addFieldToForm}
            onCreateCustomField={createCustomField}
            entityName="Company"
          />

          {/* Form Footer */}
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

    {/* Quick-Add Contact Modal */}
    {isContactModalOpen && (
      <ContactForm
        open={isContactModalOpen}
        onOpenChange={setIsContactModalOpen}
        onSuccess={(newContact) => {
          setContacts((prev) => [newContact, ...prev.filter((c) => c.id !== newContact.id)]);
          setSelectedContactIds((prev) => [
            ...prev.filter((id) => id !== newContact.id),
            newContact.id,
          ]);
          setIsContactModalOpen(false);
        }}
      />
    )}
  </>
  );
}
