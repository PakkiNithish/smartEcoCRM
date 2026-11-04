"use client";

import React, { useState, useEffect } from "react";
import { CrmSidePanel } from "@/components/crm/crm-side-panel";
import { Contact, Company, User, FormFieldConfig } from "@/types/crm";
import { api } from "@/lib/api-client";
import { RecordActivityTasks } from "@/components/crm/record-activity-tasks";
import { FormFieldWrapper, FormFieldUpdates } from "@/components/crm/form-field-wrapper";
import { FormBuilderActions } from "@/components/crm/form-builder-actions";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DEFAULT_CONTACT_FIELDS, CONTACT_STAGES } from "@/lib/form-defaults";
import dynamic from "next/dynamic";

const CompanyForm = dynamic(
  () => import("./company-form").then((m) => m.CompanyForm),
  { ssr: false }
);
import {
  Edit2,
  Building2,
  Mail,
  Phone,
  Briefcase,
  Globe,
  MapPin,
  Calendar,
  User as UserIcon,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FolderPlus,
  X,
  FileText,
  ExternalLink,
  Clock,
} from "lucide-react";

interface ContactSidePanelProps {
  contact: Contact | null;
  open: boolean;
  onClose: () => void;
  isCreateMode?: boolean;
  companies: Company[];
  currentUser?: User | null;
  onSaved: (contact: Contact) => void;
}

interface FormSection {
  id: string;
  title: string;
  fieldKeys: string[];
  isCustom?: boolean;
}

const DEFAULT_SECTIONS: FormSection[] = [
  {
    id: "about",
    title: "ABOUT CONTACT",
    fieldKeys: [
      "salutation",
      "first_name",
      "last_name",
      "stage",
      "second_name",
      "photo",
      "date_of_birth",
      "job_title",
      "phone",
      "email",
      "company_id",
      "website",
      "messenger",
      "address",
      "linkedin",
      "details",
    ],
  },
  {
    id: "more",
    title: "MORE",
    fieldKeys: [
      "contact_type",
      "source",
      "source_info",
      "available_to_everyone",
      "included_in_export",
      "responsible",
      "comment",
    ],
  },
];

function ensureContactSectionsHaveStage(secs: FormSection[]): FormSection[] {
  const hasStage = secs.some((s) => s.fieldKeys.includes("stage"));
  if (!hasStage && secs.length > 0) {
    return secs.map((s, idx) => {
      if (idx === 0 || s.id === "about") {
        const newKeys = [...s.fieldKeys];
        const lastIdx = newKeys.indexOf("last_name");
        const firstIdx = newKeys.indexOf("first_name");
        const insertIdx = lastIdx !== -1 ? lastIdx + 1 : (firstIdx !== -1 ? firstIdx + 1 : 0);
        newKeys.splice(insertIdx, 0, "stage");
        return { ...s, fieldKeys: newKeys };
      }
      return s;
    });
  }
  return secs;
}

