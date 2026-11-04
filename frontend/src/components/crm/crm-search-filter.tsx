"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  X,
  Pin,
  Lock,
  ChevronDown,
  Filter,
  RotateCcw,
  Sparkles,
  Plus,
  RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { CONTACT_STAGES, COMPANY_STAGES } from "@/lib/form-defaults";
import { FormFieldConfig } from "@/types/crm";

export interface FilterPreset {
  id: string;
  label: string;
  isPinned?: boolean;
}

export interface CrmSearchFilterProps {
  entityType: "contact" | "company";
  search: string;
  onSearchChange: (val: string) => void;
  activePreset: string;
  onPresetChange: (presetId: string) => void;
  onFilterSubmit?: (filters: Record<string, string>) => void;
  onResetFilters?: () => void;
  totalRecords?: number;
}

export function CrmSearchFilter({
  entityType,
  search,
  onSearchChange,
  activePreset,
  onPresetChange,
  onFilterSubmit,
  onResetFilters,
  totalRecords = 0,
}: CrmSearchFilterProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [simulatedRestriction, setSimulatedRestriction] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter values
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [modifiedBy, setModifiedBy] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [responsiblePerson, setResponsiblePerson] = useState("");
  const [contactType, setContactType] = useState("");
  const [stage, setStage] = useState("");

  // Field states for Companies filter form
  const [companyName, setCompanyName] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [industry, setIndustry] = useState("");
  const [address, setAddress] = useState("");

  // Configured field options loaded dynamically
  const [contactTypeOptions, setContactTypeOptions] = useState<string[]>([
    "Clients",
    "Partners",
    "Suppliers",
    "Other",
  ]);
  const [contactStageOptions, setContactStageOptions] = useState<string[]>([...CONTACT_STAGES]);
  const [companyStageOptions, setCompanyStageOptions] = useState<string[]>([...COMPANY_STAGES]);
  const [companyTypeOptions, setCompanyTypeOptions] = useState<string[]>([
    "Client",
    "Partner",
    "Supplier",
    "Competitor",
    "Other",
  ]);
  const [industryOptions, setIndustryOptions] = useState<string[]>([
    "Information Technology",
    "Manufacturing",
    "Sustainability",
    "Real Estate & Offices",
    "Education",
    "Healthcare",
    "Financial Services",
    "Retail",
    "Other",
  ]);

  // Load configured options for filters from form config
  useEffect(() => {
    const applyFields = (fields: FormFieldConfig[]) => {
      if (entityType === "contact") {
        const ctField = fields.find((f) => f.key === "contact_type");
        if (ctField?.options && ctField.options.length > 0) {
          setContactTypeOptions(ctField.options);
        }
        const stField = fields.find((f) => f.key === "stage");
        if (stField?.options && stField.options.length > 0) {
          setContactStageOptions(stField.options);
        }
      } else {
        const indField = fields.find((f) => f.key === "industry");
        if (indField?.options && indField.options.length > 0) {
          setIndustryOptions(indField.options);
        }
        const stField = fields.find((f) => f.key === "stage");
        if (stField?.options && stField.options.length > 0) {
          setCompanyStageOptions(stField.options);
        }
        const ctField = fields.find((f) => f.key === "company_type");
        if (ctField?.options && ctField.options.length > 0) {
          setCompanyTypeOptions(ctField.options);
        }
      }
    };

    // Try localStorage first for instant hydration
    try {
      const cached = localStorage.getItem(`crm_form_config_${entityType}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          applyFields(parsed);
        }
      }
    } catch {}

    // Fetch freshest configuration from API
    api
      .getFormConfig(entityType)
      .then((conf) => {
        if (conf?.fields_config) {
          applyFields(conf.fields_config);
        }
      })
      .catch((err) => {
        console.warn("Could not load form config for filter options:", err);
      });
  }, [entityType]);

  // Extra field toggle states
  const [extraFieldAdded, setExtraFieldAdded] = useState(false);

  const isContact = entityType === "contact";
  const myPresetName = isContact ? "My contacts" : "My companies";

  // Is restricted if total records >= 1000 or user explicitly toggles simulation
  const isRestricted = totalRecords >= 1000 || simulatedRestriction;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClearSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSearchChange("");
    onPresetChange("all");
    handleReset();
  };

  const handleSearchClick = () => {
    setDropdownOpen(true);
  };

  const handleFind = () => {
    if (onFilterSubmit) {
      if (isContact) {
        onFilterSubmit({
          first_name: firstName,
          last_name: lastName,
          created_by: createdBy,
          modified_by: modifiedBy,
          phone,
          email,
          responsible_person: responsiblePerson,
          contact_type: contactType,
          stage,
        });
      } else {
        onFilterSubmit({
          name: companyName,
          created_by: createdBy,
          modified_by: modifiedBy,
          phone,
          email,
          responsible_person: responsiblePerson,
          industry,
          company_type: companyType,
          stage,
          address,
        });
      }
    }
    setDropdownOpen(false);
  };

  const handleReset = () => {
    setFirstName("");
    setLastName("");
    setCreatedBy("");
    setModifiedBy("");
    setPhone("");
    setEmail("");
    setResponsiblePerson("");
    setContactType("");
    setStage("");
    setCompanyName("");
    setCompanyType("");
    setIndustry("");
    setAddress("");
    onSearchChange("");
    if (onResetFilters) onResetFilters();
  };

  const handleRestoreDefaults = () => {
    handleReset();
    setExtraFieldAdded(false);
  };

  return (
    <div className="relative flex-1 max-w-xl" ref={containerRef}>
      {/* Search Input Container with Embedded Preset Chip */}
      <div
        onClick={handleSearchClick}
        className="flex items-center h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs shadow-2xs cursor-text focus-within:ring-1 focus-within:ring-[#1c9be8] focus-within:border-[#1c9be8]"
      >
        {/* Preset Chip (Only shown when an active preset like 'My' is selected) */}
        {activePreset === "my" && (
          <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium mr-2 shrink-0 select-none">
            <span>{myPresetName}</span>
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              title="Remove preset filter"
            >
              ✕
            </button>
          </div>
        )}

        {/* Text Input */}
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={
            isRestricted
              ? "Limit reached, click for details"
              : `Search ${isContact ? "contacts" : "companies"}...`
          }
          className="flex-1 bg-transparent outline-none text-slate-800 placeholder:text-slate-400 text-xs min-w-[120px]"
        />

        {/* 1,000 Records Limit Warning Pill (if restricted) */}
        {isRestricted && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowPaywallModal(true);
            }}
            className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-semibold mr-1.5 hover:bg-amber-100"
            title="1,000-record search restriction active"
          >
            <Lock className="h-3 w-3" />
            <span>Limit reached</span>
          </button>
        )}

        {/* Clear & Search Icons */}
        {search && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="p-1 text-slate-400 hover:text-[#1c9be8]"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>

      {/* Bitrix24 main.ui.filter Dropdown Overlay */}
      {dropdownOpen && (
        <div className="absolute left-0 top-11 z-40 w-[680px] rounded-lg border border-slate-200 bg-white shadow-2xl flex overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Left Presets Sidebar */}
          <div className="w-48 bg-slate-50 border-r border-slate-200 p-3 space-y-1 select-none flex flex-col justify-between">
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                Presets
              </div>
              <button
                type="button"
                onClick={() => {
                  onPresetChange(activePreset === "my" ? "all" : "my");
                  setDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs text-left transition-colors cursor-pointer ${
                  activePreset === "my"
                    ? "bg-white font-semibold text-[#1c9be8] shadow-2xs border border-slate-200"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>{myPresetName}</span>
                {activePreset === "my" && <Pin className="h-3 w-3 text-[#1c9be8] fill-current" />}
              </button>
            </div>

            {/* Plan restriction controls */}
            <div className="pt-3 border-t border-slate-200 mt-3 space-y-1">
              <button
                type="button"
                onClick={() => setShowPaywallModal(true)}
                className="w-full text-left px-2 py-1.5 text-[11px] text-amber-600 hover:text-amber-800 flex items-center gap-1.5 font-medium"
              >
                <Lock className="h-3 w-3" />
                <span>1,000 Limit Gate</span>
              </button>
              <button
                type="button"
                onClick={() => setSimulatedRestriction(!simulatedRestriction)}
                className="w-full text-left px-2 py-1 text-[10px] text-slate-500 hover:text-slate-700 underline"
              >
                {simulatedRestriction ? "Deactivate test limit" : "Simulate 1k limit"}
              </button>
            </div>
          </div>

          {/* Right Filter Form */}
          <div className="flex-1 p-4 flex flex-col justify-between max-h-[480px] overflow-y-auto relative">
            {/* If 1,000-record search limit is triggered, show overlay over form while preserving underlying DOM */}
            {isRestricted && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-xs z-20 flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 border border-blue-200 text-[#1c9be8]">
                  <Lock className="h-6 w-6 stroke-[2]" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Maximum search limit reached</h4>
                <p className="text-xs text-slate-600 max-w-sm leading-relaxed text-justify px-2">
                  {isContact ? "Contact" : "Company"} search limit (1000) reached. We are striving to improve
                  service quality and performance to fit your business scale. The amount of data increases as
                  your business grows: new tasks, deals and other entities are created every day.
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => alert("Commercial upgrade plans: Standard, Professional, Enterprise.")}
                    className="px-5 py-2 rounded bg-[#80c200] hover:bg-[#72ad00] text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-colors"
                  >
                    UPGRADE
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimulatedRestriction(false)}
                    className="px-3 py-1.5 text-xs text-[#1c9be8] hover:underline"
                  >
                    View underlying filter fields
                  </button>
                </div>
              </div>
            )}

            {/* Underlying Verified Filter Fields (Preserved in DOM) */}
            <div className="space-y-3">
              {isContact ? (
                <>
                  {/* Row 1: First name & Last name */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-medium text-slate-500">First name</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Forename..."
                        className="mt-1 h-8 w-full rounded border border-slate-200 px-2.5 text-xs text-slate-800 focus:border-[#1c9be8] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-500">Last name</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Surname..."
                        className="mt-1 h-8 w-full rounded border border-slate-200 px-2.5 text-xs text-slate-800 focus:border-[#1c9be8] outline-none"
                      />
                    </div>
                  </div>

                  {/* Row 2: Created by & Modified by */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-medium text-slate-500">Created by</label>
                      <input
                        type="text"
                        value={createdBy}
                        onChange={(e) => setCreatedBy(e.target.value)}
                        placeholder="Creator name or email..."
                        className="mt-1 h-8 w-full rounded border border-slate-200 px-2.5 text-xs text-slate-800 focus:border-[#1c9be8] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-500">Modified by</label>
                      <input
                        type="text"
                        value={modifiedBy}
                        onChange={(e) => setModifiedBy(e.target.value)}
                        placeholder="Editor name or email..."
                        className="mt-1 h-8 w-full rounded border border-slate-200 px-2.5 text-xs text-slate-800 focus:border-[#1c9be8] outline-none"
                      />
                    </div>
                  </div>

                  {/* Row 3: Phone & Email */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-medium text-slate-500">Phone</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Phone number..."
                        className="mt-1 h-8 w-full rounded border border-slate-200 px-2.5 text-xs text-slate-800 focus:border-[#1c9be8] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-500">Email</label>
                      <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email address..."
                        className="mt-1 h-8 w-full rounded border border-slate-200 px-2.5 text-xs text-slate-800 focus:border-[#1c9be8] outline-none"
                      />
                    </div>
                  </div>

                  {/* Row 4: Responsible person & Contact type */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-medium text-slate-500">Responsible person</label>
                      <input
                        type="text"
                        value={responsiblePerson}
                        onChange={(e) => setResponsiblePerson(e.target.value)}
                        placeholder="Assignee name..."
                        className="mt-1 h-8 w-full rounded border border-slate-200 px-2.5 text-xs text-slate-800 focus:border-[#1c9be8] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-500">Contact type</label>
                      <select
                        value={contactType}
                        onChange={(e) => setContactType(e.target.value)}
                        className="mt-1 h-8 w-full rounded border border-slate-200 px-2.5 text-xs text-slate-800 focus:border-[#1c9be8] outline-none bg-white"
                      >
                        <option value="">All Types</option>
                        {contactTypeOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 5: Stage */}
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Stage</label>
                    <select
                      value={stage}
                      onChange={(e) => setStage(e.target.value)}
                      className="mt-1 h-8 w-full rounded border border-slate-200 px-2.5 text-xs text-slate-800 focus:border-[#1c9be8] outline-none bg-white"
                    >
                      <option value="">All Stages</option>
                      {contactStageOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Extra custom field toggled via "Add field" */}
                  {extraFieldAdded && (
                    <div className="animate-in fade-in">
                      <label className="text-[11px] font-medium text-slate-500">Address / Location</label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Geographic city or state..."
                        className="mt-1 h-8 w-full rounded border border-slate-200 px-2.5 text-xs text-slate-800 focus:border-[#1c9be8] outline-none"
                      />
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Row 1: Company Name */}
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Company Name</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Organization title..."
                      className="mt-1 h-8 w-full rounded border border-slate-200 px-2.5 text-xs text-slate-800 focus:border-[#1c9be8] outline-none"
                    />
                  </div>

                  {/* Row 2: Created by & Modified by */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-medium text-slate-500">Created by</label>
                      <input
                        type="text"
                        value={createdBy}
                        onChange={(e) => setCreatedBy(e.target.value)}
                        placeholder="Creator name or email..."
                        className="mt-1 h-8 w-full rounded border border-slate-200 px-2.5 text-xs text-slate-800 focus:border-[#1c9be8] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-500">Modified by</label>
                      <input
                        type="text"
                        value={modifiedBy}
                        onChange={(e) => setModifiedBy(e.target.value)}
                        placeholder="Editor name or email..."
                        className="mt-1 h-8 w-full rounded border border-slate-200 px-2.5 text-xs text-slate-800 focus:border-[#1c9be8] outline-none"
                      />
                    </div>
                  </div>

                  {/* Row 3: Phone & Email */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-medium text-slate-500">Phone</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Phone number..."
                        className="mt-1 h-8 w-full rounded border border-slate-200 px-2.5 text-xs text-slate-800 focus:border-[#1c9be8] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-500">Email</label>
                      <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email address..."
                        className="mt-1 h-8 w-full rounded border border-slate-200 px-2.5 text-xs text-slate-800 focus:border-[#1c9be8] outline-none"
                      />
                    </div>
                  </div>

                  {/* Row 4: Responsible person & Industry */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-medium text-slate-500">Responsible person</label>
                      <input
                        type="text"
                        value={responsiblePerson}
                        onChange={(e) => setResponsiblePerson(e.target.value)}
                        placeholder="Assignee name..."
                        className="mt-1 h-8 w-full rounded border border-slate-200 px-2.5 text-xs text-slate-800 focus:border-[#1c9be8] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-500">Industry</label>
                      <select
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="mt-1 h-8 w-full rounded border border-slate-200 px-2.5 text-xs text-slate-800 focus:border-[#1c9be8] outline-none bg-white"
                      >
                        <option value="">All Industries</option>
                        {industryOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 5: Company Type & Stage */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-medium text-slate-500">Company type</label>
                      <select
                        value={companyType}
                        onChange={(e) => setCompanyType(e.target.value)}
                        className="mt-1 h-8 w-full rounded border border-slate-200 px-2.5 text-xs text-slate-800 focus:border-[#1c9be8] outline-none bg-white"
                      >
                        <option value="">All Company Types</option>
                        {companyTypeOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-500">Stage</label>
                      <select
                        value={stage}
                        onChange={(e) => setStage(e.target.value)}
                        className="mt-1 h-8 w-full rounded border border-slate-200 px-2.5 text-xs text-slate-800 focus:border-[#1c9be8] outline-none bg-white"
                      >
                        <option value="">All Stages</option>
                        {companyStageOptions.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 6: Address */}
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Address</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Geographic location string..."
                      className="mt-1 h-8 w-full rounded border border-slate-200 px-2.5 text-xs text-slate-800 focus:border-[#1c9be8] outline-none"
                    />
                  </div>
                </>
              )}

              {/* Bitrix24 Controls: Add field & Restore default fields */}
              <div className="flex items-center gap-4 pt-1 text-[11px] select-none">
                <button
                  type="button"
                  onClick={() => setExtraFieldAdded(!extraFieldAdded)}
                  className="text-[#1c9be8] hover:underline flex items-center gap-1 font-medium"
                >
                  <Plus className="h-3 w-3" />
                  <span>{extraFieldAdded ? "Hide extra field" : "Add field"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleRestoreDefaults}
                  className="text-slate-400 hover:text-slate-600 flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Restore default fields</span>
                </button>
              </div>
            </div>

            {/* Bottom Actions: Search & Reset */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-4">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFind}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1c9be8] hover:bg-[#1688cf] rounded shadow-2xs"
                >
                  Find
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bitrix24 Verified 1,000-Record Search Restriction Paywall Modal */}
      {showPaywallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden text-center p-6 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 border-2 border-blue-200 text-[#1c9be8]">
              <Lock className="h-8 w-8 stroke-[2]" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Maximum search limit reached
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed text-justify px-2">
              {isContact ? "Contact" : "Company"} search limit (1000) reached. We are striving to improve
              service quality and performance to fit your business scale. The amount of data increases as
              your business grows: new tasks, deals and other entities are created every day.
            </p>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  alert("Commercial upgrade options: Standard, Professional, Enterprise.");
                  setShowPaywallModal(false);
                }}
                className="w-full py-2.5 px-4 rounded-lg bg-[#80c200] hover:bg-[#72ad00] text-white text-xs font-bold tracking-wider uppercase shadow-md transition-colors"
              >
                UPGRADE
              </button>
              <button
                type="button"
                onClick={() => setShowPaywallModal(false)}
                className="w-full py-2 text-xs font-medium text-slate-500 hover:text-slate-800"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
