"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Activity,
  ActivityCreateInput,
  ActivityUpdateInput,
  Company,
  Contact,
  Deal,
  User,
  FormFieldConfig,
  FormSection,
} from "@/types/crm";
import { api, ApiError } from "@/lib/api-client";
import {
  DEFAULT_ACTIVITY_FIELDS,
  DEFAULT_ACTIVITY_SECTIONS,
} from "@/lib/form-defaults";
import { FormFieldWrapper } from "@/components/crm/form-field-wrapper";
import { FormBuilderActions } from "@/components/crm/form-builder-actions";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Loader2,
  AlertCircle,
  PhoneCall,
  Calendar,
  Mail,
  FileText,
  Clock,
  Briefcase,
  Users,
  Building2,
  User as UserIcon,
  Edit2,
  FolderPlus,
  X,
  ChevronDown,
  Plus,
} from "lucide-react";
import { ContactForm } from "./contact-form";
import { CompanyForm } from "./company-form";

interface ActivityFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialActivity?: Activity | null;
  defaultDealId?: string | null;
  defaultContactId?: string | null;
  defaultCompanyId?: string | null;
  onSuccess: (activity: Activity) => void;
  onStageCreate?: (activity: Activity) => void;
}

const ACTIVITY_TYPES = [
  { id: "call", label: "Phone Call", icon: PhoneCall },
  { id: "meeting", label: "Meeting", icon: Calendar },
  { id: "email", label: "Email", icon: Mail },
  { id: "note", label: "Note", icon: FileText },
  { id: "follow_up", label: "Follow-up", icon: Clock },
];

