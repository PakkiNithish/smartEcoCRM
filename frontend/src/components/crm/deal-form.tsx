"use client";

import React, { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Company,
  Contact,
  Deal,
  DealCreateInput,
  FormFieldConfig,
  PipelineStage,
  User,
} from "@/types/crm";
import { api } from "@/lib/api-client";
import {
  AlertCircle,
  Loader2,
  Plus,
  Pencil,
  ChevronDown,
  X,
  User as UserIcon,
  Building2,
} from "lucide-react";
import { FormFieldWrapper } from "./form-field-wrapper";
import { FormBuilderActions } from "./form-builder-actions";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DEFAULT_DEAL_FIELDS } from "@/lib/form-defaults";
import { ContactForm } from "./contact-form";
import { CompanyForm } from "./company-form";

interface DealFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: PipelineStage[];
  initialDeal?: Deal | null;
  defaultCompanyId?: string | null;
  defaultContactId?: string | null;
  onSuccess: (deal: Deal) => void;
}

export function DealForm({
  open,
  onOpenChange,
  stages,
  initialDeal,
  defaultCompanyId,
  defaultContactId,
  onSuccess,
}: DealFormProps) {
  const isEditMode = Boolean(initialDeal);

  // Form Fields
  const [title, setTitle] = useState("");
  const [stageId, setStageId] = useState("");
  const [amount, setAmount] = useState("0.00");
  const [currency, setCurrency] = useState("INR");
  const [contactId, setContactId] = useState("");
  const [contactNameInput, setContactNameInput] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [companyNameInput, setCompanyNameInput] = useState("");
  const [responsibleUserId, setResponsibleUserId] = useState("");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [description, setDescription] = useState("");
  const [formConfig, setFormConfig] = useState<FormFieldConfig[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("crm_form_config_deal");
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return DEFAULT_DEAL_FIELDS;
  });
  const [customFields, setCustomFields] = useState<Record<string, any>>({});

  // Real Lookup Lists
  const [stagesList, setStagesList] = useState<PipelineStage[]>(stages || []);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [lookupsLoading, setLookupsLoading] = useState(false);

  // Sync stagesList when stages prop updates
  useEffect(() => {
    if (stages && stages.length > 0) {
      setStagesList(stages);
      if (!stageId && !initialDeal) {
        setStageId(stages[0].id);
      }
    }
  }, [stages, stageId, initialDeal]);

  // Quick-Add Modal States
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);

  // Validation & Submission States
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Reset or Populate Form
  useEffect(() => {
    if (open) {
      setErrors({});
      setApiError(null);

      const defaultStageId = stages[0]?.id || stagesList[0]?.id || "";

      if (initialDeal) {
        setTitle(initialDeal.title || "");
        setStageId(initialDeal.stage_id || defaultStageId);
        setAmount(String(initialDeal.amount || "0.00"));
        setCurrency(initialDeal.currency || "INR");
        setContactId(initialDeal.contact_id || "");
        setContactNameInput(
          (initialDeal as any).contact?.full_name ||
          ((initialDeal as any).contact
            ? `${(initialDeal as any).contact.first_name} ${(initialDeal as any).contact.last_name}`.trim()
            : "")
        );
        setCompanyId(initialDeal.company_id || "");
        setCompanyNameInput((initialDeal as any).company?.name || "");
        setResponsibleUserId(initialDeal.responsible_user_id || "");
        setExpectedCloseDate(
          initialDeal.expected_close_date ? initialDeal.expected_close_date.substring(0, 10) : ""
        );
        setDescription(initialDeal.description || "");
        setCustomFields(initialDeal.custom_fields || {});
      } else {
        setTitle("");
        setStageId(defaultStageId);
        setAmount("0.00");
        setCurrency("INR");
        setContactId(defaultContactId || "");
        setContactNameInput("");
        setCompanyId(defaultCompanyId || "");
        setCompanyNameInput("");
        setResponsibleUserId("");
        setExpectedCloseDate("");
        setDescription("");
        setCustomFields({});
      }

      fetchLookups();
    }
  }, [open, initialDeal, stages, defaultContactId, defaultCompanyId]);

  useEffect(() => {
    if (companyId && companies.length > 0) {
      const match = companies.find((c) => c.id === companyId);
      if (match && !companyNameInput) {
        setCompanyNameInput(match.name);
      }
    }
  }, [companyId, companies, companyNameInput]);

  useEffect(() => {
    if (contactId && contacts.length > 0) {
      const match = contacts.find((c) => c.id === contactId);
      if (match) {
        if (!contactNameInput) {
          setContactNameInput(match.full_name || `${match.first_name} ${match.last_name}`.trim());
        }
        if (match.company_id && !companyId) {
          setCompanyId(match.company_id);
          const comp = companies.find((c) => c.id === match.company_id);
          if (comp && !companyNameInput) {
            setCompanyNameInput(comp.name);
          }
        }
      }
    }
  }, [contactId, contacts, contactNameInput, companyId, companies, companyNameInput]);

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

  async function fetchLookups() {
    setLookupsLoading(true);
    try {
      let cached: FormFieldConfig[] | null = null;
      try {
        const raw = localStorage.getItem("crm_form_config_deal");
        if (raw) cached = JSON.parse(raw);
      } catch {}

      const needStages = !stages || stages.length === 0;
      const [fetchedContacts, fetchedCompanies, fetchedUsers, fetchedConfig, fetchedStages] =
        await Promise.allSettled([
          api.getContacts({ limit: 100 }),
          api.getCompanies({ limit: 100 }),
          api.getUsersLookup(),
          api.getFormConfig("deal"),
          needStages ? api.getPipelineStages() : Promise.resolve(stages),
        ]);

      if (fetchedContacts.status === "fulfilled") {
        const val = fetchedContacts.value as any;
        setContacts(Array.isArray(val) ? val : (val.items || []));
      }
      if (fetchedCompanies.status === "fulfilled") {
        const val = fetchedCompanies.value as any;
        setCompanies(Array.isArray(val) ? val : (val.items || []));
      }
      if (fetchedUsers.status === "fulfilled") {
        setUsers(Array.isArray(fetchedUsers.value) ? fetchedUsers.value : []);
      }
      if (fetchedStages.status === "fulfilled") {
        const sVal = fetchedStages.value as PipelineStage[];
        if (Array.isArray(sVal) && sVal.length > 0) {
          setStagesList(sVal);
          setStageId((prev) => prev || sVal[0].id);
        }
      }
      if (fetchedConfig.status === "fulfilled" && fetchedConfig.value?.fields_config) {
        const backendKeys = new Set(fetchedConfig.value.fields_config.map((f: FormFieldConfig) => f.key));
        const merged = [...fetchedConfig.value.fields_config];
        // Ensure default fields like company_id and contact_id are never omitted
        DEFAULT_DEAL_FIELDS.forEach((def) => {
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
          localStorage.setItem("crm_form_config_deal", JSON.stringify(merged));
        } catch {}
      } else if (cached && Array.isArray(cached) && cached.length > 0) {
        setFormConfig(cached);
      }
    } catch {
      // Ignored non-fatal lookup fetch
    } finally {
      setLookupsLoading(false);
    }
  }

  async function updateFormConfigAndSync(updated: FormFieldConfig[]) {
    setFormConfig(updated);
    try {
      localStorage.setItem("crm_form_config_deal", JSON.stringify(updated));
    } catch {}

    try {
      await api.updateFormConfig("deal", updated);
    } catch (err) {
      console.error("Failed to sync deal form config:", err);
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
      const def = DEFAULT_DEAL_FIELDS.find((f) => f.key === key);
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
    return formConfig.find((f) => f.key === key);
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
    // Core fields should always be enabled unless specifically toggled off
    if (key === "company_id" || key === "contact_id" || key === "stage_id" || key === "title" || key === "amount") {
      const f = getField(key);
      return f !== undefined ? Boolean(f.enabled) : true;
    }
    if (formConfig.length === 0) return defVal;
    const f = getField(key);
    return f !== undefined ? Boolean(f.enabled) : defVal;
  }

  function isRequired(key: string, defVal = false): boolean {
    const f = getField(key);
    return f ? Boolean(f.required) : defVal;
  }

  function validate(): boolean {
    const newErrors: { [key: string]: string } = {};

    if (!title.trim()) {
      newErrors.title = "Deal title is required.";
    }

    const effectiveStageId = stageId || stagesList[0]?.id;
    if (!effectiveStageId) {
      newErrors.stageId = "Pipeline stage must be selected.";
    }

    if (isEnabled("amount", true)) {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount < 0) {
        newErrors.amount = "Amount must be a non-negative number.";
      }
    }

    // Custom fields validation
    formConfig
      .filter((f) => f.is_custom && f.enabled && f.required)
      .forEach((f) => {
        const val = customFields[f.key];
        if (val === undefined || val === null || val === "") {
          newErrors[f.key] = `${f.label} is required`;
        }
      });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    setApiError(null);

    const effectiveStageId = stageId || stagesList[0]?.id;
    if (!effectiveStageId) {
      setApiError("Pipeline stage must be selected. Please wait for pipeline stages to load.");
      setIsSubmitting(false);
      return;
    }

    let finalCompanyId = companyId?.trim() ? companyId.trim() : null;
    let finalContactId = contactId?.trim() ? contactId.trim() : null;

    if (companyNameInput.trim()) {
      const matchComp = companies.find(
        (c) => c.name.toLowerCase() === companyNameInput.trim().toLowerCase()
      );
      if (matchComp) {
        finalCompanyId = matchComp.id;
      } else if (!finalCompanyId) {
        try {
          const domainGuess = `https://${companyNameInput.trim().toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
          const newComp = await api.createCompany({ name: companyNameInput.trim(), website: domainGuess });
          finalCompanyId = newComp.id;
          setCompanies((prev) => [...prev, newComp]);
        } catch (compErr) {
          console.error("Failed to auto-create company:", compErr);
        }
      }
    } else {
      finalCompanyId = null;
    }

    if (contactNameInput.trim()) {
      const matchCont = contacts.find(
        (c) =>
          (c.full_name && c.full_name.toLowerCase() === contactNameInput.trim().toLowerCase()) ||
          `${c.first_name} ${c.last_name}`.trim().toLowerCase() === contactNameInput.trim().toLowerCase()
      );
      if (matchCont) {
        finalContactId = matchCont.id;
      } else if (!finalContactId) {
        try {
          const parts = contactNameInput.trim().split(" ");
          const firstName = parts[0] || contactNameInput.trim();
          const lastName = parts.slice(1).join(" ") || "";
          const newCont = await api.createContact({
            first_name: firstName,
            last_name: lastName,
            company_id: finalCompanyId || undefined,
          });
          finalContactId = newCont.id;
          setContacts((prev) => [newCont, ...prev]);
        } catch (contErr) {
          console.error("Failed to auto-create contact:", contErr);
        }
      }
    } else {
      finalContactId = null;
    }

    const payload: DealCreateInput = {
      title: title.trim() || "Deal Opportunity",
      stage_id: effectiveStageId,
      amount: isNaN(parseFloat(amount)) ? 0 : Math.max(0, parseFloat(amount)),
      currency: currency || "USD",
      contact_id: finalContactId,
      company_id: finalCompanyId,
      responsible_user_id: responsibleUserId?.trim() ? responsibleUserId.trim() : null,
      expected_close_date: expectedCloseDate?.trim() ? expectedCloseDate.trim() : null,
      description: description?.trim() ? description.trim() : null,
      custom_fields: customFields,
    };

    try {
      let savedDeal: Deal;
      if (isEditMode && initialDeal) {
        savedDeal = await api.updateDeal(initialDeal.id, payload);
      } else {
        savedDeal = await api.createDeal(payload);
      }

      onSuccess(savedDeal);
      onOpenChange(false);
    } catch (err: any) {
      const msg = err.detail || err.message || "Failed to save deal. Please try again.";
      setApiError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setIsSubmitting(false);
    }
  }

  const currentKeys = new Set(formConfig.map((f) => f.key));
  const missingDefaults = DEFAULT_DEAL_FIELDS.filter((f) => !currentKeys.has(f.key)).map(
    (f) => ({ ...f, enabled: false })
  );
  const hiddenFields = [
    ...formConfig.filter((f) => !f.enabled),
    ...missingDefaults,
  ];
  const standardDealKeys = new Set([
    "title",
    "stage_id",
    "amount",
    "currency",
    "contact_id",
    "company_id",
    "expected_close_date",
    "description",
  ]);
  const customVisibleFields = formConfig.filter(
    (f) => f.enabled && (!standardDealKeys.has(f.key) || f.is_custom)
  );

  if (!open) return null;

  return (
    <>
      <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title=""
      description=""
      maxWidth="max-w-2xl"
    >
      <div className="pt-1">
        {/* Header: ABOUT DEAL with Pencil (into mark ✕ handled by Dialog) */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 pr-8">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold tracking-wider text-slate-500 uppercase select-none">
              ABOUT DEAL
            </h2>
            <Pencil className="h-3 w-3 text-slate-400" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {apiError && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{apiError}</span>
            </div>
          )}

          {/* Title */}
          {isEnabled("title", true) && (
            <FormFieldWrapper
              fieldKey="title"
              label={getFieldLabel("title", "Deal Title")}
              required={isRequired("title", true)}
              placeholder={getField("title")?.placeholder || "e.g. Acme Cloud Subscription"}
              error={errors.title}
              onToggleRequired={toggleFieldRequired}
              onRemoveField={removeFieldFromForm}
              onDeleteField={deleteField}
              onUpdateField={updateFieldConfig}
            >
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={getField("title")?.placeholder || "e.g. Acme Cloud Subscription"}
                className={`h-9 border-slate-200 bg-white text-sm shadow-2xs ${
                  errors.title ? "border-red-500 bg-red-50/20" : ""
                }`}
              />
            </FormFieldWrapper>
          )}

          {/* Stage */}
          {isEnabled("stage_id", true) && (
            <FormFieldWrapper
              fieldKey="stage_id"
              label={getFieldLabel("stage_id", "Pipeline Stage")}
              required={isRequired("stage_id", true)}
              error={errors.stageId}
              onToggleRequired={toggleFieldRequired}
              onRemoveField={removeFieldFromForm}
              onDeleteField={deleteField}
              onUpdateField={updateFieldConfig}
            >
              <div className="relative">
                <select
                  value={stageId}
                  onChange={(e) => setStageId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-2xs focus:outline-none focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF] appearance-none"
                >
                  {stagesList.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </FormFieldWrapper>
          )}

          {/* Amount & Currency */}
          {isEnabled("amount", true) && (
            <FormFieldWrapper
              fieldKey="amount"
              label={getFieldLabel("amount", "Deal Amount & Currency")}
              required={isRequired("amount", false)}
              options={getFieldOptions("currency", ["INR", "USD", "AED", "EUR", "GBP", "CAD", "AUD"])}
              error={errors.amount}
              onToggleRequired={toggleFieldRequired}
              onRemoveField={removeFieldFromForm}
              onDeleteField={deleteField}
              onUpdateField={updateFieldConfig}
            >
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-9 flex-1 border-slate-200 bg-white text-sm shadow-2xs"
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="h-9 w-28 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-sm shadow-2xs focus:outline-none focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF]"
                >
                  {getFieldOptions("currency", ["INR", "USD", "AED", "EUR", "GBP", "CAD", "AUD"]).map((curr) => (
                    <option key={curr} value={curr}>
                      {curr}
                    </option>
                  ))}
                </select>
              </div>
            </FormFieldWrapper>
          )}

          {/* Contact Person */}
          {isEnabled("contact_id", true) && (
            <FormFieldWrapper
              fieldKey="contact_id"
              label={getFieldLabel("contact_id", "Contact Person")}
              required={isRequired("contact_id", false)}
              onToggleRequired={toggleFieldRequired}
              onRemoveField={removeFieldFromForm}
              onDeleteField={deleteField}
              onUpdateField={updateFieldConfig}
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
                        if (match) {
                          setContactNameInput(match.full_name || `${match.first_name} ${match.last_name}`.trim());
                          if (match.company_id) {
                            setCompanyId(match.company_id);
                            const comp = companies.find((c) => c.id === match.company_id);
                            if (comp) setCompanyNameInput(comp.name);
                          }
                        }
                      } else {
                        setContactNameInput("");
                      }
                    }}
                    placeholder="Search & choose contact..."
                    searchPlaceholder="Search contacts by name, email..."
                    emptyText="No contacts match search"
                    icon={UserIcon}
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
            </FormFieldWrapper>
          )}

          {/* Company */}
          {isEnabled("company_id", true) && (
            <FormFieldWrapper
              fieldKey="company_id"
              label={getFieldLabel("company_id", "Associated Company")}
              required={isRequired("company_id", false)}
              onToggleRequired={toggleFieldRequired}
              onRemoveField={removeFieldFromForm}
              onDeleteField={deleteField}
              onUpdateField={updateFieldConfig}
            >
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <SearchableSelect
                    options={filteredCompanies.map((c) => ({
                      value: c.id,
                      label: c.name,
                      sublabel: c.industry || c.website || undefined,
                      icon: Building2,
                    }))}
                    value={companyId}
                    onChange={(val) => {
                      setCompanyId(val);
                      if (val) {
                        const match = companies.find((c) => c.id === val);
                        if (match) {
                          setCompanyNameInput(match.name);
                          if (contactId) {
                            const currentContact = contacts.find((c) => c.id === contactId);
                            if (currentContact && currentContact.company_id && currentContact.company_id !== match.id) {
                              setContactId("");
                              setContactNameInput("");
                            }
                          }
                        }
                      } else {
                        setCompanyNameInput("");
                        if (contactId) {
                          const currentContact = contacts.find((c) => c.id === contactId);
                          if (currentContact && currentContact.company_id) {
                            setContactId("");
                            setContactNameInput("");
                          }
                        }
                      }
                    }}
                    placeholder="Search & choose company..."
                    searchPlaceholder="Search companies by name..."
                    emptyText="No companies match search"
                    icon={Building2}
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

          {/* Expected Close Date */}
          {isEnabled("expected_close_date", true) && (
            <FormFieldWrapper
              fieldKey="expected_close_date"
              label={getFieldLabel("expected_close_date", "Expected Close Date")}
              required={isRequired("expected_close_date", false)}
              onToggleRequired={toggleFieldRequired}
              onRemoveField={removeFieldFromForm}
              onDeleteField={deleteField}
              onUpdateField={updateFieldConfig}
            >
              <Input
                type="date"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
                className="h-9 border-slate-200 bg-white text-sm shadow-2xs"
              />
            </FormFieldWrapper>
          )}

          {/* Description */}
          {isEnabled("description", true) && (
            <FormFieldWrapper
              fieldKey="description"
              label={getFieldLabel("description", "Description / Notes")}
              required={isRequired("description", false)}
              placeholder={getField("description")?.placeholder || "Key requirements, budget notes, next milestones..."}
              onToggleRequired={toggleFieldRequired}
              onRemoveField={removeFieldFromForm}
              onDeleteField={deleteField}
              onUpdateField={updateFieldConfig}
            >
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={getField("description")?.placeholder || "Key requirements, budget notes, next milestones..."}
                className="w-full rounded-md border border-slate-200 bg-white p-2 text-xs sm:text-sm shadow-2xs focus:outline-none focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF]"
              />
            </FormFieldWrapper>
          )}

          {/* Dynamic Custom Fields */}
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

          {/* Form Actions: Select Field + Create Field */}
          <FormBuilderActions
            hiddenFields={hiddenFields}
            onAddField={addFieldToForm}
            onCreateCustomField={createCustomField}
            entityName="Deal"
          />

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="submit"
              variant="bitrix"
              disabled={isSubmitting}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEditMode ? (
                "Save Changes"
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>

    {/* Quick-Add Entity Modals */}
    {isContactModalOpen && (
      <ContactForm
        open={isContactModalOpen}
        onOpenChange={setIsContactModalOpen}
        onSuccess={(newContact) => {
          setContacts((prev) => [newContact, ...prev.filter((c) => c.id !== newContact.id)]);
          setContactId(newContact.id);
          setContactNameInput(newContact.full_name || `${newContact.first_name} ${newContact.last_name}`.trim());
          if (newContact.company_id) {
            setCompanyId(newContact.company_id);
            const comp = companies.find((c) => c.id === newContact.company_id);
            if (comp) setCompanyNameInput(comp.name);
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
          setCompanyNameInput(newCompany.name);
          if (contactId) {
            const currentContact = contacts.find((c) => c.id === contactId);
            if (currentContact && currentContact.company_id && currentContact.company_id !== newCompany.id) {
              setContactId("");
              setContactNameInput("");
            }
          }
          setIsCompanyModalOpen(false);
        }}
      />
    )}
  </>
  );
}