export function ContactSidePanel({
  contact,
  open,
  onClose,
  isCreateMode = false,
  companies,
  currentUser,
  onSaved,
}: ContactSidePanelProps) {
  // Section Edit State: "none" | section.id | "all"
  const [editingSection, setEditingSection] = useState<string>(
    isCreateMode ? "all" : "none"
  );

  // Form Configuration State
  const [formConfig, setFormConfig] = useState<FormFieldConfig[]>(DEFAULT_CONTACT_FIELDS);
  const [sections, setSections] = useState<FormSection[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const rawSec = localStorage.getItem("crm_contact_sections");
        if (rawSec) {
          const parsed = JSON.parse(rawSec);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return ensureContactSectionsHaveStage(parsed);
          }
        }
      } catch {}
    }
    return ensureContactSectionsHaveStage(DEFAULT_SECTIONS);
  });
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [showAddSectionInput, setShowAddSectionInput] = useState(false);
  const [editingTitleSecId, setEditingTitleSecId] = useState<string | null>(null);
  const [tempSectionTitle, setTempSectionTitle] = useState("");

  // Standard Form Fields State
  const [salutation, setSalutation] = useState("Not selected");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [stage, setStage] = useState<string>("Not Contacted");
  const [secondName, setSecondName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneType, setPhoneType] = useState("Work Phone");
  const [jobTitle, setJobTitle] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [website, setWebsite] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [address, setAddress] = useState("");
  const [contactType, setContactType] = useState("Clients");
  const [source, setSource] = useState("Call");
  const [sourceInfo, setSourceInfo] = useState("");
  const [availableToEveryone, setAvailableToEveryone] = useState(true);
  const [includedInExport, setIncludedInExport] = useState(true);
  const [comment, setComment] = useState("");
  const [details, setDetails] = useState("");
  const [messenger, setMessenger] = useState("");

  // Dynamic Custom Fields State
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [fetchedCompany, setFetchedCompany] = useState<Company | null>(null);
  const [companiesList, setCompaniesList] = useState<Company[]>(companies);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);

  // Staged activities and tasks when in create mode
  const [stagedActivities, setStagedActivities] = useState<any[]>([]);
  const [stagedTasks, setStagedTasks] = useState<any[]>([]);

  useEffect(() => {
    if (companies && companies.length > 0) {
      setCompaniesList(companies);
    }
  }, [companies]);

  useEffect(() => {
    const targetCompanyId = companyId || contact?.company_id;
    if (targetCompanyId) {
      const match = companies.find((c) => c.id === targetCompanyId) || (contact?.company as Company);
      if (match) {
        setFetchedCompany(match);
      } else {
        api.getCompany(targetCompanyId).then(setFetchedCompany).catch(() => {});
      }
    } else {
      setFetchedCompany(null);
    }
  }, [companyId, contact?.company_id, contact?.company, companies]);

  // Validation & Saving states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("General");

  // Load Form Config & Sections from Backend and LocalStorage
  useEffect(() => {
    async function loadConfig() {
      try {
        let cachedConfig: FormFieldConfig[] | null = null;
        let cachedSections: FormSection[] | null = null;

        if (typeof window !== "undefined") {
          try {
            const rawCfg = localStorage.getItem("crm_form_config_contact");
            if (rawCfg) cachedConfig = JSON.parse(rawCfg);
            const rawSec = localStorage.getItem("crm_contact_sections");
            if (rawSec) cachedSections = JSON.parse(rawSec);
          } catch {}
        }

        const res = await api.getFormConfig("contact");
        if (res?.fields_config && Array.isArray(res.fields_config)) {
          const sectionEntries = res.fields_config.filter(
            (f: any) => f.key?.startsWith("__section__") || f.type === "section"
          );
          if (sectionEntries.length > 0) {
            const loadedSecs: FormSection[] = sectionEntries.map((se: any) => ({
              id: se.key ? se.key.replace("__section__", "") : se.id,
              title: se.label || se.title,
              fieldKeys: Array.isArray(se.options) ? se.options : [],
              isCustom: Boolean(se.is_custom),
            }));
            const verifiedSecs = ensureContactSectionsHaveStage(loadedSecs);
            setSections(verifiedSecs);
            try {
              localStorage.setItem("crm_contact_sections", JSON.stringify(verifiedSecs));
            } catch {}
          } else if (cachedSections && Array.isArray(cachedSections) && cachedSections.length > 0) {
            const verifiedSecs = ensureContactSectionsHaveStage(cachedSections);
            setSections(verifiedSecs);
            try {
              localStorage.setItem("crm_contact_sections", JSON.stringify(verifiedSecs));
            } catch {}
          }

          const cleanFields = res.fields_config.filter(
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
        } else if (cachedConfig && Array.isArray(cachedConfig)) {
          const mergedCached = [...cachedConfig];
          DEFAULT_CONTACT_FIELDS.forEach((def) => {
            if (!mergedCached.some((f) => f.key === def.key)) {
              mergedCached.push(def);
            }
          });
          setFormConfig(mergedCached);
          if (cachedSections && Array.isArray(cachedSections) && cachedSections.length > 0) {
            const verifiedSecs = ensureContactSectionsHaveStage(cachedSections);
            setSections(verifiedSecs);
          }
        }
      } catch (err) {
        console.error("Failed to load contact form configuration:", err);
      }
    }

    if (open) {
      loadConfig();
    }
  }, [open]);

  // Sync Form Config & Sections to Backend & LocalStorage
  const syncFormConfigAndSections = async (
    updatedConfig: FormFieldConfig[],
    updatedSecs: FormSection[]
  ) => {
    setFormConfig(updatedConfig);
    setSections(updatedSecs);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("crm_form_config_contact", JSON.stringify(updatedConfig));
        localStorage.setItem("crm_contact_sections", JSON.stringify(updatedSecs));
      } catch {}
    }
    try {
      const sectionEntries: FormFieldConfig[] = updatedSecs.map((s) => ({
        key: `__section__${s.id}`,
        label: s.title,
        type: "section",
        required: false,
        is_custom: Boolean(s.isCustom),
        enabled: true,
        options: s.fieldKeys,
      }));
      const cleanFields = updatedConfig.filter(
        (f) => !f.key.startsWith("__section__") && f.type !== "section"
      );
      await api.updateFormConfig("contact", [...cleanFields, ...sectionEntries]);
    } catch (err) {
      console.error("Failed to sync contact form config to server:", err);
    }
  };

  // Sync Contact data whenever contact or open changes
  useEffect(() => {
    if (contact && !isCreateMode) {
      setFirstName(contact.first_name || "");
      setLastName(contact.last_name || "");
      setStage(contact.stage || "Not Contacted");
      setJobTitle(contact.job_title || "");
      setCompanyId(contact.company_id || "");
      setEmail(contact.email || "");
      setPhone(contact.phone || "");

      const cf = contact.custom_fields || {};
      setSecondName(cf.second_name || "");
      setPhoneType(cf.phone_type || "Work Phone");
      setWebsite(cf.website || "");
      setLinkedin(cf.linkedin || "");
      setAddress(cf.address || "");
      setContactType(cf.contact_type || "Clients");
      setSource(cf.source || "Call");
      setSourceInfo(cf.source_info || "");
      setAvailableToEveryone(cf.available_to_everyone ?? true);
      setIncludedInExport(cf.included_in_export ?? true);
      setComment(cf.comment || "");
      setSalutation(cf.salutation || "Not selected");
      setDetails(cf.details || "");
      setMessenger(cf.messenger || "");
      setCustomFields(cf);
      setEditingSection("none");
    } else if (isCreateMode) {
      setFirstName("");
      setLastName("");
      setStage("Not Contacted");
      setSecondName("");
      setEmail("");
      setPhone("");
      setPhoneType("Work Phone");
      setJobTitle("");
      setCompanyId("");
      setWebsite("");
      setLinkedin("");
      setAddress("");
      setContactType("Clients");
      setSource("Call");
      setSourceInfo("");
      setAvailableToEveryone(true);
      setIncludedInExport(true);
      setComment("");
      setSalutation("Not selected");
      setDetails("");
      setMessenger("");
      setStagedActivities([]);
      setStagedTasks([]);
      setCustomFields({});
      setEditingSection("all");
    }
    setErrors({});
  }, [contact, isCreateMode, open]);

  // Cancel Handler: Discards unsaved values without network requests
  const handleCancel = () => {
    if (isCreateMode) {
      onClose();
    } else if (contact) {
      setFirstName(contact.first_name || "");
      setLastName(contact.last_name || "");
      setStage(contact.stage || "Not Contacted");
      setJobTitle(contact.job_title || "");
      setCompanyId(contact.company_id || "");
      setEmail(contact.email || "");
      setPhone(contact.phone || "");

      const cf = contact.custom_fields || {};
      setSecondName(cf.second_name || "");
      setPhoneType(cf.phone_type || "Work Phone");
      setWebsite(cf.website || "");
      setLinkedin(cf.linkedin || "");
      setAddress(cf.address || "");
      setContactType(cf.contact_type || "Clients");
      setSource(cf.source || "Call");
      setSourceInfo(cf.source_info || "");
      setComment(cf.comment || "");
      setSalutation(cf.salutation || "Not selected");
      setDetails(cf.details || "");
      setMessenger(cf.messenger || "");
      setCustomFields(cf);
      setErrors({});
      setEditingSection("none");
    }
  };

  // Save Handler: Validates and persists
  const handleSave = async () => {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) {
      errs.firstName = "Name is required.";
    }

    // Check any dynamic required custom fields
    formConfig.forEach((f) => {
      if (f.enabled && f.required && f.is_custom) {
        const val = customFields[f.key];
        if (!val || (typeof val === "string" && !val.trim())) {
          errs[f.key] = `${f.label} is required.`;
        }
      }
    });

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const mergedCustomFields = {
        ...(contact?.custom_fields || {}),
        ...customFields,
        salutation,
        second_name: secondName,
        phone_type: phoneType,
        website,
        linkedin,
        address,
        contact_type: contactType,
        source,
        source_info: sourceInfo,
        available_to_everyone: availableToEveryone,
        included_in_export: includedInExport,
        comment,
        details,
        messenger,
      };

      if (isCreateMode) {
        const payload = {
          first_name: firstName.trim(),
          last_name: lastName.trim() || undefined,
          stage: stage.trim() || "Not Contacted",
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          job_title: jobTitle.trim() || undefined,
          company_id: companyId || undefined,
          custom_fields: mergedCustomFields,
        };
        const saved = await api.createContact(payload as any);

        // Generate any activities logged while creating the contact
        if (stagedActivities.length > 0) {
          await Promise.allSettled(
            stagedActivities.map((act) =>
              api.createActivity({
                type: act.type,
                subject: act.subject,
                notes: act.notes,
                scheduled_at: act.scheduled_at,
                is_completed: act.is_completed,
                contact_id: saved.id,
                company_id: saved.company_id || undefined,
                user_id: act.user_id,
                custom_fields: act.custom_fields,
              })
            )
          );
        }

        // Generate any tasks logged while creating the contact
        if (stagedTasks.length > 0) {
          await Promise.allSettled(
            stagedTasks.map((tsk) =>
              api.createTask({
                title: tsk.title,
                description: tsk.description,
                status: tsk.status,
                priority: tsk.priority,
                due_date: tsk.due_date,
                contact_id: saved.id,
                company_id: saved.company_id || undefined,
                assigned_to_id: tsk.assigned_to_id,
                custom_fields: tsk.custom_fields,
              })
            )
          );
        }

        onSaved(saved);
        onClose();
      } else if (contact) {
        const payload = {
          first_name: firstName.trim(),
          last_name: lastName.trim() || undefined,
          stage: stage.trim() || "Not Contacted",
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          job_title: jobTitle.trim() || undefined,
          company_id: companyId || null,
          custom_fields: mergedCustomFields,
        };
        const updated = await api.updateContact(contact.id, payload as any);
        onSaved(updated);
        setEditingSection("none");
      }
    } catch (err: any) {
      const msg = err.detail || err.message || "Failed to save contact.";
      const newErrors: Record<string, string> = { form: msg };
      if (typeof msg === "string") {
        const lower = msg.toLowerCase();
        if (lower.includes("name")) newErrors.first_name = msg;
        else if (lower.includes("email")) newErrors.email = msg;
        else if (lower.includes("phone")) newErrors.phone = msg;
      }
      setErrors(newErrors);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Form Builder / Field Configuration Handlers
  const getFieldCfg = (key: string): FormFieldConfig | undefined => {
    return formConfig.find((f) => f.key === key);
  };

  const getFieldLabel = (key: string, defVal: string): string => {
    const f = getFieldCfg(key);
    return f?.label || defVal;
  };

  const getFieldOptions = (key: string, defVal: string[] = []): string[] => {
    const f = getFieldCfg(key);
    return f?.options && f.options.length > 0 ? f.options : defVal;
  };

  const handleUpdateField = (key: string, updates: FormFieldUpdates) => {
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
    syncFormConfigAndSections(updated, sections);
  };

  const handleToggleRequired = (key: string) => {
    const updated = formConfig.map((f) =>
      f.key === key ? { ...f, required: !f.required } : f
    );
    syncFormConfigAndSections(updated, sections);
  };

  const handleRemoveField = (key: string) => {
    // Hide field and remove from all sections
    const updatedSecs = sections.map((sec) => ({
      ...sec,
      fieldKeys: sec.fieldKeys.filter((k) => k !== key),
    }));
    const updated = formConfig.map((f) =>
      f.key === key ? { ...f, enabled: false } : f
    );
    syncFormConfigAndSections(updated, updatedSecs);
  };

  const handleDeleteField = (key: string) => {
    // 1. Remove from all sections
    const updatedSecs = sections.map((sec) => ({
      ...sec,
      fieldKeys: sec.fieldKeys.filter((k) => k !== key),
    }));

    // 2. If custom field, remove from formConfig. If standard field, mark enabled: false so it's hidden from form but available in Select field
    const updated = formConfig
      .map((f) => (f.key === key ? { ...f, enabled: false } : f))
      .filter((f) => !(f.is_custom && f.key === key));
    syncFormConfigAndSections(updated, updatedSecs);
  };

  const handleAddFieldToSection = (sectionId: string, fieldKey: string) => {
    let updatedConfig = [...formConfig];
    const existingIndex = updatedConfig.findIndex((f) => f.key === fieldKey);
    if (existingIndex >= 0) {
      updatedConfig[existingIndex] = { ...updatedConfig[existingIndex], enabled: true };
    } else {
      const defaultField = DEFAULT_CONTACT_FIELDS.find((f) => f.key === fieldKey);
      if (defaultField) {
        updatedConfig.push({ ...defaultField, enabled: true });
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
    syncFormConfigAndSections(updatedConfig, updatedSecs);
  };

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
    setEditingSection(newSec.id);
  };

  const handleDeleteSection = (sectionId: string) => {
    const updated = sections.filter((s) => s.id !== sectionId);
    syncFormConfigAndSections(formConfig, updated);
    if (editingSection === sectionId) {
      setEditingSection("none");
    }
  };

  const handleRenameSection = (secId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    const updated = sections.map((s) =>
      s.id === secId ? { ...s, title: newTitle.trim().toUpperCase() } : s
    );
    syncFormConfigAndSections(formConfig, updated);
  };

  const handleMoveSection = (secIdx: number, direction: "up" | "down") => {
    if (direction === "up" && secIdx === 0) return;
    if (direction === "down" && secIdx === sections.length - 1) return;
    const targetIdx = direction === "up" ? secIdx - 1 : secIdx + 1;
    const newSections = [...sections];
    const temp = newSections[secIdx];
    newSections[secIdx] = newSections[targetIdx];
    newSections[targetIdx] = temp;
    syncFormConfigAndSections(formConfig, newSections);
  };

  if (!open) return null;

  const fullName = isCreateMode
    ? "New contact"
    : `${firstName} ${lastName}`.trim() || "Untitled Contact";

  const associatedCompany =
    companies.find((c) => c.id === companyId) || (contact?.company as Company) || fetchedCompany;
  const isInEditState = editingSection !== "none";

  // Calculate hidden fields that can be added via "Select field"
  const hiddenFields = formConfig.filter((f) => !f.enabled);

  // Helper to render individual field inputs in Edit mode
  const renderFieldInput = (key: string, fieldCfg?: FormFieldConfig) => {
    const isCustom = fieldCfg?.is_custom ?? false;
    const req = fieldCfg?.required ?? false;
    const label = getFieldLabel(key, fieldCfg?.label || key);

    if (isCustom) {
      return (
        <FormFieldWrapper
          key={key}
          fieldKey={key}
          label={label}
          required={req}
          isCustom={true}
          error={errors[key]}
          options={getFieldOptions(key, fieldCfg?.options || [])}
          placeholder={fieldCfg?.placeholder}
          onToggleRequired={handleToggleRequired}
          onRemoveField={handleRemoveField}
          onDeleteField={handleDeleteField}
          onUpdateField={handleUpdateField}
        >
          {fieldCfg?.type === "select" ? (
            <div className="relative">
              <select
                value={customFields[key] || ""}
                onChange={(e) => setCustomFields({ ...customFields, [key]: e.target.value })}
                className="w-full h-8 rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-800 outline-none focus:border-[#1c9be8] appearance-none"
              >
                <option value="">Select option...</option>
                {getFieldOptions(key, fieldCfg?.options || []).map((opt) => (
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
              onChange={(e) => setCustomFields({ ...customFields, [key]: e.target.value })}
              placeholder={fieldCfg?.placeholder || `Enter ${label}...`}
              className="w-full rounded border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-[#1c9be8]"
            />
          ) : fieldCfg?.type === "checkbox" ? (
            <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(customFields[key])}
                onChange={(e) => setCustomFields({ ...customFields, [key]: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-[#1c9be8] focus:ring-[#1c9be8]"
              />
              <span className="text-xs text-slate-700">Yes / Active</span>
            </label>
          ) : fieldCfg?.type === "datetime" ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">Date</span>
                <input
                  type="date"
                  value={customFields[key] ? String(customFields[key]).substring(0, 10) : ""}
                  onChange={(e) => {
                    const d = e.target.value;
                    const cur = customFields[key] || "";
                    const t = String(cur).includes("T") ? String(cur).substring(11, 16) : "12:00";
                    setCustomFields({ ...customFields, [key]: d ? `${d}T${t}` : "" });
                  }}
                  className="h-8 w-full rounded border border-slate-300 px-2 text-xs bg-white text-slate-800 outline-none focus:border-[#1c9be8]"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">Time</span>
                <input
                  type="time"
                  value={
                    customFields[key] && String(customFields[key]).includes("T")
                      ? String(customFields[key]).substring(11, 16)
                      : ""
                  }
                  onChange={(e) => {
                    const t = e.target.value;
                    const cur = customFields[key] || "";
                    const d = cur ? String(cur).substring(0, 10) : new Date().toISOString().substring(0, 10);
                    setCustomFields({ ...customFields, [key]: t ? `${d}T${t}` : "" });
                  }}
                  className="h-8 w-full rounded border border-slate-300 px-2 text-xs bg-white text-slate-800 outline-none focus:border-[#1c9be8]"
                />
              </div>
            </div>
          ) : (
            <input
              type={fieldCfg?.type === "number" ? "number" : fieldCfg?.type === "date" ? "date" : "text"}
              value={customFields[key] || ""}
              onChange={(e) => setCustomFields({ ...customFields, [key]: e.target.value })}
              placeholder={fieldCfg?.placeholder || `Enter ${label}...`}
              className="h-8 w-full rounded border border-slate-300 px-2.5 text-xs text-slate-800 outline-none focus:border-[#1c9be8]"
            />
          )}
        </FormFieldWrapper>
      );
    }

    // Standard CRM Fields
    switch (key) {
      case "first_name":
      case "name":
        return (
          <FormFieldWrapper
            key="name"
            fieldKey="first_name"
            label={getFieldLabel("first_name", "Name")}
            required={true}
            error={errors.firstName}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
            onUpdateField={handleUpdateField}
          >
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (errors.firstName) setErrors({ ...errors, firstName: "" });
                }}
                placeholder="First name*"
                className="h-8 w-full rounded border border-slate-300 px-2.5 text-xs text-slate-800 outline-none focus:border-[#1c9be8]"
              />
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="h-8 w-full rounded border border-slate-300 px-2.5 text-xs text-slate-800 outline-none focus:border-[#1c9be8]"
              />
            </div>
          </FormFieldWrapper>
        );

      case "stage":
        return (
          <FormFieldWrapper
            key="stage"
            fieldKey="stage"
            label={getFieldLabel("stage", "Stage")}
            options={getFieldOptions("stage", [...CONTACT_STAGES])}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
            onUpdateField={handleUpdateField}
          >
            <div className="relative">
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="h-8 w-full rounded border border-slate-300 px-2.5 text-xs text-slate-800 bg-white outline-none focus:border-[#1c9be8] appearance-none"
              >
                {getFieldOptions("stage", [...CONTACT_STAGES]).map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </FormFieldWrapper>
        );

      case "salutation":
        return (
          <FormFieldWrapper
            key="salutation"
            fieldKey="salutation"
            label={getFieldLabel("salutation", "Salutation")}
            options={getFieldOptions("salutation", ["Not selected", "Mr.", "Ms.", "Dr.", "Prof."])}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
            onUpdateField={handleUpdateField}
          >
            <select
              value={salutation}
              onChange={(e) => setSalutation(e.target.value)}
              className="h-8 w-full rounded border border-slate-300 px-2.5 text-xs text-slate-800 bg-white outline-none focus:border-[#1c9be8]"
            >
              {getFieldOptions("salutation", ["Not selected", "Mr.", "Ms.", "Dr.", "Prof."]).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </FormFieldWrapper>
        );

      case "second_name":
        return (
          <FormFieldWrapper
            key="second_name"
            fieldKey="second_name"
            label={getFieldLabel("second_name", "Second name")}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
            onUpdateField={handleUpdateField}
          >
            <input
              type="text"
              value={secondName}
              onChange={(e) => setSecondName(e.target.value)}
              placeholder={getFieldCfg("second_name")?.placeholder || "Middle or patronymic name"}
              className="h-8 w-full rounded border border-slate-300 px-2.5 text-xs text-slate-800 outline-none focus:border-[#1c9be8]"
            />
          </FormFieldWrapper>
        );

      case "job_title":
        return (
          <FormFieldWrapper
            key="job_title"
            fieldKey="job_title"
            label={getFieldLabel("job_title", "Position / Job Title")}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
            onUpdateField={handleUpdateField}
          >
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder={getFieldCfg("job_title")?.placeholder || "e.g. Sales Director"}
              className="h-8 w-full rounded border border-slate-300 px-2.5 text-xs text-slate-800 outline-none focus:border-[#1c9be8]"
            />
          </FormFieldWrapper>
        );

      case "phone":
        return (
          <FormFieldWrapper
            key="phone"
            fieldKey="phone"
            label={getFieldLabel("phone", "Phone")}
            options={getFieldOptions("phone_type", ["Work Phone", "Mobile Phone", "Home Phone", "Other"])}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
            onUpdateField={handleUpdateField}
          >
            <div className="flex gap-2">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={getFieldCfg("phone")?.placeholder || "+91 98765 43210"}
                className="h-8 flex-1 rounded border border-slate-300 px-2.5 text-xs text-slate-800 outline-none focus:border-[#1c9be8]"
              />
              <select
                value={phoneType}
                onChange={(e) => setPhoneType(e.target.value)}
                className="h-8 w-32 rounded border border-slate-300 px-2 text-xs text-slate-700 bg-white outline-none focus:border-[#1c9be8]"
              >
                {getFieldOptions("phone_type", ["Work Phone", "Mobile Phone", "Home Phone", "Other"]).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </FormFieldWrapper>
        );

      case "email":
        return (
          <FormFieldWrapper
            key="email"
            fieldKey="email"
            label={getFieldLabel("email", "E-mail")}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
            onUpdateField={handleUpdateField}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={getFieldCfg("email")?.placeholder || "contact@example.com"}
              className="h-8 w-full rounded border border-slate-300 px-2.5 text-xs text-slate-800 outline-none focus:border-[#1c9be8]"
            />
          </FormFieldWrapper>
        );

      case "company_id":
        return (
          <FormFieldWrapper
            key="company_id"
            fieldKey="company_id"
            label={getFieldLabel("company_id", "Company")}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
            onUpdateField={handleUpdateField}
          >
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <SearchableSelect
                  options={companiesList.map((c) => ({
                    value: c.id,
                    label: c.name,
                    sublabel: c.industry || c.website || undefined,
                    icon: Building2,
                  }))}
                  value={companyId}
                  onChange={(val) => setCompanyId(val)}
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

      case "website":
        return (
          <FormFieldWrapper
            key="website"
            fieldKey="website"
            label={getFieldLabel("website", "Website")}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
            onUpdateField={handleUpdateField}
          >
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder={getFieldCfg("website")?.placeholder || "https://example.com"}
              className="h-8 w-full rounded border border-slate-300 px-2.5 text-xs text-slate-800 outline-none focus:border-[#1c9be8]"
            />
          </FormFieldWrapper>
        );

      case "messenger":
        return (
          <FormFieldWrapper
            key="messenger"
            fieldKey="messenger"
            label={getFieldLabel("messenger", "Messenger")}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
            onUpdateField={handleUpdateField}
          >
            <input
              type="text"
              value={messenger}
              onChange={(e) => setMessenger(e.target.value)}
              placeholder={getFieldCfg("messenger")?.placeholder || "Telegram or WhatsApp ID"}
              className="h-8 w-full rounded border border-slate-300 px-2.5 text-xs text-slate-800 outline-none focus:border-[#1c9be8]"
            />
          </FormFieldWrapper>
        );

      case "address":
        return (
          <FormFieldWrapper
            key="address"
            fieldKey="address"
            label={getFieldLabel("address", "Contact Address")}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
            onUpdateField={handleUpdateField}
          >
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={getFieldCfg("address")?.placeholder || "City, State, Country"}
              className="h-8 w-full rounded border border-slate-300 px-2.5 text-xs text-slate-800 outline-none focus:border-[#1c9be8]"
            />
          </FormFieldWrapper>
        );

      case "linkedin":
        return (
          <FormFieldWrapper
            key="linkedin"
            fieldKey="linkedin"
            label={getFieldLabel("linkedin", "Linkedin link")}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
            onUpdateField={handleUpdateField}
          >
            <input
              type="text"
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              placeholder={getFieldCfg("linkedin")?.placeholder || "https://linkedin.com/in/username"}
              className="h-8 w-full rounded border border-slate-300 px-2.5 text-xs text-slate-800 outline-none focus:border-[#1c9be8]"
            />
          </FormFieldWrapper>
        );

      case "details":
        return (
          <FormFieldWrapper
            key="details"
            fieldKey="details"
            label={getFieldLabel("details", "Banking & Legal Requisites")}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
            onUpdateField={handleUpdateField}
          >
            <textarea
              rows={2}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={getFieldCfg("details")?.placeholder || "Tax ID, Bank requisites, legal entity details..."}
              className="w-full rounded border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-[#1c9be8]"
            />
          </FormFieldWrapper>
        );

      case "contact_type":
        return (
          <FormFieldWrapper
            key="contact_type"
            fieldKey="contact_type"
            label={getFieldLabel("contact_type", "Contact type")}
            options={getFieldOptions("contact_type", ["Clients", "Partners", "Suppliers", "Other"])}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
            onUpdateField={handleUpdateField}
          >
            <select
              value={contactType}
              onChange={(e) => setContactType(e.target.value)}
              className="h-8 w-full rounded border border-slate-300 px-2.5 text-xs text-slate-800 bg-white outline-none focus:border-[#1c9be8]"
            >
              {getFieldOptions("contact_type", ["Clients", "Partners", "Suppliers", "Other"]).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </FormFieldWrapper>
        );

      case "source":
        return (
          <FormFieldWrapper
            key="source"
            fieldKey="source"
            label={getFieldLabel("source", "Source")}
            options={getFieldOptions("source", ["Call", "Web", "Email", "Advertising", "Referral"])}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
            onUpdateField={handleUpdateField}
          >
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="h-8 w-full rounded border border-slate-300 px-2.5 text-xs text-slate-800 bg-white outline-none focus:border-[#1c9be8]"
            >
              {getFieldOptions("source", ["Call", "Web", "Email", "Advertising", "Referral"]).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </FormFieldWrapper>
        );

      case "source_info":
        return (
          <FormFieldWrapper
            key="source_info"
            fieldKey="source_info"
            label={getFieldLabel("source_info", "Source information")}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
            onUpdateField={handleUpdateField}
          >
            <input
              type="text"
              value={sourceInfo}
              onChange={(e) => setSourceInfo(e.target.value)}
              placeholder={getFieldCfg("source_info")?.placeholder || "Additional details about source..."}
              className="h-8 w-full rounded border border-slate-300 px-2.5 text-xs text-slate-800 outline-none focus:border-[#1c9be8]"
            />
          </FormFieldWrapper>
        );

      case "available_to_everyone":
        return (
          <FormFieldWrapper
            key="available_to_everyone"
            fieldKey="available_to_everyone"
            label={getFieldLabel("available_to_everyone", "Available to everyone")}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
            onUpdateField={handleUpdateField}
          >
            <label className="flex items-center gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={availableToEveryone}
                onChange={(e) => setAvailableToEveryone(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#1c9be8] focus:ring-[#1c9be8]"
              />
              <span className="text-xs text-slate-700">Yes, public to all staff</span>
            </label>
          </FormFieldWrapper>
        );

      case "included_in_export":
        return (
          <FormFieldWrapper
            key="included_in_export"
            fieldKey="included_in_export"
            label={getFieldLabel("included_in_export", "Included in export")}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
            onUpdateField={handleUpdateField}
          >
            <label className="flex items-center gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={includedInExport}
                onChange={(e) => setIncludedInExport(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#1c9be8] focus:ring-[#1c9be8]"
              />
              <span className="text-xs text-slate-700">Include in list exports</span>
            </label>
          </FormFieldWrapper>
        );

      case "comment":
        return (
          <FormFieldWrapper
            key="comment"
            fieldKey="comment"
            label={getFieldLabel("comment", "Comment")}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
            onUpdateField={handleUpdateField}
          >
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder={getFieldCfg("comment")?.placeholder || "Internal notes or comments..."}
              className="w-full rounded border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-[#1c9be8]"
            />
          </FormFieldWrapper>
        );

      default:
        return null;
    }
  };

  // Helper to render individual field formatted values in View mode
  const renderFieldView = (key: string, fieldCfg?: FormFieldConfig) => {
    if (fieldCfg?.is_custom) {
      const val = customFields[key];
      return (
        <div key={key} className="pt-1">
          <div className="text-[11px] font-medium text-slate-400">{fieldCfg.label}</div>
          <div className="mt-0.5 text-slate-800 font-medium">
            {val !== undefined && val !== "" ? (
              fieldCfg.type === "checkbox" ? (
                val ? "Yes" : "No"
              ) : (
                String(val)
              )
            ) : (
              <span className="text-slate-400 italic">Not provided</span>
            )}
          </div>
        </div>
      );
    }

    switch (key) {
      case "first_name":
      case "name":
        return (
          <div key="name" className="flex items-start justify-between">
            <div>
              <div className="text-base font-bold text-slate-900 tracking-tight">{fullName}</div>
              {jobTitle && (
                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 font-medium">
                  <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                  <span>{jobTitle}</span>
                </div>
              )}
            </div>
          </div>
        );

      case "stage":
        return (
          <div key="stage">
            <div className="text-[11px] font-medium text-slate-400">Lifecycle Stage</div>
            <div className="mt-1">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border ${
                  stage === "Deal Won"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : stage === "Lost / Not Interested"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : stage === "Negotiation"
                    ? "bg-orange-50 text-orange-700 border-orange-200"
                    : stage === "Proposal Shared"
                    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : stage === "Meeting Scheduled & Discussion"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : stage === "Follow-up Required"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : stage === "Contacted (LinkedIn & Email )"
                    ? "bg-sky-50 text-sky-700 border-sky-200"
                    : "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                {stage || "Not Contacted"}
              </span>
            </div>
          </div>
        );

      case "salutation":
        if (!salutation || salutation === "Not selected") return null;
        return (
          <div key="salutation">
            <div className="text-[11px] font-medium text-slate-400">Salutation</div>
            <div className="mt-0.5 text-slate-800 font-medium">{salutation}</div>
          </div>
        );

      case "email":
        return (
          <div key="email">
            <div className="text-[11px] font-medium text-slate-400">E-mail</div>
            {email ? (
              <div className="mt-1 flex items-center gap-2">
                <a
                  href={`mailto:${email}`}
                  className="text-[#1c9be8] hover:underline font-medium text-xs flex items-center gap-1.5"
                >
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span>{email}</span>
                </a>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                  Work
                </span>
              </div>
            ) : (
              <div className="text-slate-400 italic text-xs mt-0.5">Not provided</div>
            )}
          </div>
        );

      case "phone":
        return (
          <div key="phone">
            <div className="text-[11px] font-medium text-slate-400">Phone</div>
            {phone ? (
              <div className="mt-1 flex items-center gap-2">
                <a
                  href={`tel:${phone}`}
                  className="text-slate-800 hover:text-[#1c9be8] font-medium text-xs flex items-center gap-1.5"
                >
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>{phone}</span>
                </a>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                  {phoneType}
                </span>
              </div>
            ) : (
              <div className="text-slate-400 italic text-xs mt-0.5">Not provided</div>
            )}
          </div>
        );

      case "company_id":
        return (
          <div key="company_id" className="pt-1">
            <div className="text-[11px] font-medium text-slate-400">Company</div>
            {associatedCompany ? (
              <div className="mt-1 p-3 rounded-lg border border-slate-200 bg-white shadow-2xs hover:border-[#1c9be8]/40 transition-colors">
                <div className="text-[11px] font-medium text-slate-400 mb-1">
                  Contact companies
                </div>
                <div className="flex items-start justify-between">
                  <div className="min-w-0 pr-2">
                    <a
                      href={`/companies?id=${associatedCompany.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-slate-800 hover:text-[#1c9be8] cursor-pointer inline-flex items-center gap-1.5 group"
                      title="Open company details in new tab"
                    >
                      <span className="truncate">{associatedCompany.name}</span>
                      <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-[#1c9be8] shrink-0" />
                    </a>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {associatedCompany.company_type || (associatedCompany as any).custom_fields?.company_type || "Partner"}, {associatedCompany.industry || "Information Technology"}
                    </div>
                    {associatedCompany.address && (
                      <div className="text-[11px] text-[#1c9be8] hover:underline cursor-pointer mt-1">
                        Show address
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 shrink-0">
                    {associatedCompany.phone && (
                      <a href={`tel:${associatedCompany.phone}`} title={associatedCompany.phone}>
                        <Phone className="h-3.5 w-3.5 hover:text-[#1c9be8] cursor-pointer" />
                      </a>
                    )}
                    {associatedCompany.email && (
                      <a href={`mailto:${associatedCompany.email}`} title={associatedCompany.email}>
                        <Mail className="h-3.5 w-3.5 hover:text-[#1c9be8] cursor-pointer" />
                      </a>
                    )}
                    <a
                      href={`/companies?id=${associatedCompany.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open company details in new tab"
                      className="p-1 text-slate-400 hover:text-[#1c9be8] hover:bg-slate-50 rounded transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <MessageSquare className="h-3.5 w-3.5 hover:text-[#1c9be8] cursor-pointer" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 italic text-xs mt-0.5 py-1">No company assigned</div>
            )}
          </div>
        );

      case "website":
        return (
          <div key="website">
            <div className="text-[11px] font-medium text-slate-400">Website</div>
            {website ? (
              <a
                href={website.startsWith("http") ? website : `https://${website}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#1c9be8] hover:underline font-medium text-xs flex items-center gap-1.5 mt-1"
              >
                <Globe className="h-3.5 w-3.5 text-slate-400" />
                <span className="truncate">{website}</span>
              </a>
            ) : (
              <div className="text-slate-400 italic text-xs mt-0.5">—</div>
            )}
          </div>
        );

      case "address":
        return (
          <div key="address">
            <div className="text-[11px] font-medium text-slate-400">Contact Address</div>
            {address ? (
              <div className="text-slate-700 font-medium text-xs flex items-center gap-1.5 mt-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span className="truncate">{address}</span>
              </div>
            ) : (
              <div className="text-slate-400 italic text-xs mt-0.5">—</div>
            )}
          </div>
        );

      case "linkedin":
        if (!linkedin) return null;
        return (
          <div key="linkedin">
            <div className="text-[11px] font-medium text-slate-400">Linkedin link</div>
            <a
              href={linkedin.startsWith("http") ? linkedin : `https://${linkedin}`}
              target="_blank"
              rel="noreferrer"
              className="text-[#1c9be8] hover:underline font-medium text-xs flex items-center gap-1.5 mt-1"
            >
              <ExternalLinkIcon className="h-3.5 w-3.5 text-slate-400" />
              <span className="truncate">{linkedin}</span>
            </a>
          </div>
        );

      case "details":
        if (!details) return null;
        return (
          <div key="details" className="pt-1">
            <div className="text-[11px] font-medium text-slate-400">Banking & Legal Requisites</div>
            <div className="mt-1 text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200 text-xs whitespace-pre-wrap">
              {details}
            </div>
          </div>
        );

      case "contact_type":
        return (
          <div key="contact_type">
            <div className="text-[11px] font-medium text-slate-400">Contact type</div>
            <div className="mt-1 font-semibold text-slate-800">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                {contactType}
              </span>
            </div>
          </div>
        );

      case "source":
        return (
          <div key="source">
            <div className="text-[11px] font-medium text-slate-400">Source</div>
            <div className="mt-1 text-slate-700 font-medium">{source}</div>
          </div>
        );

      case "available_to_everyone":
        return (
          <div key="available_to_everyone">
            <div className="text-[11px] font-medium text-slate-400">Available to everyone</div>
            <div className="mt-1 text-slate-700 font-medium">
              {availableToEveryone ? "Yes" : "No"}
            </div>
          </div>
        );

      case "included_in_export":
        return (
          <div key="included_in_export">
            <div className="text-[11px] font-medium text-slate-400">Included in export</div>
            <div className="mt-1 text-slate-700 font-medium">
              {includedInExport ? "Yes" : "No"}
            </div>
          </div>
        );

      case "comment":
        if (!comment) return null;
        return (
          <div key="comment" className="col-span-2 pt-2 border-t border-slate-100">
            <div className="text-[11px] font-medium text-slate-400">Comment / Notes</div>
            <div className="mt-1 text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200 whitespace-pre-wrap">
              {comment}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!open) return null;

  return (
    <>
      <CrmSidePanel
      open={open}
      onClose={onClose}
      title={fullName}
      subtitleBadge={`${contactType || "Clients"} • ${stage || "Not Contacted"}`}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      isCreateMode={isCreateMode}
      phone={phone}
      email={email}
      createdAt={contact?.created_at}
      entityType="contact"
      entityId={contact?.id}
      entityName={fullName}
      associatedContacts={contact ? [contact] : []}
      associatedCompany={associatedCompany as any}
      stickyActionBar={
        isInEditState ? (
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-slate-400">
              {errors.form && <span className="text-red-500 font-medium">{errors.form}</span>}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors uppercase tracking-wider cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting}
                className="px-6 py-2 rounded bg-[#80c200] hover:bg-[#72ad00] text-white text-xs font-bold uppercase tracking-wider shadow-md transition-colors flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? "SAVING..." : "SAVE"}
              </button>
            </div>
          </div>
        ) : undefined
      }
      rightColumnContent={
        <div className="flex flex-col h-full">
          {/* Activities Header */}
          <div className="border-b border-slate-200 px-4 py-3 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#00AEEF]" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Activities
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Timeline & Tasks
            </span>
          </div>

          {/* Chronological Activity Stream */}
          <div className="flex-1 p-4 overflow-y-auto">
            {contact?.id ? (
              <RecordActivityTasks contactId={contact.id} defaultTab="activities" />
            ) : (
              <RecordActivityTasks
                contactId={null}
                defaultTab="activities"
                isCreateMode={true}
                stagedActivities={stagedActivities}
                stagedTasks={stagedTasks}
                onStageActivity={(act) => setStagedActivities((prev) => [act, ...prev])}
                onStageTask={(tsk) => setStagedTasks((prev) => [tsk, ...prev])}
                onRemoveStagedActivity={(id) => setStagedActivities((prev) => prev.filter((a) => a.id !== id))}
                onRemoveStagedTask={(id) => setStagedTasks((prev) => prev.filter((t) => t.id !== id))}
              />
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Render Each Form Section Dynamically */}
        {sections.map((sec, secIdx) => {
          const isEditingThisSection = editingSection === sec.id || editingSection === "all";
          const visibleFieldKeys = sec.fieldKeys.filter((key) => {
            const cfg = formConfig.find((f) => f.key === key);
            return cfg ? cfg.enabled !== false : true;
          });

          // Calculate available fields that can be added into this section
          const currentSecKeys = new Set(sec.fieldKeys);
          const allKnownFieldMap = new Map<string, FormFieldConfig>();
          DEFAULT_CONTACT_FIELDS.forEach((f) => allKnownFieldMap.set(f.key, f));
          formConfig.forEach((f) => allKnownFieldMap.set(f.key, f));
          const availableFieldsForSec = Array.from(allKnownFieldMap.values()).filter(
            (f) => !currentSecKeys.has(f.key)
          );

          return (
            <div
              key={sec.id}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xs transition-all overflow-visible"
            >
              {/* Section Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
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

                    {sections.length > 1 && (
                      <div className="flex items-center gap-0.5 ml-1">
                        <button
                          type="button"
                          onClick={() => handleMoveSection(secIdx, "up")}
                          disabled={secIdx === 0}
                          className="p-1 rounded text-slate-300 hover:text-slate-600 disabled:opacity-20 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Move section up"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveSection(secIdx, "down")}
                          disabled={secIdx === sections.length - 1}
                          className="p-1 rounded text-slate-300 hover:text-slate-600 disabled:opacity-20 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Move section down"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  {!isCreateMode && !isEditingThisSection && (
                    <button
                      type="button"
                      onClick={() => setEditingSection(sec.id)}
                      className="text-xs font-semibold text-[#1c9be8] hover:text-[#1587cd] flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>edit</span>
                    </button>
                  )}

                  {!isCreateMode && isEditingThisSection && editingSection !== "all" && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="text-xs font-normal text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      cancel
                    </button>
                  )}
                </div>
              </div>

              {/* View Mode */}
              {!isEditingThisSection ? (
                <div className="space-y-4 text-xs">
                  {visibleFieldKeys.length === 0 ? (
                    <div className="text-slate-400 italic text-xs py-2">
                      No fields configured in this section. Click &apos;Select field&apos; or &apos;Create field&apos; below.
                    </div>
                  ) : (
                    visibleFieldKeys.map((k) => {
                      const cfg = formConfig.find((f) => f.key === k);
                      return renderFieldView(k, cfg);
                    })
                  )}

                  {/* Bitrix24 View Mode Section Footer: Select field ⌵ | Create field | Delete section */}
                  <FormBuilderActions
                    availableFields={availableFieldsForSec}
                    onAddField={(key) => {
                      setEditingSection(sec.id);
                      handleAddFieldToSection(sec.id, key);
                    }}
                    onCreateCustomField={(newField) => {
                      setEditingSection(sec.id);
                      handleCreateCustomField(sec.id, newField);
                    }}
                    onDeleteSection={() => handleDeleteSection(sec.id)}
                    isViewMode={true}
                    onEnterEditMode={() => setEditingSection(sec.id)}
                    entityName="Contact"
                  />
                </div>
              ) : (
                /* Edit Mode: Configurable Fields with Gear + FormBuilderActions */
                <div className="space-y-4">
                  {visibleFieldKeys.map((k) => {
                    const cfg = formConfig.find((f) => f.key === k);
                    return renderFieldInput(k, cfg);
                  })}

                  {/* Section Bottom Inline Form Builder Actions (Select field + Create field + Delete section) */}
                  <FormBuilderActions
                    availableFields={availableFieldsForSec}
                    onAddField={(key) => handleAddFieldToSection(sec.id, key)}
                    onCreateCustomField={(newField) =>
                      handleCreateCustomField(sec.id, newField)
                    }
                    onDeleteSection={() => handleDeleteSection(sec.id)}
                    isViewMode={false}
                    entityName="Contact"
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Bitrix24 Signature: "+ Add section" Control */}
        <div className="pt-2">
          {showAddSectionInput ? (
            <div className="rounded-lg border-2 border-dashed border-[#1c9be8]/40 bg-blue-50/30 p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FolderPlus className="h-4 w-4 text-[#1c9be8]" />
                  <span>New Form Section</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddSectionInput(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="e.g. Banking Requisites, Additional Information..."
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
                  className="px-4 py-1.5 rounded bg-[#1c9be8] hover:bg-[#1688cf] text-white text-xs font-semibold shadow-2xs"
                >
                  Add Section
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddSectionInput(true)}
              className="w-full py-2.5 rounded-lg border-2 border-dashed border-slate-300 hover:border-[#1c9be8] text-slate-500 hover:text-[#1c9be8] text-xs font-semibold flex items-center justify-center gap-2 transition-all bg-white hover:bg-blue-50/20 shadow-2xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add section</span>
            </button>
          )}
        </div>
      </div>
    </CrmSidePanel>

    {/* Quick-Add Company Modal */}
    {isCompanyModalOpen && (
      <CompanyForm
        open={isCompanyModalOpen}
        onOpenChange={setIsCompanyModalOpen}
        onSuccess={(newCompany) => {
          setCompaniesList((prev) => [newCompany, ...prev.filter((c) => c.id !== newCompany.id)]);
          setCompanyId(newCompany.id);
          setIsCompanyModalOpen(false);
        }}
      />
    )}
  </>
  );
}

function ExternalLinkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}
