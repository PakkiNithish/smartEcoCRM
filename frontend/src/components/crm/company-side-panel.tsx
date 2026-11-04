"use client";

import React, { useState, useEffect } from "react";
import { CrmSidePanel } from "@/components/crm/crm-side-panel";
import { Company, User, FormFieldConfig, Contact } from "@/types/crm";
import { api } from "@/lib/api-client";
import { RecordActivityTasks } from "@/components/crm/record-activity-tasks";
import { FormFieldWrapper, FormFieldUpdates } from "@/components/crm/form-field-wrapper";
import { FormBuilderActions } from "@/components/crm/form-builder-actions";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DEFAULT_COMPANY_FIELDS, COMPANY_STAGES } from "@/lib/form-defaults";
import { extractDomain } from "@/lib/utils";
import { ContactForm } from "@/components/crm/contact-form";
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
  DollarSign,
  Users,
  MessageSquare,
  Sparkles,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  FolderPlus,
  X,
  FileText,
  Tag,
  ExternalLink,
  Clock,
} from "lucide-react";

interface CompanySidePanelProps {
  company: Company | null;
  open: boolean;
  onClose: () => void;
  isCreateMode?: boolean;
  currentUser?: User | null;
  onSaved: (company: Company) => void;
}

interface FormSection {
  id: string;
  title: string;
  fieldKeys: string[];
  isCustom?: boolean;
}

const DEFAULT_COMPANY_SECTIONS: FormSection[] = [
  {
    id: "about",
    title: "ABOUT COMPANY",
    fieldKeys: [
      "name",
      "stage",
      "company_type",
      "industry",
      "annual_revenue",
      "phone",
      "email",
      "website",
      "messenger",
      "address",
      "details",
      "contact",
      "linkedin",
      "tags",
    ],
  },
  {
    id: "more",
    title: "MORE",
    fieldKeys: [
      "employees_count",
      "available_to_everyone",
      "included_in_export",
      "responsible",
      "comment",
    ],
  },
];

function ensureCompanySectionsHaveStage(secs: FormSection[]): FormSection[] {
  const hasStage = secs.some((s) => s.fieldKeys.includes("stage"));
  if (!hasStage && secs.length > 0) {
    return secs.map((s, idx) => {
      if (idx === 0 || s.id === "about") {
        const newKeys = [...s.fieldKeys];
        const nameIdx = newKeys.indexOf("name");
        if (nameIdx !== -1) {
          newKeys.splice(nameIdx + 1, 0, "stage");
        } else {
          newKeys.unshift("stage");
        }
        return { ...s, fieldKeys: newKeys };
      }
      return s;
    });
  }
  return secs;
}