export function ActivityForm({
  open,
  onOpenChange,
  initialActivity,
  defaultDealId,
  defaultContactId,
  defaultCompanyId,
  onSuccess,
  onStageCreate,
}: ActivityFormProps) {
  const isEditing = !!initialActivity;

  // Form Configuration & Dynamic Sections
  const [formConfig, setFormConfig] = useState<FormFieldConfig[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("crm_form_config_activity");
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return DEFAULT_ACTIVITY_FIELDS;
  });

  const [sections, setSections] = useState<FormSection[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("crm_activity_sections");
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return DEFAULT_ACTIVITY_SECTIONS;
  });

  const [customFields, setCustomFields] = useState<Record<string, any>>({});

  // Section Editing States
  const [editingTitleSecId, setEditingTitleSecId] = useState<string | null>(null);
  const [tempSectionTitle, setTempSectionTitle] = useState("");
  const [showAddSectionInput, setShowAddSectionInput] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");

  // Standard Activity Form Fields
  const [type, setType] = useState("call");
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [isCompleted, setIsCompleted] = useState(true);
  const [dealId, setDealId] = useState("");
  const [contactId, setContactId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [userId, setUserId] = useState("");

  // Lookups data
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);

  // Quick-Add Modal States
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);

  // Bi-directional filtering between Company and Contact
  const filteredContacts = React.useMemo(() => {
    if (!companyId) return contacts;
    return contacts.filter((c) => c.company_id === companyId);
  }, [contacts, companyId]);

  const filteredCompanies = React.useMemo(() => {
    if (!contactId) return companies;
    const selectedContact = contacts.find((c) => c.id === contactId);
    if (selectedContact && selectedContact.company_id) {
      return companies.filter((c) => c.id === selectedContact.company_id);
    }
    return companies;
  }, [companies, contactId, contacts]);

  useEffect(() => {
    if (contactId && contacts.length > 0 && !companyId) {
      const match = contacts.find((c) => c.id === contactId);
      if (match && match.company_id) {
        setCompanyId(match.company_id);
      }
    }
  }, [contactId, contacts, companyId]);

  // Status & Validation
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchLookupsAndConfig = useCallback(async () => {
    setLoadingLookups(true);
    try {
      let cachedConfig: FormFieldConfig[] | null = null;
      let cachedSections: FormSection[] | null = null;
      try {
        const rawCfg = localStorage.getItem("crm_form_config_activity");
        if (rawCfg) cachedConfig = JSON.parse(rawCfg);
        const rawSec = localStorage.getItem("crm_activity_sections");
        if (rawSec) cachedSections = JSON.parse(rawSec);
      } catch {}

      const [dealsRes, contactsRes, companiesRes, usersRes, configRes] =
        await Promise.allSettled([
          api.getDeals({ limit: 100 }),
          api.getContacts({ limit: 100 }),
          api.getCompanies({ limit: 100 }),
          api.getUsers(),
          api.getFormConfig("activity"),
        ]);

      if (dealsRes.status === "fulfilled") {
        const val = dealsRes.value as any;
        setDeals(Array.isArray(val) ? val : val.items || []);
      }
      if (contactsRes.status === "fulfilled") {
        const val = contactsRes.value as any;
        setContacts(Array.isArray(val) ? val : val.items || []);
      }
      if (companiesRes.status === "fulfilled") {
        const val = companiesRes.value as any;
        setCompanies(Array.isArray(val) ? val : val.items || []);
      }
      if (usersRes.status === "fulfilled") {
        setUsers(usersRes.value);
        if (!initialActivity && usersRes.value.length > 0) {
          setUserId((prev) => prev || usersRes.value[0].id);
        }
      }

      if (configRes.status === "fulfilled" && configRes.value?.fields_config) {
        const backendKeys = new Set(
          configRes.value.fields_config.map((f: FormFieldConfig) => f.key)
        );
        const merged = [...configRes.value.fields_config];
        if (cachedConfig && Array.isArray(cachedConfig)) {
          cachedConfig.forEach((c) => {
            if (c.is_custom && !backendKeys.has(c.key)) {
              merged.push(c);
            }
          });
        }
        setFormConfig(merged);
        try {
          localStorage.setItem("crm_form_config_activity", JSON.stringify(merged));
        } catch {}
      } else if (cachedConfig && Array.isArray(cachedConfig) && cachedConfig.length > 0) {
        setFormConfig(cachedConfig);
      }

      if (cachedSections && Array.isArray(cachedSections) && cachedSections.length > 0) {
        setSections(cachedSections);
      }
    } catch {
      // Non-fatal
    } finally {
      setLoadingLookups(false);
    }
  }, [initialActivity]);

  // Initialize or reset form
  useEffect(() => {
    if (open) {
      setErrors({});
      setApiError(null);
      setEditingTitleSecId(null);
      setShowAddSectionInput(false);

      if (initialActivity) {
        setType(initialActivity.type || "call");
        setSubject(initialActivity.subject || "");
        setNotes(initialActivity.notes || initialActivity.description || "");
        setScheduledAt(
          initialActivity.scheduled_at
            ? initialActivity.scheduled_at.substring(0, 16)
            : initialActivity.activity_date
            ? initialActivity.activity_date.substring(0, 16)
            : ""
        );
        setIsCompleted(initialActivity.is_completed ?? true);
        setDealId(initialActivity.deal_id || "");
        setContactId(initialActivity.contact_id || "");
        setCompanyId(initialActivity.company_id || "");
        setUserId(initialActivity.user_id || "");
        setCustomFields(initialActivity.custom_fields || {});
      } else {
        setType("call");
        setSubject("");
        setNotes("");
        setScheduledAt(new Date().toISOString().substring(0, 16));
        setIsCompleted(true);
        setDealId(defaultDealId || "");
        setContactId(defaultContactId || "");
        setCompanyId(defaultCompanyId || "");
        setUserId("");
        setCustomFields({});
      }

      fetchLookupsAndConfig();
    }
  }, [
    open,
    initialActivity,
    defaultDealId,
    defaultContactId,
    defaultCompanyId,
    fetchLookupsAndConfig,
  ]);

  // Synchronize form configuration and section layout to backend and localStorage
  const syncFormConfigAndSections = async (
    updatedConfig: FormFieldConfig[],
    updatedSections: FormSection[]
  ) => {
    setFormConfig(updatedConfig);
    setSections(updatedSections);
    try {
      localStorage.setItem("crm_form_config_activity", JSON.stringify(updatedConfig));
      localStorage.setItem("crm_activity_sections", JSON.stringify(updatedSections));
    } catch {}

    try {
      await api.updateFormConfig("activity", updatedConfig);
    } catch (err) {
      console.error("Failed to sync activity form config:", err);
    }
  };

  // Field Level Actions
  const handleToggleRequired = (key: string) => {
    const updated = formConfig.map((f) =>
      f.key === key ? { ...f, required: !f.required } : f
    );
    syncFormConfigAndSections(updated, sections);
  };

  const handleRemoveField = (key: string) => {
    const updated = formConfig.map((f) =>
      f.key === key ? { ...f, enabled: false } : f
    );
    const updatedSecs = sections.map((sec) => ({
      ...sec,
      fieldKeys: sec.fieldKeys.filter((k) => k !== key),
    }));
    syncFormConfigAndSections(updated, updatedSecs);
  };

  const handleDeleteField = (key: string) => {
    const updated = formConfig.filter((f) => f.key !== key);
    const updatedSecs = sections.map((sec) => ({
      ...sec,
      fieldKeys: sec.fieldKeys.filter((k) => k !== key),
    }));
    const newCf = { ...customFields };
    delete newCf[key];
    setCustomFields(newCf);
    syncFormConfigAndSections(updated, updatedSecs);
  };

  const handleAddFieldToSection = (sectionId: string, fieldKey: string) => {
    let updatedConfig = formConfig.map((f) =>
      f.key === fieldKey ? { ...f, enabled: true } : f
    );
    if (!updatedConfig.some((f) => f.key === fieldKey)) {
      const def = DEFAULT_ACTIVITY_FIELDS.find((f) => f.key === fieldKey);
      if (def) {
        updatedConfig = [...updatedConfig, { ...def, enabled: true }];
      }
    }
    const updatedSecs = sections.map((sec) => {
      if (sec.id === sectionId && !sec.fieldKeys.includes(fieldKey)) {
        return { ...sec, fieldKeys: [...sec.fieldKeys, fieldKey] };
      }
      return sec;
    });
    syncFormConfigAndSections(updatedConfig, updatedSecs);
  };

  const handleCreateCustomField = (sectionId: string, newField: FormFieldConfig) => {
    const updatedConfig = [...formConfig, newField];
    const updatedSecs = sections.map((sec) => {
      if (sec.id === sectionId) {
        return { ...sec, fieldKeys: [...sec.fieldKeys, newField.key] };
      }
      return sec;
    });
    setCustomFields((prev) => ({
      ...prev,
      [newField.key]: newField.type === "checkbox" ? false : "",
    }));
    syncFormConfigAndSections(updatedConfig, updatedSecs);
  };

  const handleUpdateField = (
    key: string,
    updates: {
      label?: string;
      options?: string[];
      required?: boolean;
      placeholder?: string;
    }
  ) => {
    const updatedConfig = formConfig.map((f) => {
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
    syncFormConfigAndSections(updatedConfig, sections);
  };

  // Section Level Actions
  const handleAddSection = () => {
    if (!newSectionTitle.trim()) return;
    const newSec: FormSection = {
      id: `sec_${Date.now()}`,
      title: newSectionTitle.trim().toUpperCase(),
      fieldKeys: [],
      isCustom: true,
    };
    const updated = [...sections, newSec];
    syncFormConfigAndSections(formConfig, updated);
    setNewSectionTitle("");
    setShowAddSectionInput(false);
  };

  const handleDeleteSection = (sectionId: string) => {
    const updated = sections.filter((s) => s.id !== sectionId);
    syncFormConfigAndSections(formConfig, updated);
  };

  const handleRenameSection = (sectionId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    const updated = sections.map((s) =>
      s.id === sectionId ? { ...s, title: newTitle.trim().toUpperCase() } : s
    );
    syncFormConfigAndSections(formConfig, updated);
  };

  function validate() {
    const errs: { [key: string]: string } = {};

    // Check mandatory standard fields based on formConfig
    const subjectCfg = formConfig.find((f) => f.key === "subject");
    if (subjectCfg?.enabled !== false && subjectCfg?.required !== false) {
      if (!subject.trim()) {
        errs.subject = "Subject or activity title is required";
      }
    }

    // Check custom fields that are required
    formConfig.forEach((f) => {
      if (f.is_custom && f.enabled && f.required) {
        const val = customFields[f.key];
        if (val === undefined || val === null || val === "") {
          errs[f.key] = `${f.label} is required`;
        }
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
      const formattedDate = scheduledAt ? new Date(scheduledAt).toISOString() : null;

      if (isEditing && initialActivity) {
        const payload: ActivityUpdateInput = {
          type,
          subject: subject.trim(),
          notes: notes.trim() || null,
          scheduled_at: formattedDate,
          is_completed: isCompleted,
          deal_id: dealId || null,
          contact_id: contactId || null,
          company_id: companyId || null,
          user_id: userId || null,
          custom_fields: customFields,
        };
        const updated = await api.updateActivity(initialActivity.id, payload);
        onSuccess(updated);
        onOpenChange(false);
      } else {
        const payload: ActivityCreateInput = {
          type,
          subject: subject.trim(),
          notes: notes.trim() || null,
          scheduled_at: formattedDate,
          is_completed: isCompleted,
          deal_id: dealId || null,
          contact_id: contactId || null,
          company_id: companyId || null,
          user_id: userId || null,
          custom_fields: customFields,
        };

        if (onStageCreate) {
          const stagedActivity: Activity = {
            id: `temp_act_${Date.now()}`,
            type: payload.type,
            subject: payload.subject,
            notes: payload.notes || undefined,
            scheduled_at: payload.scheduled_at || undefined,
            is_completed: payload.is_completed || false,
            deal_id: payload.deal_id || undefined,
            contact_id: payload.contact_id || undefined,
            company_id: payload.company_id || undefined,
            user_id: payload.user_id || undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            custom_fields: payload.custom_fields,
          } as Activity;
          onStageCreate(stagedActivity);
          onOpenChange(false);
          return;
        }

        const created = await api.createActivity(payload);
        onSuccess(created);
        onOpenChange(false);
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setApiError(err.detail);
      } else {
        setApiError(err.message || "Failed to record activity. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // Helper to render individual field input
  const renderFieldInput = (key: string, fieldCfg?: FormFieldConfig) => {
    const isCustom = fieldCfg?.is_custom ?? false;
    const req = fieldCfg?.required ?? false;
    const label = fieldCfg?.label || key;

    if (isCustom) {
      return (
        <FormFieldWrapper
          key={key}
          fieldKey={key}
          label={label}
          required={req}
          isCustom={true}
          error={errors[key]}
          options={fieldCfg?.options}
          placeholder={fieldCfg?.placeholder}
          onUpdateField={handleUpdateField}
          onToggleRequired={handleToggleRequired}
          onRemoveField={handleRemoveField}
          onDeleteField={handleDeleteField}
        >
          {fieldCfg?.type === "select" ? (
            <div className="relative">
              <select
                value={customFields[key] || ""}
                onChange={(e) =>
                  setCustomFields({ ...customFields, [key]: e.target.value })
                }
                className="w-full h-8 rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-800 outline-none focus:border-[#1c9be8] appearance-none"
              >
                <option value="">Select option...</option>
                {fieldCfg.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          ) : fieldCfg?.type === "textarea" ? (
            <textarea
              rows={2}
              value={customFields[key] || ""}
              onChange={(e) =>
                setCustomFields({ ...customFields, [key]: e.target.value })
              }
              placeholder={fieldCfg.placeholder || `Enter ${label}...`}
              className="w-full rounded border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-[#1c9be8]"
            />
          ) : fieldCfg?.type === "checkbox" ? (
            <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(customFields[key])}
                onChange={(e) =>
                  setCustomFields({ ...customFields, [key]: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 text-[#1c9be8] focus:ring-[#1c9be8]"
              />
              <span className="text-xs text-slate-700">Yes / Active</span>
            </label>
          ) : fieldCfg?.type === "datetime" ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                  Date
                </span>
                <Input
                  type="date"
                  value={customFields[key] ? String(customFields[key]).substring(0, 10) : ""}
                  onChange={(e) => {
                    const d = e.target.value;
                    const cur = customFields[key] || "";
                    const t = String(cur).includes("T") ? String(cur).substring(11, 16) : "12:00";
                    setCustomFields({ ...customFields, [key]: d ? `${d}T${t}` : "" });
                  }}
                  className="h-8 text-xs bg-white"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                  Time
                </span>
                <Input
                  type="time"
                  value={
                    customFields[key] && String(customFields[key]).includes("T")
                      ? String(customFields[key]).substring(11, 16)
                      : ""
                  }
                  onChange={(e) => {
                    const t = e.target.value;
                    const cur = customFields[key] || "";
                    const d = cur
                      ? String(cur).substring(0, 10)
                      : new Date().toISOString().substring(0, 10);
                    setCustomFields({ ...customFields, [key]: t ? `${d}T${t}` : "" });
                  }}
                  className="h-8 text-xs bg-white"
                />
              </div>
            </div>
          ) : (
            <input
              type={
                fieldCfg?.type === "number"
                  ? "number"
                  : fieldCfg?.type === "date"
                  ? "date"
                  : "text"
              }
              value={customFields[key] || ""}
              onChange={(e) =>
                setCustomFields({ ...customFields, [key]: e.target.value })
              }
              placeholder={fieldCfg?.placeholder || `Enter ${label}...`}
              className="h-8 w-full rounded border border-slate-300 px-2.5 text-xs text-slate-800 outline-none focus:border-[#1c9be8]"
            />
          )}
        </FormFieldWrapper>
      );
    }

    // Standard CRM Activity Fields
    switch (key) {
      case "type": {
        const dynamicTypeLabels =
          fieldCfg?.options && fieldCfg.options.length > 0
            ? fieldCfg.options
            : ACTIVITY_TYPES.map((t) => t.label);

        return (
          <FormFieldWrapper
            key={key}
            fieldKey={key}
            label={label}
            required={req}
            options={dynamicTypeLabels}
            onUpdateField={handleUpdateField}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
          >
            <div className="flex flex-wrap gap-1.5">
              {dynamicTypeLabels.map((lbl) => {
                const matched = ACTIVITY_TYPES.find(
                  (t) => t.label.toLowerCase() === lbl.toLowerCase()
                );
                const typeId = matched?.id || lbl.toLowerCase().replace(/\s+/g, "_");
                const Icon = matched?.icon || Calendar;
                const isSelected = type === typeId;
                return (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => setType(typeId)}
                    className={`flex flex-col items-center justify-center p-2 min-w-[60px] flex-1 rounded-md border text-center transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#1c9be8] bg-blue-50/50 text-[#1c9be8] font-medium"
                        : "border-slate-200 hover:border-slate-300 text-slate-600 bg-white"
                    }`}
                  >
                    <Icon className="h-4 w-4 mb-1" />
                    <span className="text-[10px] leading-tight">{lbl}</span>
                  </button>
                );
              })}
            </div>
          </FormFieldWrapper>
        );
      }

      case "subject":
        return (
          <FormFieldWrapper
            key={key}
            fieldKey={key}
            label={label}
            required={req}
            error={errors.subject}
            placeholder={fieldCfg?.placeholder}
            onUpdateField={handleUpdateField}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
          >
            <Input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={fieldCfg?.placeholder || "e.g., Intro call with client"}
              className={`h-8 text-xs ${errors.subject ? "border-red-500" : ""}`}
            />
          </FormFieldWrapper>
        );

      case "notes":
        return (
          <FormFieldWrapper
            key={key}
            fieldKey={key}
            label={label}
            required={req}
            placeholder={fieldCfg?.placeholder}
            onUpdateField={handleUpdateField}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
          >
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={fieldCfg?.placeholder || "Key takeaways, notes, discussion points..."}
              className="w-full rounded border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-[#1c9be8]"
            />
          </FormFieldWrapper>
        );

      case "scheduled_at": {
        const dateVal = scheduledAt ? scheduledAt.substring(0, 10) : "";
        const timeVal =
          scheduledAt && scheduledAt.includes("T")
            ? scheduledAt.substring(11, 16)
            : "";
        return (
          <FormFieldWrapper
            key={key}
            fieldKey={key}
            label={label}
            required={req}
            onUpdateField={handleUpdateField}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
          >
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                  Date
                </span>
                <Input
                  type="date"
                  value={dateVal}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    if (!newDate) {
                      setScheduledAt("");
                    } else {
                      const curTime = timeVal || "10:00";
                      setScheduledAt(`${newDate}T${curTime}`);
                    }
                  }}
                  className="h-8 text-xs bg-white"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                  Time
                </span>
                <Input
                  type="time"
                  value={timeVal}
                  onChange={(e) => {
                    const newTime = e.target.value;
                    const curDate =
                      dateVal || new Date().toISOString().substring(0, 10);
                    if (!newTime) {
                      setScheduledAt(dateVal ? `${dateVal}T00:00` : "");
                    } else {
                      setScheduledAt(`${curDate}T${newTime}`);
                    }
                  }}
                  className="h-8 text-xs bg-white"
                />
              </div>
            </div>
          </FormFieldWrapper>
        );
      }

      case "is_completed":
        return (
          <FormFieldWrapper
            key={key}
            fieldKey={key}
            label={label}
            required={req}
            onUpdateField={handleUpdateField}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
          >
            <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isCompleted}
                onChange={(e) => setIsCompleted(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#1c9be8] focus:ring-[#1c9be8]"
              />
              <span className="text-xs text-slate-700">Mark as completed</span>
            </label>
          </FormFieldWrapper>
        );

      case "user_id":
        return (
          <FormFieldWrapper
            key={key}
            fieldKey={key}
            label={label}
            required={req}
            onUpdateField={handleUpdateField}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
          >
            <div className="relative">
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={loadingLookups}
                className="w-full h-8 rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-800 outline-none focus:border-[#1c9be8] appearance-none"
              >
                <option value="">Select User</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.email}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </FormFieldWrapper>
        );

      case "deal_id":
        return (
          <FormFieldWrapper
            key={key}
            fieldKey={key}
            label={label}
            required={req}
            onUpdateField={handleUpdateField}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
          >
            <div className="relative">
              <select
                value={dealId}
                onChange={(e) => setDealId(e.target.value)}
                disabled={loadingLookups}
                className="w-full h-8 rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-800 outline-none focus:border-[#1c9be8] appearance-none"
              >
                <option value="">No Deal</option>
                {deals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({d.currency} {Number(d.amount).toLocaleString()})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </FormFieldWrapper>
        );

      case "contact_id":
        return (
          <FormFieldWrapper
            key={key}
            fieldKey={key}
            label={label}
            required={req}
            onUpdateField={handleUpdateField}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
          >
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <SearchableSelect
                  options={filteredContacts.map((c) => ({
                    value: c.id,
                    label: c.full_name || `${c.first_name} ${c.last_name}`.trim(),
                    sublabel: c.company_name || c.email || undefined,
                    icon: UserIcon,
                  }))}
                  value={contactId}
                  onChange={(val) => {
                    setContactId(val);
                    if (val) {
                      const match = contacts.find((c) => c.id === val);
                      if (match && match.company_id) {
                        setCompanyId(match.company_id);
                      }
                    }
                  }}
                  disabled={loadingLookups}
                  placeholder="Search & choose contact..."
                  searchPlaceholder="Search contacts by name, email..."
                  emptyText="No contacts match search"
                  icon={UserIcon}
                />
              </div>
              <button
                type="button"
                onClick={() => setIsContactModalOpen(true)}
                className="h-8 px-2 text-xs text-[#00AEEF] bg-[#00AEEF]/5 hover:bg-[#00AEEF]/10 border border-[#00AEEF]/30 rounded shrink-0 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                title="Create New Contact"
              >
                <Plus className="h-3.5 w-3.5" /> Quick Add
              </button>
            </div>
          </FormFieldWrapper>
        );

      case "company_id":
        return (
          <FormFieldWrapper
            key={key}
            fieldKey={key}
            label={label}
            required={req}
            onUpdateField={handleUpdateField}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
          >
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <SearchableSelect
                  options={filteredCompanies.map((comp) => ({
                    value: comp.id,
                    label: comp.name,
                    sublabel: comp.industry || comp.website || undefined,
                    icon: Building2,
                  }))}
                  value={companyId}
                  onChange={(val) => {
                    setCompanyId(val);
                    if (!val) {
                      if (contactId) {
                        const currentContact = contacts.find((c) => c.id === contactId);
                        if (currentContact && currentContact.company_id) {
                          setContactId("");
                        }
                      }
                    } else if (contactId) {
                      const currentContact = contacts.find((c) => c.id === contactId);
                      if (currentContact && currentContact.company_id && currentContact.company_id !== val) {
                        setContactId("");
                      }
                    }
                  }}
                  disabled={loadingLookups}
                  placeholder="Search & choose company..."
                  searchPlaceholder="Search companies by name..."
                  emptyText="No companies match search"
                  icon={Building2}
                />
              </div>
              <button
                type="button"
                onClick={() => setIsCompanyModalOpen(true)}
                className="h-8 px-2 text-xs text-[#00AEEF] bg-[#00AEEF]/5 hover:bg-[#00AEEF]/10 border border-[#00AEEF]/30 rounded shrink-0 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                title="Create New Company"
              >
                <Plus className="h-3.5 w-3.5" /> Quick Add
              </button>
            </div>
          </FormFieldWrapper>
        );

      default:
        return null;
    }
  };

  if (!open) return null;

  return (
    <>
      <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Edit Activity" : "Log Activity"}
      description="Record calls, meetings, notes, and interactions."
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Error Notification */}
        {apiError && (
          <div className="rounded-md bg-red-50 p-2.5 flex items-center gap-2 border border-red-200 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{apiError}</span>
          </div>
        )}

        {/* Dynamic Sections Loop */}
        <div className="space-y-4">
          {sections.map((sec) => {
            const visibleFieldKeys = sec.fieldKeys.filter((key) => {
              const cfg = formConfig.find((f) => f.key === key);
              return cfg ? cfg.enabled !== false : true;
            });

            // Calculate available fields that can be added into this section
            const currentSecKeys = new Set(sec.fieldKeys);
            const allKnownFieldMap = new Map<string, FormFieldConfig>();
            DEFAULT_ACTIVITY_FIELDS.forEach((f) => allKnownFieldMap.set(f.key, f));
            formConfig.forEach((f) => allKnownFieldMap.set(f.key, f));
            const availableFieldsForSec = Array.from(allKnownFieldMap.values()).filter(
              (f) => !currentSecKeys.has(f.key)
            );

            return (
              <div
                key={sec.id}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs overflow-visible"
              >
                {/* Section Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                  {editingTitleSecId === sec.id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={tempSectionTitle}
                        onChange={(e) => setTempSectionTitle(e.target.value)}
                        className="h-6 px-1.5 py-0.5 text-xs font-bold uppercase rounded border border-[#1c9be8] outline-none text-slate-700 bg-white"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleRenameSection(sec.id, tempSectionTitle);
                            setEditingTitleSecId(null);
                          }
                          if (e.key === "Escape") setEditingTitleSecId(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          handleRenameSection(sec.id, tempSectionTitle);
                          setEditingTitleSecId(null);
                        }}
                        className="text-xs text-[#1c9be8] hover:text-[#1688cf] font-bold px-1 cursor-pointer"
                      >
                        ✓
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group/title">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {sec.title}
                      </h2>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTitleSecId(sec.id);
                          setTempSectionTitle(sec.title);
                        }}
                        className="text-slate-300 hover:text-slate-600 transition-colors cursor-pointer"
                        title="Edit section name"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      {sec.isCustom && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-50 text-[#1c9be8] font-semibold">
                          Custom
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Fields In Section */}
                <div className="space-y-3">
                  {visibleFieldKeys.length === 0 ? (
                    <div className="text-slate-400 italic text-xs py-2">
                      No fields configured in this section. Click &apos;Select field&apos; or &apos;Create field&apos; below.
                    </div>
                  ) : (
                    visibleFieldKeys.map((k) => {
                      const cfg = formConfig.find((f) => f.key === k);
                      return renderFieldInput(k, cfg);
                    })
                  )}

                  {/* Section Actions: Select field ⌵ | Create field | Delete section */}
                  <FormBuilderActions
                    availableFields={availableFieldsForSec}
                    onAddField={(key) => handleAddFieldToSection(sec.id, key)}
                    onCreateCustomField={(newField) =>
                      handleCreateCustomField(sec.id, newField)
                    }
                    onDeleteSection={
                      sections.length > 1 ? () => handleDeleteSection(sec.id) : undefined
                    }
                    entityName="Activity"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* "+ Add section" Control */}
        <div className="pt-1">
          {showAddSectionInput ? (
            <div className="rounded-lg border-2 border-dashed border-[#1c9be8]/40 bg-blue-50/30 p-3 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FolderPlus className="h-4 w-4 text-[#1c9be8]" />
                  <span>New Form Section</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddSectionInput(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="e.g., Participants, Outcome..."
                  className="h-8 flex-1 rounded border border-slate-300 px-3 text-xs text-slate-800 bg-white outline-none focus:border-[#1c9be8]"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSection();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddSection}
                  className="px-4 py-1.5 rounded bg-[#1c9be8] hover:bg-[#1688cf] text-white text-xs font-semibold shadow-2xs cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddSectionInput(true)}
              className="text-xs font-semibold text-[#1c9be8] hover:text-[#1688cf] flex items-center gap-1.5 py-1 px-1 cursor-pointer transition-colors"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              <span>+ Add section</span>
            </button>
          )}
        </div>

        {/* Modal Footer: strictly ONLY affirmative submit button, NO cancel button */}
        <div className="sticky bottom-0 bg-card/95 backdrop-blur-xs flex items-center justify-end pt-3 pb-1 border-t border-border mt-4 z-10">
          <Button
            type="submit"
            variant="bitrix"
            disabled={isSubmitting}
            className="gap-2 min-w-[120px]"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? "Save Changes" : "Log Activity"}
          </Button>
        </div>
      </form>
    </Dialog>

    {/* Quick-Add Entity Modals */}
    {isContactModalOpen && (
      <ContactForm
        open={isContactModalOpen}
        onOpenChange={setIsContactModalOpen}
        onSuccess={(newContact) => {
          setContacts((prev) => [newContact, ...prev.filter((c) => c.id !== newContact.id)]);
          setContactId(newContact.id);
          if (newContact.company_id) {
            setCompanyId(newContact.company_id);
          }
          setIsContactModalOpen(false);
        }}
      />
    )}

    {isCompanyModalOpen && (
      <CompanyForm
        open={isCompanyModalOpen}
        onOpenChange={setIsCompanyModalOpen}
        onSuccess={(newCompany) => {
          setCompanies((prev) => [newCompany, ...prev.filter((c) => c.id !== newCompany.id)]);
          setCompanyId(newCompany.id);
          if (contactId) {
            const currentContact = contacts.find((c) => c.id === contactId);
            if (currentContact && currentContact.company_id && currentContact.company_id !== newCompany.id) {
              setContactId("");
            }
          }
          setIsCompanyModalOpen(false);
        }}
      />
    )}
  </>
  );
}