export function CompanySidePanel({
  company,
  open,
  onClose,
  isCreateMode = false,
  currentUser,
  onSaved,
}: CompanySidePanelProps) {
  // Section Edit State: "none" | section.id | "all"
  const [editingSection, setEditingSection] = useState<string>(
    isCreateMode ? "all" : "none"
  );

  // Form Configuration State
  const [formConfig, setFormConfig] = useState<FormFieldConfig[]>(DEFAULT_COMPANY_FIELDS);
  const [sections, setSections] = useState<FormSection[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const rawSec = localStorage.getItem("crm_company_sections");
        if (rawSec) {
          const parsed = JSON.parse(rawSec);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return ensureCompanySectionsHaveStage(parsed);
          }
        }
      } catch {}
    }
    return ensureCompanySectionsHaveStage(DEFAULT_COMPANY_SECTIONS);
  });
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [showAddSectionInput, setShowAddSectionInput] = useState(false);
  const [editingTitleSecId, setEditingTitleSecId] = useState<string | null>(null);
  const [tempSectionTitle, setTempSectionTitle] = useState("");

  // Standard Form Fields State
  const [name, setName] = useState("");
  const [stage, setStage] = useState<string>("Not Contacted");
  const [companyType, setCompanyType] = useState("Client");
  const [industry, setIndustry] = useState("Information Technology");
  const [annualRevenue, setAnnualRevenue] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [phone, setPhone] = useState("");
  const [phoneType, setPhoneType] = useState("Work Phone");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [employeesCount, setEmployeesCount] = useState("");
  const [availableToEveryone, setAvailableToEveryone] = useState(true);
  const [includedInExport, setIncludedInExport] = useState(true);
  const [comment, setComment] = useState("");
  const [details, setDetails] = useState("");
  const [messenger, setMessenger] = useState("");
  const [tags, setTags] = useState("");
  const [linkedin, setLinkedin] = useState("");

  // Dynamic Custom Fields State
  const [customFields, setCustomFields] = useState<Record<string, any>>({});

  // Associated Contacts & All Workspace Contacts
  const [associatedContacts, setAssociatedContacts] = useState<Contact[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);

  // Quick-Add Contact Modal State
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [showQuickAddContact, setShowQuickAddContact] = useState(false);

  // Staged activities and tasks when in create mode
  const [stagedActivities, setStagedActivities] = useState<any[]>([]);
  const [stagedTasks, setStagedTasks] = useState<any[]>([]);
  const [quickFirstName, setQuickFirstName] = useState("");
  const [quickLastName, setQuickLastName] = useState("");
  const [quickEmail, setQuickEmail] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [quickJobTitle, setQuickJobTitle] = useState("");
  const [isQuickAddingContact, setIsQuickAddingContact] = useState(false);
  const [quickAddError, setQuickAddError] = useState<string | null>(null);

  // View mode Add Contacts states
  const [isAddingContactInView, setIsAddingContactInView] = useState(false);
  const [addContactMode, setAddContactMode] = useState<"link" | "new">("link");
  const [selectedContactToLink, setSelectedContactToLink] = useState("");
  const [isLinkingContact, setIsLinkingContact] = useState(false);
  const [newContactFirstName, setNewContactFirstName] = useState("");
  const [newContactLastName, setNewContactLastName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactJobTitle, setNewContactJobTitle] = useState("");
  const [isCreatingContact, setIsCreatingContact] = useState(false);
  const [addContactError, setAddContactError] = useState<string | null>(null);
  const [addContactSuccess, setAddContactSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      // Load all workspace contacts so they appear in the contacts selector
      api
        .getContacts({ limit: 100 })
        .then((res) => {
          setAllContacts(res.items || []);
        })
        .catch(() => {});

      if (company?.id) {
        if (company?.contacts && company.contacts.length > 0) {
          setAssociatedContacts(company.contacts as any);
          setSelectedContactIds(company.contacts.map((c: any) => c.id));
        }
        api
          .getContacts({ company_id: company.id, limit: 50 })
          .then((res) => {
            const list = res.items || [];
            setAssociatedContacts(list);
            setSelectedContactIds(list.map((c) => c.id));
          })
          .catch(() => {});
      } else {
        setAssociatedContacts([]);
        setSelectedContactIds([]);
      }

      setShowQuickAddContact(false);
      setQuickFirstName("");
      setQuickLastName("");
      setQuickEmail("");
      setQuickPhone("");
      setQuickJobTitle("");
      setQuickAddError(null);

      setIsAddingContactInView(false);
      setSelectedContactToLink("");
      setNewContactFirstName("");
      setNewContactLastName("");
      setNewContactEmail("");
      setNewContactPhone("");
      setNewContactJobTitle("");
      setAddContactError(null);
      setAddContactSuccess(null);
      setStagedActivities([]);
      setStagedTasks([]);
    }
  }, [company?.id, open]);

  const handleLinkExistingContact = async () => {
    if (!selectedContactToLink || !company?.id) return;
    setIsLinkingContact(true);
    setAddContactError(null);
    try {
      const updated = await api.updateContact(selectedContactToLink, {
        company_id: company.id,
      });

      setAllContacts((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      setAssociatedContacts((prev) => {
        const exists = prev.some((c) => c.id === updated.id);
        return exists ? prev.map((c) => (c.id === updated.id ? updated : c)) : [...prev, updated];
      });
      setSelectedContactIds((prev) =>
        prev.includes(updated.id) ? prev : [...prev, updated.id]
      );
      setSelectedContactToLink("");
      setAddContactSuccess("Contact linked successfully.");
      setTimeout(() => setAddContactSuccess(null), 3000);

      api.getCompany(company.id).then(onSaved).catch(() => {});
    } catch (err: any) {
      setAddContactError(err.detail || err.message || "Failed to link contact.");
    } finally {
      setIsLinkingContact(false);
    }
  };

  const handleCreateAndLinkContact = async () => {
    if (!newContactFirstName.trim()) {
      setAddContactError("First name is required.");
      return;
    }
    setIsCreatingContact(true);
    setAddContactError(null);
    try {
      const created = await api.createContact({
        first_name: newContactFirstName.trim(),
        last_name: newContactLastName.trim() || undefined,
        email: newContactEmail.trim() || undefined,
        phone: newContactPhone.trim() || undefined,
        job_title: newContactJobTitle.trim() || undefined,
        company_id: company?.id || undefined,
      });

      setAllContacts((prev) => [created, ...prev]);
      setAssociatedContacts((prev) => [created, ...prev]);
      setSelectedContactIds((prev) => [...prev, created.id]);

      setNewContactFirstName("");
      setNewContactLastName("");
      setNewContactEmail("");
      setNewContactPhone("");
      setNewContactJobTitle("");
      setIsAddingContactInView(false);
      setAddContactSuccess(`Contact "${created.first_name} ${created.last_name || ""}" created and linked.`);
      setTimeout(() => setAddContactSuccess(null), 3000);

      if (company?.id) {
        api.getCompany(company.id).then(onSaved).catch(() => {});
      }
    } catch (err: any) {
      setAddContactError(err.detail || err.message || "Failed to create contact.");
    } finally {
      setIsCreatingContact(false);
    }
  };

  const handleUnlinkContact = async (contactId: string) => {
    try {
      await api.updateContact(contactId, { company_id: null });
      setAssociatedContacts((prev) => prev.filter((c) => c.id !== contactId));
      setSelectedContactIds((prev) => prev.filter((id) => id !== contactId));
      if (company?.id) {
        api.getCompany(company.id).then(onSaved).catch(() => {});
      }
    } catch (err: any) {
      console.error("Failed to unlink contact:", err);
    }
  };

  const handleQuickAddContact = async () => {
    if (!quickFirstName.trim()) {
      setQuickAddError("First name is required.");
      return;
    }
    setIsQuickAddingContact(true);
    setQuickAddError(null);
    try {
      const created = await api.createContact({
        first_name: quickFirstName.trim(),
        last_name: quickLastName.trim() || undefined,
        email: quickEmail.trim() || undefined,
        phone: quickPhone.trim() || undefined,
        job_title: quickJobTitle.trim() || undefined,
        company_id: company?.id || undefined,
      });

      setAllContacts((prev) => [created, ...prev]);
      setAssociatedContacts((prev) => [created, ...prev]);
      setSelectedContactIds((prev) => [...prev, created.id]);
      setShowQuickAddContact(false);
      setQuickFirstName("");
      setQuickLastName("");
      setQuickEmail("");
      setQuickPhone("");
      setQuickJobTitle("");
    } catch (err: any) {
      setQuickAddError(err.detail || err.message || "Failed to create contact");
    } finally {
      setIsQuickAddingContact(false);
    }
  };

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
            const rawCfg = localStorage.getItem("crm_form_config_company");
            if (rawCfg) cachedConfig = JSON.parse(rawCfg);
            const rawSec = localStorage.getItem("crm_company_sections");
            if (rawSec) cachedSections = JSON.parse(rawSec);
          } catch {}
        }

        const res = await api.getFormConfig("company");
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
            const verifiedSecs = ensureCompanySectionsHaveStage(loadedSecs);
            setSections(verifiedSecs);
            try {
              localStorage.setItem("crm_company_sections", JSON.stringify(verifiedSecs));
            } catch {}
          } else if (cachedSections && Array.isArray(cachedSections) && cachedSections.length > 0) {
            const verifiedSecs = ensureCompanySectionsHaveStage(cachedSections);
            setSections(verifiedSecs);
            try {
              localStorage.setItem("crm_company_sections", JSON.stringify(verifiedSecs));
            } catch {}
          }

          const cleanFields = res.fields_config.filter(
            (f: any) => !f.key?.startsWith("__section__") && f.type !== "section"
          );
          DEFAULT_COMPANY_FIELDS.forEach((def) => {
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
            localStorage.setItem("crm_form_config_company", JSON.stringify(merged));
          } catch {}
        } else if (cachedConfig && Array.isArray(cachedConfig)) {
          const mergedCached = [...cachedConfig];
          DEFAULT_COMPANY_FIELDS.forEach((def) => {
            if (!mergedCached.some((f) => f.key === def.key)) {
              mergedCached.push(def);
            }
          });
          setFormConfig(mergedCached);
          if (cachedSections && Array.isArray(cachedSections) && cachedSections.length > 0) {
            const verifiedSecs = ensureCompanySectionsHaveStage(cachedSections);
            setSections(verifiedSecs);
          }
        }
      } catch (err) {
        console.error("Failed to load company form configuration:", err);
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
        localStorage.setItem("crm_form_config_company", JSON.stringify(updatedConfig));
        localStorage.setItem("crm_company_sections", JSON.stringify(updatedSecs));
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
      await api.updateFormConfig("company", [...cleanFields, ...sectionEntries]);
    } catch (err) {
      console.error("Failed to sync company form config to server:", err);
    }
  };

  // Sync Company data when company or open changes
  useEffect(() => {
    if (company && !isCreateMode) {
      setName(company.name || "");
      setStage(company.stage || "Not Contacted");
      setIndustry(company.industry || "Information Technology");
      setPhone(company.phone || "");
      setEmail(company.email || "");
      setWebsite(company.website || "");
      setAddress(company.address || "");

      const cf = company.custom_fields || {};
      setCompanyType(cf.company_type || "Client");
      setAnnualRevenue(cf.annual_revenue || "");
      setCurrency(cf.currency || "AED");
      setPhoneType(cf.phone_type || "Work Phone");
      setEmployeesCount(cf.employees_count || "");
      setAvailableToEveryone(cf.available_to_everyone ?? true);
      setIncludedInExport(cf.included_in_export ?? true);
      setComment(cf.comment || "");
      setDetails(cf.details || "");
      setMessenger(cf.messenger || "");
      setTags(cf.tags || "");
      setLinkedin(cf.linkedin || "");
      setCustomFields(cf);
      setEditingSection("none");
    } else if (isCreateMode) {
      setName("");
      setStage("Not Contacted");
      setCompanyType("Client");
      setIndustry("Information Technology");
      setAnnualRevenue("");
      setCurrency("AED");
      setPhone("");
      setPhoneType("Work Phone");
      setEmail("");
      setWebsite("");
      setAddress("");
      setEmployeesCount("");
      setAvailableToEveryone(true);
      setIncludedInExport(true);
      setComment("");
      setDetails("");
      setMessenger("");
      setTags("");
      setLinkedin("");
      setCustomFields({});
      setEditingSection("all");
    }
    setErrors({});
  }, [company, isCreateMode, open]);

  // Cancel Handler: Discards unsaved values without network requests
  const handleCancel = () => {
    if (isCreateMode) {
      onClose();
    } else if (company) {
      setName(company.name || "");
      setStage(company.stage || "Not Contacted");
      setIndustry(company.industry || "Information Technology");
      setPhone(company.phone || "");
      setEmail(company.email || "");
      setWebsite(company.website || "");
      setAddress(company.address || "");

      const cf = company.custom_fields || {};
      setCompanyType(cf.company_type || "Client");
      setAnnualRevenue(cf.annual_revenue || "");
      setCurrency(cf.currency || "AED");
      setPhoneType(cf.phone_type || "Work Phone");
      setEmployeesCount(cf.employees_count || "");
      setAvailableToEveryone(cf.available_to_everyone ?? true);
      setIncludedInExport(cf.included_in_export ?? true);
      setComment(cf.comment || "");
      setDetails(cf.details || "");
      setMessenger(cf.messenger || "");
      setTags(cf.tags || "");
      setLinkedin(cf.linkedin || "");
      setCustomFields(cf);
      setErrors({});
      setEditingSection("none");
    }
  };

  // Save Handler: Validates and persists
  const handleSave = async () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) {
      errs.name = "Company name is required.";
    }

    if (!website.trim()) {
      errs.website = "Website URL is required.";
    } else {
      const domain = extractDomain(website.trim());
      if (!domain || (!domain.includes(".") && domain !== "localhost")) {
        errs.website = "Please enter a valid website URL or domain (e.g. acme.com or https://www.acme.com)";
      }
    }

    // Check dynamic required custom fields
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
        ...(company?.custom_fields || {}),
        ...customFields,
        company_type: companyType,
        annual_revenue: annualRevenue,
        currency,
        phone_type: phoneType,
        employees_count: employeesCount,
        available_to_everyone: availableToEveryone,
        included_in_export: includedInExport,
        comment,
        details,
        messenger,
        tags,
        linkedin,
      };

      if (isCreateMode) {
        const payload = {
          name: name.trim(),
          stage: stage.trim() || "Not Contacted",
          industry: industry.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          website: website.trim() || undefined,
          address: address.trim() || undefined,
          custom_fields: mergedCustomFields,
        };
        const saved = await api.createCompany(payload as any);

        // Generate any activities logged while creating the company
        if (stagedActivities.length > 0) {
          await Promise.allSettled(
            stagedActivities.map((act) =>
              api.createActivity({
                type: act.type,
                subject: act.subject,
                notes: act.notes,
                scheduled_at: act.scheduled_at,
                is_completed: act.is_completed,
                company_id: saved.id,
                user_id: act.user_id,
                custom_fields: act.custom_fields,
              })
            )
          );
        }

        // Generate any tasks logged while creating the company
        if (stagedTasks.length > 0) {
          await Promise.allSettled(
            stagedTasks.map((tsk) =>
              api.createTask({
                title: tsk.title,
                description: tsk.description,
                status: tsk.status,
                priority: tsk.priority,
                due_date: tsk.due_date,
                company_id: saved.id,
                assigned_to_id: tsk.assigned_to_id,
                custom_fields: tsk.custom_fields,
              })
            )
          );
        }

        // Link any selected or quick-added contacts to this newly created company
        if (selectedContactIds.length > 0) {
          await Promise.allSettled(
            selectedContactIds.map((cid) =>
              api.updateContact(cid, { company_id: saved.id })
            )
          );
        }

        onSaved(saved);
        onClose();
      } else if (company) {
        const payload = {
          name: name.trim(),
          stage: stage.trim() || "Not Contacted",
          industry: industry.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          website: website.trim() || undefined,
          address: address.trim() || undefined,
          custom_fields: mergedCustomFields,
        };
        const updated = await api.updateCompany(company.id, payload as any);

        // Synchronize contact company associations
        const initialIds = new Set(associatedContacts.map((c) => c.id));
        const currentIds = new Set(selectedContactIds);

        const toAdd = selectedContactIds.filter((id) => !initialIds.has(id));
        const toRemove = associatedContacts
          .map((c) => c.id)
          .filter((id) => !currentIds.has(id));

        await Promise.allSettled([
          ...toAdd.map((cid) => api.updateContact(cid, { company_id: company.id })),
          ...toRemove.map((cid) => api.updateContact(cid, { company_id: null })),
        ]);

        onSaved(updated);
        setEditingSection("none");
      }
    } catch (err: any) {
      const msg = err.detail || err.message || "Failed to save company.";
      const newErrors: Record<string, string> = { form: msg };
      if (typeof msg === "string" && (msg.toLowerCase().includes("domain") || msg.toLowerCase().includes("website"))) {
        newErrors.website = msg;
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
      const defaultField = DEFAULT_COMPANY_FIELDS.find((f) => f.key === fieldKey);
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

  const displayName = isCreateMode
    ? "Add Company"
    : name || "Untitled Company";

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
      case "name":
        return (
          <FormFieldWrapper
            key="name"
            fieldKey="name"
            label={getFieldLabel("name", "Company name")}
            required={true}
            error={errors.name}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
            onUpdateField={handleUpdateField}
          >
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors({ ...errors, name: "" });
              }}
              placeholder={getFieldCfg("name")?.placeholder || "e.g., Acme Innovations Ltd."}
              className="h-8 w-full rounded border border-slate-300 px-2.5 text-xs text-slate-800 outline-none focus:border-[#1c9be8]"
            />
          </FormFieldWrapper>
        );

      case "stage":
        return (
          <FormFieldWrapper
            key="stage"
            fieldKey="stage"
            label={getFieldLabel("stage", "Stage")}
            options={getFieldOptions("stage", [...COMPANY_STAGES])}
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
                {getFieldOptions("stage", [...COMPANY_STAGES]).map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </FormFieldWrapper>
        );

      case "company_type":
        return (
          <FormFieldWrapper
            key="company_type"
            fieldKey="company_type"
            label={getFieldLabel("company_type", "Company type")}
            options={getFieldOptions("company_type", ["Client", "Partner", "Supplier", "Competitor", "Other"])}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
            onUpdateField={handleUpdateField}
          >
            <select
              value={companyType}
              onChange={(e) => setCompanyType(e.target.value)}
              className="h-8 w-full rounded border border-slate-300 px-2.5 text-xs text-slate-800 bg-white outline-none focus:border-[#1c9be8]"
            >
              {getFieldOptions("company_type", ["Client", "Partner", "Supplier", "Competitor", "Other"]).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </FormFieldWrapper>
        );

      case "industry":
        return (
          <FormFieldWrapper
            key="industry"
            fieldKey="industry"
            label={getFieldLabel("industry", "Industry")}
            options={getFieldOptions("industry", [
              "Information Technology",
              "Sustainability",
              "Manufacturing",
              "Real Estate & Offices",
              "Education",
              "Healthcare",
              "Financial Services",
              "Retail",
              "Other",
            ])}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
            onUpdateField={handleUpdateField}
          >
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="h-8 w-full rounded border border-slate-300 px-2.5 text-xs text-slate-800 bg-white outline-none focus:border-[#1c9be8]"
            >
              {getFieldOptions("industry", [
                "Information Technology",
                "Sustainability",
                "Manufacturing",
                "Real Estate & Offices",
                "Education",
                "Healthcare",
                "Financial Services",
                "Retail",
                "Other",
              ]).map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </FormFieldWrapper>
        );

      case "annual_revenue":
        return (
          <FormFieldWrapper
            key="annual_revenue"
            fieldKey="annual_revenue"
            label={getFieldLabel("annual_revenue", "Annual revenue")}
            options={getFieldOptions("currency", ["AED", "INR", "USD", "EUR", "GBP"])}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
            onUpdateField={handleUpdateField}
          >
            <div className="flex gap-2">
              <input
                type="number"
                value={annualRevenue}
                onChange={(e) => setAnnualRevenue(e.target.value)}
                placeholder="0.00"
                className="h-8 flex-1 rounded border border-slate-300 px-2.5 text-xs text-slate-800 outline-none focus:border-[#1c9be8]"
              />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-8 w-24 rounded border border-slate-300 px-2 text-xs text-slate-700 bg-white outline-none focus:border-[#1c9be8]"
              >
                {getFieldOptions("currency", ["AED", "INR", "USD", "EUR", "GBP"]).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </FormFieldWrapper>
        );

      case "phone":
        return (
          <FormFieldWrapper
            key="phone"
            fieldKey="phone"
            label={getFieldLabel("phone", "Phone")}
            options={getFieldOptions("phone_type", ["Work Phone", "Mobile Phone", "Other"])}
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
                placeholder={getFieldCfg("phone")?.placeholder || "+1 800-555-0100"}
                className="h-8 flex-1 rounded border border-slate-300 px-2.5 text-xs text-slate-800 outline-none focus:border-[#1c9be8]"
              />
              <select
                value={phoneType}
                onChange={(e) => setPhoneType(e.target.value)}
                className="h-8 w-32 rounded border border-slate-300 px-2 text-xs text-slate-700 bg-white outline-none focus:border-[#1c9be8]"
              >
                {getFieldOptions("phone_type", ["Work Phone", "Mobile Phone", "Other"]).map((t) => (
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
              placeholder={getFieldCfg("email")?.placeholder || "contact@company.com"}
              className="h-8 w-full rounded border border-slate-300 px-2.5 text-xs text-slate-800 outline-none focus:border-[#1c9be8]"
            />
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
              placeholder={getFieldCfg("website")?.placeholder || "https://company.com"}
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
              placeholder={getFieldCfg("messenger")?.placeholder || "Corporate handle / Skype ID"}
              className="h-8 w-full rounded border border-slate-300 px-2.5 text-xs text-slate-800 outline-none focus:border-[#1c9be8]"
            />
          </FormFieldWrapper>
        );

      case "address":
        return (
          <FormFieldWrapper
            key="address"
            fieldKey="address"
            label={getFieldLabel("address", "Office Address")}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
            onUpdateField={handleUpdateField}
          >
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={getFieldCfg("address")?.placeholder || "Street, City, State, Country"}
              className="w-full rounded border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-[#1c9be8]"
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
              placeholder={getFieldCfg("details")?.placeholder || "Tax ID, Bank requisites, legal registrations..."}
              className="w-full rounded border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-[#1c9be8]"
            />
          </FormFieldWrapper>
        );

      case "contact":
        const selectedContactsList = allContacts.filter((c) => selectedContactIds.includes(c.id));
        const unselectedContacts = allContacts.filter(
          (c) =>
            (!c.company_id || (company?.id && c.company_id === company.id)) &&
            !selectedContactIds.includes(c.id)
        );

        return (
          <FormFieldWrapper
            key="contact"
            fieldKey="contact"
            label={getFieldLabel("contact", "Company contacts")}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
            onUpdateField={handleUpdateField}
          >
            <div className="space-y-2">
              {/* Selected Contacts Badges */}
              {selectedContactsList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {selectedContactsList.map((ct) => (
                    <div
                      key={ct.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 border border-sky-200 text-sky-800 rounded-md text-xs font-medium shadow-2xs"
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
                        title="Remove contact"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Selector and Quick Add Button */}
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
                        : "Search & choose contact to link..."
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
                  className="h-8 px-2.5 text-xs text-[#00AEEF] bg-[#00AEEF]/5 hover:bg-[#00AEEF]/10 border border-[#00AEEF]/30 rounded shrink-0 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Quick Add
                </button>
              </div>
            </div>
          </FormFieldWrapper>
        );

      case "linkedin":
        return (
          <FormFieldWrapper
            key="linkedin"
            fieldKey="linkedin"
            label={getFieldLabel("linkedin", "Company Linkedin link")}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
            onUpdateField={handleUpdateField}
          >
            <input
              type="text"
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              placeholder={getFieldCfg("linkedin")?.placeholder || "https://linkedin.com/company/organization"}
              className="h-8 w-full rounded border border-slate-300 px-2.5 text-xs text-slate-800 outline-none focus:border-[#1c9be8]"
            />
          </FormFieldWrapper>
        );

      case "tags":
        return (
          <FormFieldWrapper
            key="tags"
            fieldKey="tags"
            label={getFieldLabel("tags", "Tags")}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
            onUpdateField={handleUpdateField}
          >
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder={getFieldCfg("tags")?.placeholder || "Keywords, enterprise, supplier..."}
              className="h-8 w-full rounded border border-slate-300 px-2.5 text-xs text-slate-800 outline-none focus:border-[#1c9be8]"
            />
          </FormFieldWrapper>
        );

      case "employees_count":
        return (
          <FormFieldWrapper
            key="employees_count"
            fieldKey="employees_count"
            label={getFieldLabel("employees_count", "Employees count")}
            options={getFieldOptions("employees_count", ["Not selected", "less than 50", "50-250", "250-1000", "over 1000"])}
            onToggleRequired={handleToggleRequired}
            onRemoveField={handleRemoveField}
            onDeleteField={handleDeleteField}
            onUpdateField={handleUpdateField}
          >
            <select
              value={employeesCount}
              onChange={(e) => setEmployeesCount(e.target.value)}
              className="h-8 w-full rounded border border-slate-300 px-2.5 text-xs text-slate-800 bg-white outline-none focus:border-[#1c9be8]"
            >
              {getFieldOptions("employees_count", ["Not selected", "less than 50", "50-250", "250-1000", "over 1000"]).map((ec) => (
                <option key={ec} value={ec}>
                  {ec}
                </option>
              ))}
            </select>
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
              placeholder={getFieldCfg("comment")?.placeholder || "Add internal notes or corporate remarks..."}
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
      case "name":
        return (
          <div key="name" className="flex items-start justify-between">
            <div>
              <div className="text-base font-bold text-slate-900 tracking-tight">{displayName}</div>
              {industry && (
                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 font-medium">
                  <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                  <span>{industry}</span>
                </div>
              )}
            </div>
          </div>
        );

      case "company_type":
        return (
          <div key="company_type">
            <div className="text-[11px] font-medium text-slate-400">Company type</div>
            <div className="mt-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                {companyType}
              </span>
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
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : stage === "Responded"
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
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

      case "annual_revenue":
        return (
          <div key="annual_revenue">
            <div className="text-[11px] font-medium text-slate-400">Annual revenue</div>
            <div className="mt-1 font-semibold text-slate-800 flex items-center gap-1">
              <span>{currency === "INR" ? "Rs." : currency}</span>
              <span>{annualRevenue ? Number(annualRevenue).toLocaleString() : "0"}</span>
            </div>
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
                  Corporate
                </span>
              </div>
            ) : (
              <div className="text-slate-400 italic text-xs mt-0.5">Not provided</div>
            )}
          </div>
        );

      case "website":
        return (
          <div key="website">
            <div className="text-[11px] font-medium text-slate-400">Website</div>
            {website ? (
              <div className="mt-1 flex items-center gap-2">
                <a
                  href={website.startsWith("http") ? website : `https://${website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#1c9be8] hover:underline font-medium text-xs flex items-center gap-1.5"
                >
                  <Globe className="h-3.5 w-3.5 text-slate-400" />
                  <span className="truncate">{website}</span>
                </a>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                  Corporate
                </span>
              </div>
            ) : (
              <div className="text-slate-400 italic text-xs mt-0.5">—</div>
            )}
          </div>
        );

      case "address":
        return (
          <div key="address">
            <div className="text-[11px] font-medium text-slate-400">Office Address</div>
            {address ? (
              <div className="text-slate-700 font-medium text-xs flex items-center gap-1.5 mt-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span>{address}</span>
              </div>
            ) : (
              <div className="text-slate-400 italic text-xs mt-0.5">—</div>
            )}
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

      case "contact":
      case "contact_id":
      case "contacts":
        const activeContacts = allContacts.filter((c) => selectedContactIds.includes(c.id));
        const displayContacts = activeContacts.length > 0 ? activeContacts : associatedContacts;
        const unlinkedContacts = allContacts.filter(
          (c) =>
            !c.company_id &&
            !selectedContactIds.includes(c.id) &&
            !associatedContacts.some((ac) => ac.id === c.id)
        );

        return (
          <div key="contact" className="pt-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Company contacts ({displayContacts.length})
              </span>
            </div>

            {addContactSuccess && (
              <div className="mb-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-md flex items-center justify-between animate-in fade-in">
                <span>{addContactSuccess}</span>
                <button
                  type="button"
                  onClick={() => setAddContactSuccess(null)}
                  className="text-emerald-500 hover:text-emerald-700 font-bold ml-1"
                >
                  ✕
                </button>
              </div>
            )}

            {displayContacts.length > 0 ? (
              <div className="space-y-2">
                {displayContacts.map((ct) => (
                  <div
                    key={ct.id}
                    className="p-3 rounded-lg border border-slate-200 bg-white shadow-2xs hover:border-[#1c9be8]/40 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 pr-2">
                        <a
                          href={`/contacts?id=${ct.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-slate-800 hover:text-[#1c9be8] cursor-pointer inline-flex items-center gap-1.5 group"
                          title="Open contact details in new tab"
                        >
                          <span className="truncate">
                            {ct.first_name} {ct.last_name}
                          </span>
                          <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-[#1c9be8] shrink-0" />
                        </a>
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {ct.job_title || "Primary Contact"}
                        </div>
                        {ct.email && (
                          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                            {ct.email}
                          </div>
                        )}
                        {ct.custom_fields?.address && (
                          <div className="text-[11px] text-[#1c9be8] hover:underline cursor-pointer mt-1">
                            Show address
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 shrink-0">
                        {ct.phone && (
                          <a href={`tel:${ct.phone}`} title={ct.phone}>
                            <Phone className="h-3.5 w-3.5 hover:text-[#1c9be8] cursor-pointer" />
                          </a>
                        )}
                        {ct.email && (
                          <a href={`mailto:${ct.email}`} title={ct.email}>
                            <Mail className="h-3.5 w-3.5 hover:text-[#1c9be8] cursor-pointer" />
                          </a>
                        )}
                        <a
                          href={`/contacts?id=${ct.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open contact details in new tab"
                          className="p-1 text-slate-400 hover:text-[#1c9be8] hover:bg-slate-50 rounded transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleUnlinkContact(ct.id)}
                          className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Unlink contact from company"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-slate-400 italic text-xs mt-0.5 py-1">No contacts linked</div>
            )}

            {/* "Add Contacts" Button just below the company contacts field */}
            <div className="mt-2.5">
              {!isAddingContactInView ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingContactInView(true);
                    setAddContactError(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#00AEEF] hover:text-white bg-[#00AEEF]/10 hover:bg-[#00AEEF] border border-[#00AEEF]/30 hover:border-[#00AEEF] rounded-md transition-all shadow-2xs group cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 transition-transform group-hover:rotate-90" />
                  <span>Add Contacts</span>
                </button>
              ) : (
                <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-3.5 space-y-3 shadow-xs animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-sky-200/60">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-[#00AEEF]" /> Add Contact
                      </span>
                      <div className="flex rounded-md bg-white p-0.5 border border-sky-200 text-[11px]">
                        <button
                          type="button"
                          onClick={() => {
                            setAddContactMode("link");
                            setAddContactError(null);
                          }}
                          className={`px-2 py-0.5 rounded font-medium transition-colors ${
                            addContactMode === "link"
                              ? "bg-[#00AEEF] text-white shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Link Existing
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingContactInView(false);
                            setIsContactModalOpen(true);
                          }}
                          className="px-2 py-0.5 rounded font-medium transition-colors text-slate-600 hover:text-slate-900 hover:bg-white"
                          title="Open full contact creation popup"
                        >
                          Create New
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingContactInView(false);
                        setAddContactError(null);
                      }}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded"
                      title="Close"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {addContactError && (
                    <div className="text-[11px] text-red-600 bg-red-50 p-2 rounded border border-red-200">
                      {addContactError}
                    </div>
                  )}

                  {addContactMode === "link" ? (
                    <div className="space-y-2">
                      <SearchableSelect
                        options={unlinkedContacts.map((ct) => ({
                          value: ct.id,
                          label: `${ct.first_name} ${ct.last_name}`.trim() || ct.full_name || "Untitled",
                          sublabel: [ct.job_title, ct.email].filter(Boolean).join(" • "),
                          icon: UserIcon,
                        }))}
                        value={selectedContactToLink}
                        onChange={(val) => setSelectedContactToLink(val)}
                        placeholder={
                          unlinkedContacts.length === 0
                            ? "All available contacts are already linked"
                            : "Search & choose contact to associate..."
                        }
                        searchPlaceholder="Search contacts by name, email..."
                        emptyText="No contacts match search"
                        icon={UserIcon}
                        disabled={unlinkedContacts.length === 0}
                      />
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsAddingContactInView(false)}
                          className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200/50 rounded transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleLinkExistingContact}
                          disabled={isLinkingContact || !selectedContactToLink}
                          className="rounded bg-[#00AEEF] px-3 py-1 text-xs font-semibold text-white hover:bg-[#0092c8] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {isLinkingContact && <span className="animate-spin">◌</span>}
                          Link Contact
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5 py-1">
                      <p className="text-xs text-slate-600">
                        Create a new contact with all configurable fields and automatically link to {company?.name || "this company"}.
                      </p>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsAddingContactInView(false)}
                          className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200/50 rounded transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingContactInView(false);
                            setIsContactModalOpen(true);
                          }}
                          className="rounded bg-[#00AEEF] px-3 py-1 text-xs font-semibold text-white hover:bg-[#0092c8] transition-colors flex items-center gap-1.5"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Open Contact Form
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case "linkedin":
        if (!linkedin) return null;
        return (
          <div key="linkedin">
            <div className="text-[11px] font-medium text-slate-400">Company Linkedin link</div>
            <a
              href={linkedin.startsWith("http") ? linkedin : `https://${linkedin}`}
              target="_blank"
              rel="noreferrer"
              className="text-[#1c9be8] hover:underline font-medium text-xs flex items-center gap-1.5 mt-1"
            >
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              <span className="truncate">{linkedin}</span>
            </a>
          </div>
        );

      case "tags":
        if (!tags) return null;
        return (
          <div key="tags">
            <div className="text-[11px] font-medium text-slate-400">Tags</div>
            <div className="mt-1 flex items-center gap-1 text-slate-700">
              <Tag className="h-3 w-3 text-slate-400" />
              <span>{tags}</span>
            </div>
          </div>
        );

      case "employees_count":
        if (!employeesCount) return null;
        return (
          <div key="employees_count">
            <div className="text-[11px] font-medium text-slate-400">Employees</div>
            <div className="mt-1 text-slate-700 font-medium">{employeesCount}</div>
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
      title={displayName}
      subtitleBadge={`${companyType || "Client"} • ${stage || "Not Contacted"}`}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      isCreateMode={isCreateMode}
      phone={phone}
      email={email}
      createdAt={company?.created_at}
      entityType="company"
      entityId={company?.id}
      entityName={displayName}
      associatedContacts={associatedContacts}
      associatedCompany={company}
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
            {company?.id ? (
              <RecordActivityTasks companyId={company.id} defaultTab="activities" />
            ) : (
              <RecordActivityTasks
                companyId={null}
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
          DEFAULT_COMPANY_FIELDS.forEach((f) => allKnownFieldMap.set(f.key, f));
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
                    entityName="Company"
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
                    entityName="Company"
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

    {/* Quick-Add Contact Modal */}
    {isContactModalOpen && (
      <ContactForm
        open={isContactModalOpen}
        onOpenChange={setIsContactModalOpen}
        defaultCompanyId={company?.id}
        onSuccess={async (newContact) => {
          if (company?.id && newContact.company_id !== company.id) {
            try {
              await api.updateContact(newContact.id, { company_id: company.id });
              newContact.company_id = company.id;
            } catch (err) {
              console.error("Failed to associate contact with company:", err);
            }
          }
          setAllContacts((prev) => [newContact, ...prev.filter((c) => c.id !== newContact.id)]);
          setAssociatedContacts((prev) => [newContact, ...prev.filter((c) => c.id !== newContact.id)]);
          setSelectedContactIds((prev) => [...prev.filter((id) => id !== newContact.id), newContact.id]);
          setIsContactModalOpen(false);
          setIsAddingContactInView(false);
          setAddContactSuccess(`Contact ${newContact.first_name} ${newContact.last_name || ""}`.trim() + " created and linked successfully.");
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
