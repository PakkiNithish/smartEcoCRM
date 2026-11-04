"use client";

import React, { useState, useEffect } from "react";
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  CalendarCheck2,
  ShieldCheck,
  ShieldAlert,
  Building2,
  Briefcase,
  Users,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  Sparkles,
  RotateCcw,
  Pencil,
  ChevronUp,
  ChevronDown,
  GripVertical,
  ArrowUpDown,
  ListOrdered,
  X,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { FormConfig, FormFieldConfig, User } from "@/types/crm";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_CONFIGS } from "@/lib/form-defaults";

const ENTITY_TABS = [
  { id: "deal", label: "Deals Form", icon: Briefcase },
  { id: "contact", label: "Contacts Form", icon: Users },
  { id: "company", label: "Companies Form", icon: Building2 },
  { id: "task", label: "Tasks Form", icon: CheckCircle2 },
  { id: "activity", label: "Activities Form", icon: CalendarCheck2 },
];

export default function AdminFormsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"deal" | "contact" | "company" | "task" | "activity">("deal");
  const [configs, setConfigs] = useState<Record<string, FormFieldConfig[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New Custom Field Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newField, setNewField] = useState({
    label: "",
    type: "text" as FormFieldConfig["type"],
    required: false,
    placeholder: "",
    optionsStr: "",
  });
  const [newFieldOptionsList, setNewFieldOptionsList] = useState<string[]>([]);
  const [newFieldOptionInput, setNewFieldOptionInput] = useState("");
  const [draggedNewOptionIdx, setDraggedNewOptionIdx] = useState<number | null>(null);

  // Edit Existing Field Modal
  const [editingFieldIdx, setEditingFieldIdx] = useState<number | null>(null);
  const [editingFieldLabel, setEditingFieldLabel] = useState("");
  const [editingFieldPlaceholder, setEditingFieldPlaceholder] = useState("");
  const [editingFieldOptions, setEditingFieldOptions] = useState<string[]>([]);
  const [newEditOptionText, setNewEditOptionText] = useState("");
  const [draggedEditOptionIdx, setDraggedEditOptionIdx] = useState<number | null>(null);

  // Field Reordering State
  const [draggedFieldIdx, setDraggedFieldIdx] = useState<number | null>(null);

  const persistFieldReorder = (updatedList: FormFieldConfig[]) => {
    setConfigs((prev) => ({
      ...prev,
      [activeTab]: updatedList,
    }));
    try {
      localStorage.setItem(`crm_form_config_${activeTab}`, JSON.stringify(updatedList));
    } catch {}
    api.updateFormConfig(activeTab, updatedList).catch((err) => {
      console.error("Auto-sync failed on reorder:", err);
    });
  };

  const handleMoveField = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === currentFields.length - 1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...currentFields];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    persistFieldReorder(updated);
  };

  const handleDragFieldOver = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedFieldIdx === null || draggedFieldIdx === targetIdx) return;
    const updated = [...currentFields];
    const item = updated[draggedFieldIdx];
    updated.splice(draggedFieldIdx, 1);
    updated.splice(targetIdx, 0, item);
    setDraggedFieldIdx(targetIdx);
    persistFieldReorder(updated);
  };

  const openEditFieldModal = (idx: number) => {
    const field = currentFields[idx];
    if (!field) return;
    setEditingFieldIdx(idx);
    setEditingFieldLabel(field.label);
    setEditingFieldPlaceholder(field.placeholder || "");
    setEditingFieldOptions(field.options || []);
    setNewEditOptionText("");
  };

  const handleSaveFieldEdit = () => {
    if (editingFieldIdx === null) return;
    const updated = [...currentFields];
    const target = updated[editingFieldIdx];
    if (!target) return;

    updated[editingFieldIdx] = {
      ...target,
      label: editingFieldLabel.trim() || target.label,
      placeholder: editingFieldPlaceholder.trim() || undefined,
      options:
        target.type === "select" || (target.options && target.options.length > 0)
          ? editingFieldOptions.map((o) => o.trim()).filter(Boolean)
          : target.options,
    };

    setConfigs({
      ...configs,
      [activeTab]: updated,
    });

    try {
      localStorage.setItem(`crm_form_config_${activeTab}`, JSON.stringify(updated));
    } catch {}

    api.updateFormConfig(activeTab, updated).catch((err) => {
      console.error("Auto-sync failed on edit field:", err);
    });

    setEditingFieldIdx(null);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const user = await api.getCurrentUser();
      setCurrentUser(user);

      if (user.role !== "admin") {
        setErrorMsg("Access restricted. Only Administrators can configure forms.");
        return;
      }

      const [dealConf, contactConf, companyConf, taskConf, activityConf] = await Promise.all([
        api.getFormConfig("deal"),
        api.getFormConfig("contact"),
        api.getFormConfig("company"),
        api.getFormConfig("task"),
        api.getFormConfig("activity"),
      ]);

      setConfigs({
        deal: dealConf.fields_config,
        contact: contactConf.fields_config,
        company: companyConf.fields_config,
        task: taskConf.fields_config,
        activity: activityConf.fields_config,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to load form configurations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentFields = configs[activeTab] || [];

  const handleToggleEnabled = (index: number) => {
    const updated = [...currentFields];
    updated[index] = { ...updated[index], enabled: !updated[index].enabled };
    setConfigs({ ...configs, [activeTab]: updated });
  };

  const handleToggleRequired = (index: number) => {
    const updated = [...currentFields];
    updated[index] = { ...updated[index], required: !updated[index].required };
    setConfigs({ ...configs, [activeTab]: updated });
  };

  const handleDeleteField = (index: number) => {
    const field = currentFields[index];
    if (!confirm(`Are you sure you want to delete the field "${field.label}" from this form?`)) {
      return;
    }
    const updated = currentFields.filter((_, i) => i !== index);
    setConfigs({ ...configs, [activeTab]: updated });
    try {
      localStorage.setItem(`crm_form_config_${activeTab}`, JSON.stringify(updated));
    } catch {}
    // Auto-sync deletion to backend immediately
    api.updateFormConfig(activeTab, updated).catch((err) => {
      console.error("Auto-sync failed on delete field:", err);
    });
  };

  const handleResetDefaults = async () => {
    if (
      !confirm(
        `Reset ${activeTab} form to default system fields? This will restore any deleted standard fields.`
      )
    ) {
      return;
    }
    const defaults = DEFAULT_CONFIGS[activeTab] || [];
    setConfigs({ ...configs, [activeTab]: defaults });
    try {
      localStorage.setItem(`crm_form_config_${activeTab}`, JSON.stringify(defaults));
    } catch {}
    try {
      await api.updateFormConfig(activeTab, defaults);
      setSuccessMsg(`Reset ${activeTab.toUpperCase()} form to defaults successfully!`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      alert(err?.message || "Failed to reset form configuration");
    }
  };

  const handleAddCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newField.label.trim()) return;

    const slug = newField.label
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 30);
    const key = `cf_${slug}_${Date.now().toString().slice(-4)}`;

    let options: string[] | undefined = undefined;
    if (newField.type === "select") {
      let candidate = newFieldOptionsList.map((s) => s.trim()).filter(Boolean);
      if (candidate.length === 0 && newField.optionsStr.trim()) {
        candidate = newField.optionsStr
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
      options = candidate.length > 0 ? candidate : undefined;
    }

    const fieldToAdd: FormFieldConfig = {
      key,
      label: newField.label.trim(),
      type: newField.type,
      required: newField.required,
      enabled: true,
      is_custom: true,
      placeholder: newField.placeholder.trim() || undefined,
      options,
    };

    const updatedTabFields = [...currentFields, fieldToAdd];
    setConfigs({
      ...configs,
      [activeTab]: updatedTabFields,
    });

    try {
      localStorage.setItem(`crm_form_config_${activeTab}`, JSON.stringify(updatedTabFields));
    } catch {}

    // Auto-persist immediately to backend so the new field appears everywhere in UI right away
    api.updateFormConfig(activeTab, updatedTabFields).catch((err) => {
      console.error("Auto-sync failed on add custom field:", err);
    });

    setIsModalOpen(false);
    setNewField({
      label: "",
      type: "text",
      required: false,
      placeholder: "",
      optionsStr: "",
    });
    setNewFieldOptionsList([]);
    setNewFieldOptionInput("");
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      await api.updateFormConfig(activeTab, currentFields);
      try {
        localStorage.setItem(`crm_form_config_${activeTab}`, JSON.stringify(currentFields));
      } catch {}
      setSuccessMsg(`Successfully saved ${activeTab.toUpperCase()} form configuration!`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      alert(err?.message || "Failed to save form configuration");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <RefreshCw className="h-5 w-5 animate-spin text-[#00AEEF]" />
          <span>Loading form configurations...</span>
        </div>
      </div>
    );
  }

  if (currentUser?.role !== "admin") {
    return (
      <div className="p-8 max-w-2xl mx-auto mt-12 text-center bg-white rounded-xl shadow-xs border border-red-200">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-600 mt-2">
          Only company administrators can configure creation forms and custom fields.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span>Administrator Control Panel</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <span>Configurable Creation Forms</span>
            <Badge variant="outline" className="text-xs bg-sky-50 text-sky-700 border-sky-200">
              <SlidersHorizontal className="h-3 w-3 mr-1" />
              Dynamic Schema
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Customize which fields appear when creating Deals, Contacts, Companies, Tasks, and Activities, and create new custom fields for your team.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted text-foreground font-medium text-xs sm:text-sm transition-all shadow-2xs"
            title="Reset to default system fields"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-card hover:bg-muted text-foreground font-medium text-sm transition-all shadow-2xs"
          >
            <Plus className="h-4 w-4 text-[#00AEEF]" />
            <span>Add Custom Field</span>
          </button>
          <button
            onClick={handleSaveChanges}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#00AEEF] hover:bg-[#0098d4] text-white font-medium text-sm transition-all shadow-xs disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? "Saving..." : "Save Configuration"}</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Entity Tabs */}
      <div className="flex border-b border-border gap-2">
        {ENTITY_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px ${
                isActive
                  ? "border-[#00AEEF] text-[#00AEEF]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              <Badge variant="secondary" className="text-[10px] ml-1">
                {configs[tab.id]?.length || 0} fields
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Fields List & Live Preview Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form Config List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 text-[#00AEEF]" />
              <span>Configured Fields for {activeTab.toUpperCase()} (Drag or use arrows to reorder)</span>
            </span>
            <span>Visible / Required Toggles & Actions</span>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-2xs divide-y divide-border">
            {currentFields.map((field, idx) => (
              <div
                key={field.key}
                draggable
                onDragStart={(e) => {
                  setDraggedFieldIdx(idx);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => handleDragFieldOver(e, idx)}
                onDragEnd={() => setDraggedFieldIdx(null)}
                className={`p-3 sm:p-4 flex items-center justify-between gap-3 sm:gap-4 transition-all ${
                  draggedFieldIdx === idx ? "opacity-40 bg-sky-50 border-2 border-dashed border-[#00AEEF]" : ""
                } ${
                  !field.enabled ? "bg-muted/30 opacity-70" : "hover:bg-muted/10"
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {/* Drag Handle */}
                  <div
                    className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-600 p-1 shrink-0"
                    title="Drag to reorder field"
                  >
                    <GripVertical className="h-4 w-4" />
                  </div>

                  {/* Move Up / Move Down Reorder Buttons */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveField(idx, "up")}
                      disabled={idx === 0}
                      className="p-0.5 rounded text-slate-400 hover:text-slate-800 disabled:opacity-20 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Move field up"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveField(idx, "down")}
                      disabled={idx === currentFields.length - 1}
                      className="p-0.5 rounded text-slate-400 hover:text-slate-800 disabled:opacity-20 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Move field down"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Toggle Visibility */}
                  <button
                    onClick={() => handleToggleEnabled(idx)}
                    title={field.enabled ? "Click to hide field" : "Click to show field"}
                    className={`p-1.5 rounded-md transition-colors shrink-0 ${
                      field.enabled
                        ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                        : "text-muted-foreground bg-muted hover:bg-slate-200"
                    }`}
                  >
                    {field.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium text-foreground text-sm">
                      <span className="truncate">{field.label}</span>
                      {field.required && (
                        <span className="text-red-500 font-bold shrink-0" title="Required field">
                          *
                        </span>
                      )}
                      {field.is_custom ? (
                        <Badge className="bg-sky-100 text-sky-700 border-sky-200 text-[10px] font-semibold shrink-0">
                          Custom
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">
                          Standard
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 truncate">
                      <span className="font-mono text-[11px] truncate">{field.key}</span>
                      <span>•</span>
                      <span className="capitalize">{field.type}</span>
                      {field.options && field.options.length > 0 && (
                        <span>({field.options.length} options)</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                  {/* Required Toggle */}
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={() => handleToggleRequired(idx)}
                      className="rounded border-border text-[#00AEEF] focus:ring-[#00AEEF]"
                    />
                    <span>Required</span>
                  </label>

                  {/* Edit button */}
                  <button
                    type="button"
                    onClick={() => openEditFieldModal(idx)}
                    className="text-slate-400 hover:text-[#00AEEF] p-1.5 rounded-md hover:bg-sky-50 transition-colors cursor-pointer"
                    title={`Configure / Edit field "${field.label}"`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                  {/* Delete button (available for all fields in the form) */}
                  <button
                    type="button"
                    onClick={() => handleDeleteField(idx)}
                    className="text-red-500 hover:text-red-700 p-1.5 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                    title={`Delete field "${field.label}" from form`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Live Creation Modal Preview */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-2xs h-fit sticky top-20">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Sparkles className="h-4 w-4 text-[#00AEEF]" />
            <h3 className="text-sm font-bold text-foreground">Live Modal Preview</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-2 mb-4">
            This is how your creation modal will look to normal agents and team members:
          </p>

          <div className="space-y-3.5 bg-muted/20 p-4 rounded-lg border border-border/60">
            {currentFields
              .filter((f) => f.enabled)
              .map((f) => (
                <div key={f.key} className="space-y-1">
                  <label className="block text-xs font-semibold text-foreground">
                    {f.label} {f.required && <span className="text-red-500">*</span>}
                  </label>
                  {f.type === "select" ? (
                    <select
                      disabled
                      className="w-full text-xs px-2.5 py-1.5 rounded-md border border-border bg-card text-muted-foreground"
                    >
                      <option>Select {f.label}...</option>
                      {f.options?.map((opt) => (
                        <option key={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea
                      disabled
                      rows={2}
                      placeholder={f.placeholder || `Enter ${f.label}...`}
                      className="w-full text-xs px-2.5 py-1.5 rounded-md border border-border bg-card text-muted-foreground"
                    />
                  ) : f.type === "checkbox" ? (
                    <div className="flex items-center gap-2">
                      <input type="checkbox" disabled className="rounded border-border" />
                      <span className="text-xs text-muted-foreground">Yes / Enabled</span>
                    </div>
                  ) : f.type === "datetime" ? (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        disabled
                        className="w-full text-xs px-2.5 py-1.5 rounded-md border border-border bg-card text-muted-foreground"
                      />
                      <input
                        type="time"
                        disabled
                        className="w-full text-xs px-2.5 py-1.5 rounded-md border border-border bg-card text-muted-foreground"
                      />
                    </div>
                  ) : (
                    <input
                      type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                      disabled
                      placeholder={f.placeholder || `Enter ${f.label}...`}
                      className="w-full text-xs px-2.5 py-1.5 rounded-md border border-border bg-card text-muted-foreground"
                    />
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Add Custom Field Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Plus className="h-5 w-5 text-[#00AEEF]" />
                <span>Add Custom Field to {activeTab.toUpperCase()}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomField} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase mb-1">
                  Field Label *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lead Source, VIP Customer, Budget Approved"
                  value={newField.label}
                  onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card text-foreground focus:outline-hidden focus:ring-2 focus:ring-[#00AEEF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground uppercase mb-1">
                  Input Type *
                </label>
                <select
                  value={newField.type}
                  onChange={(e) => setNewField({ ...newField, type: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card text-foreground focus:outline-hidden focus:ring-2 focus:ring-[#00AEEF]"
                >
                  <option value="text">Single Line Text</option>
                  <option value="number">Number / Metric</option>
                  <option value="select">Dropdown Select List</option>
                  <option value="date">Date Picker</option>
                  <option value="datetime">Date & Time (Separated)</option>
                  <option value="checkbox">Checkbox (True / False)</option>
                  <option value="textarea">Multi-line Text Area</option>
                </select>
              </div>

              {newField.type === "select" && (
                <div className="space-y-2 p-3 bg-muted/40 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <ListOrdered className="h-3.5 w-3.5 text-[#00AEEF]" />
                      <span>Dropdown Choices ({newFieldOptionsList.length})</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      {newFieldOptionsList.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setNewFieldOptionsList(
                              [...newFieldOptionsList].sort((a, b) => a.localeCompare(b))
                            )
                          }
                          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-[#00AEEF] px-1.5 py-0.5 rounded border border-border bg-card shadow-2xs"
                        >
                          <ArrowUpDown className="h-3 w-3" />
                          <span>Sort A-Z</span>
                        </button>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        Reorder with arrows / drag
                      </span>
                    </div>
                  </div>

                  {newFieldOptionsList.length > 0 ? (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
                      {newFieldOptionsList.map((opt, idx) => (
                        <div
                          key={idx}
                          draggable
                          onDragStart={(e) => {
                            setDraggedNewOptionIdx(idx);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (draggedNewOptionIdx === null || draggedNewOptionIdx === idx) return;
                            const updated = [...newFieldOptionsList];
                            const item = updated[draggedNewOptionIdx];
                            updated.splice(draggedNewOptionIdx, 1);
                            updated.splice(idx, 0, item);
                            setDraggedNewOptionIdx(idx);
                            setNewFieldOptionsList(updated);
                          }}
                          onDragEnd={() => setDraggedNewOptionIdx(null)}
                          className={`flex items-center gap-1.5 bg-card p-1.5 rounded border ${
                            draggedNewOptionIdx === idx
                              ? "opacity-60 border-[#00AEEF] ring-1 ring-[#00AEEF]"
                              : "border-border shadow-2xs"
                          }`}
                        >
                          <div className="cursor-grab text-muted-foreground hover:text-foreground p-0.5 shrink-0">
                            <GripVertical className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono w-4 text-right shrink-0 select-none">
                            {idx + 1}.
                          </span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const updated = [...newFieldOptionsList];
                              updated[idx] = e.target.value;
                              setNewFieldOptionsList(updated);
                            }}
                            className="flex-1 text-xs bg-transparent outline-none border-b border-transparent focus:border-[#00AEEF] px-1 py-0.5 text-foreground"
                          />
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (idx <= 0) return;
                                const updated = [...newFieldOptionsList];
                                const temp = updated[idx];
                                updated[idx] = updated[idx - 1];
                                updated[idx - 1] = temp;
                                setNewFieldOptionsList(updated);
                              }}
                              disabled={idx === 0}
                              className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                              title="Move up"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (idx >= newFieldOptionsList.length - 1) return;
                                const updated = [...newFieldOptionsList];
                                const temp = updated[idx];
                                updated[idx] = updated[idx + 1];
                                updated[idx + 1] = temp;
                                setNewFieldOptionsList(updated);
                              }}
                              disabled={idx === newFieldOptionsList.length - 1}
                              className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                              title="Move down"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setNewFieldOptionsList(newFieldOptionsList.filter((_, i) => i !== idx))
                            }
                            className="text-muted-foreground hover:text-red-500 p-1 rounded transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic p-2 text-center bg-card rounded border border-dashed border-border">
                      No options added yet. Add choices below.
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="text"
                      placeholder="Type option name..."
                      value={newFieldOptionInput}
                      onChange={(e) => setNewFieldOptionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (
                            newFieldOptionInput.trim() &&
                            !newFieldOptionsList.includes(newFieldOptionInput.trim())
                          ) {
                            setNewFieldOptionsList([
                              ...newFieldOptionsList,
                              newFieldOptionInput.trim(),
                            ]);
                            setNewFieldOptionInput("");
                          }
                        }
                      }}
                      className="h-8 text-xs flex-1 px-2.5 rounded-md border border-border bg-card text-foreground outline-none focus:border-[#00AEEF]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          newFieldOptionInput.trim() &&
                          !newFieldOptionsList.includes(newFieldOptionInput.trim())
                        ) {
                          setNewFieldOptionsList([
                            ...newFieldOptionsList,
                            newFieldOptionInput.trim(),
                          ]);
                          setNewFieldOptionInput("");
                        }
                      }}
                      disabled={!newFieldOptionInput.trim()}
                      className="h-8 px-2.5 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-md flex items-center gap-1 shrink-0 disabled:opacity-40"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          newFieldOptionInput.trim() &&
                          !newFieldOptionsList.includes(newFieldOptionInput.trim())
                        ) {
                          setNewFieldOptionsList([
                            newFieldOptionInput.trim(),
                            ...newFieldOptionsList,
                          ]);
                          setNewFieldOptionInput("");
                        }
                      }}
                      disabled={!newFieldOptionInput.trim()}
                      className="h-8 px-2 text-xs border border-border bg-card text-foreground hover:bg-muted rounded-md shrink-0 disabled:opacity-40"
                      title="Add to top"
                    >
                      <span>+ Top</span>
                    </button>
                  </div>

                  <details className="text-[11px] text-muted-foreground cursor-pointer pt-1">
                    <summary className="hover:text-foreground font-medium">
                      Or paste comma-separated choices
                    </summary>
                    <div className="mt-1 flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="e.g. Option 1, Option 2, Option 3"
                        value={newField.optionsStr}
                        onChange={(e) => setNewField({ ...newField, optionsStr: e.target.value })}
                        className="h-7 text-xs flex-1 px-2 rounded border border-border bg-card text-foreground"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const parsed = newField.optionsStr
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean);
                          if (parsed.length > 0) {
                            setNewFieldOptionsList([...newFieldOptionsList, ...parsed]);
                            setNewField({ ...newField, optionsStr: "" });
                          }
                        }}
                        disabled={!newField.optionsStr.trim()}
                        className="h-7 px-2 text-[10px] rounded border border-border bg-card hover:bg-muted shrink-0 disabled:opacity-40"
                      >
                        Import
                      </button>
                    </div>
                  </details>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-foreground uppercase mb-1">
                  Placeholder Text (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Select or type here..."
                  value={newField.placeholder}
                  onChange={(e) => setNewField({ ...newField, placeholder: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card text-foreground focus:outline-hidden focus:ring-2 focus:ring-[#00AEEF]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="req_cb"
                  checked={newField.required}
                  onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                  className="rounded border-border text-[#00AEEF] focus:ring-[#00AEEF]"
                />
                <label htmlFor="req_cb" className="text-sm font-medium text-foreground cursor-pointer">
                  Make this field mandatory (Required)
                </label>
              </div>

              <div className="flex items-center justify-end pt-4 border-t border-border">
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-[#00AEEF] hover:bg-[#0098d4] text-white transition-all shadow-xs"
                >
                  Add Field
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Field Configuration Modal */}
      {editingFieldIdx !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setEditingFieldIdx(null)}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-[#00AEEF]" />
                <h3 className="text-base font-bold text-foreground">
                  Configure Field: {currentFields[editingFieldIdx]?.label}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingFieldIdx(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase mb-1">
                  Field Label
                </label>
                <input
                  type="text"
                  value={editingFieldLabel}
                  onChange={(e) => setEditingFieldLabel(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card text-foreground focus:outline-hidden focus:ring-2 focus:ring-[#00AEEF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground uppercase mb-1">
                  Placeholder Text
                </label>
                <input
                  type="text"
                  value={editingFieldPlaceholder}
                  onChange={(e) => setEditingFieldPlaceholder(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card text-foreground focus:outline-hidden focus:ring-2 focus:ring-[#00AEEF]"
                />
              </div>

              {/* Dropdown Options Reordering */}
              {(currentFields[editingFieldIdx]?.type === "select" ||
                editingFieldOptions.length > 0) && (
                <div className="space-y-2 p-3 bg-muted/40 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <ListOrdered className="h-3.5 w-3.5 text-[#00AEEF]" />
                      <span>Dropdown Choices ({editingFieldOptions.length})</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      {editingFieldOptions.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditingFieldOptions(
                              [...editingFieldOptions].sort((a, b) => a.localeCompare(b))
                            )
                          }
                          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-[#00AEEF] px-1.5 py-0.5 rounded border border-border bg-card shadow-2xs"
                        >
                          <ArrowUpDown className="h-3 w-3" />
                          <span>Sort A-Z</span>
                        </button>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        Reorder with arrows / drag
                      </span>
                    </div>
                  </div>

                  {editingFieldOptions.length > 0 ? (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                      {editingFieldOptions.map((opt, idx) => (
                        <div
                          key={idx}
                          draggable
                          onDragStart={(e) => {
                            setDraggedEditOptionIdx(idx);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (draggedEditOptionIdx === null || draggedEditOptionIdx === idx) return;
                            const updated = [...editingFieldOptions];
                            const item = updated[draggedEditOptionIdx];
                            updated.splice(draggedEditOptionIdx, 1);
                            updated.splice(idx, 0, item);
                            setDraggedEditOptionIdx(idx);
                            setEditingFieldOptions(updated);
                          }}
                          onDragEnd={() => setDraggedEditOptionIdx(null)}
                          className={`flex items-center gap-1.5 bg-card p-1.5 rounded border ${
                            draggedEditOptionIdx === idx
                              ? "opacity-60 border-[#00AEEF] ring-1 ring-[#00AEEF]"
                              : "border-border shadow-2xs"
                          }`}
                        >
                          <div className="cursor-grab text-muted-foreground hover:text-foreground p-0.5 shrink-0">
                            <GripVertical className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono w-4 text-right shrink-0 select-none">
                            {idx + 1}.
                          </span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const updated = [...editingFieldOptions];
                              updated[idx] = e.target.value;
                              setEditingFieldOptions(updated);
                            }}
                            className="flex-1 text-xs bg-transparent outline-none border-b border-transparent focus:border-[#00AEEF] px-1 py-0.5 text-foreground"
                          />
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (idx <= 0) return;
                                const updated = [...editingFieldOptions];
                                const temp = updated[idx];
                                updated[idx] = updated[idx - 1];
                                updated[idx - 1] = temp;
                                setEditingFieldOptions(updated);
                              }}
                              disabled={idx === 0}
                              className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                              title="Move up"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (idx >= editingFieldOptions.length - 1) return;
                                const updated = [...editingFieldOptions];
                                const temp = updated[idx];
                                updated[idx] = updated[idx + 1];
                                updated[idx + 1] = temp;
                                setEditingFieldOptions(updated);
                              }}
                              disabled={idx === editingFieldOptions.length - 1}
                              className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                              title="Move down"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setEditingFieldOptions(
                                editingFieldOptions.filter((_, i) => i !== idx)
                              )
                            }
                            className="text-muted-foreground hover:text-red-500 p-1 rounded transition-colors"
                            title="Remove option"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic p-2 text-center bg-card rounded border border-dashed border-border">
                      No options. Add options below.
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="text"
                      placeholder="Type option name..."
                      value={newEditOptionText}
                      onChange={(e) => setNewEditOptionText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (
                            newEditOptionText.trim() &&
                            !editingFieldOptions.includes(newEditOptionText.trim())
                          ) {
                            setEditingFieldOptions([
                              ...editingFieldOptions,
                              newEditOptionText.trim(),
                            ]);
                            setNewEditOptionText("");
                          }
                        }
                      }}
                      className="h-8 text-xs flex-1 px-2.5 rounded-md border border-border bg-card text-foreground outline-none focus:border-[#00AEEF]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          newEditOptionText.trim() &&
                          !editingFieldOptions.includes(newEditOptionText.trim())
                        ) {
                          setEditingFieldOptions([
                            ...editingFieldOptions,
                            newEditOptionText.trim(),
                          ]);
                          setNewEditOptionText("");
                        }
                      }}
                      disabled={!newEditOptionText.trim()}
                      className="h-8 px-2.5 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-md flex items-center gap-1 shrink-0 disabled:opacity-40"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          newEditOptionText.trim() &&
                          !editingFieldOptions.includes(newEditOptionText.trim())
                        ) {
                          setEditingFieldOptions([
                            newEditOptionText.trim(),
                            ...editingFieldOptions,
                          ]);
                          setNewEditOptionText("");
                        }
                      }}
                      disabled={!newEditOptionText.trim()}
                      className="h-8 px-2 text-xs border border-border bg-card text-foreground hover:bg-muted rounded-md shrink-0 disabled:opacity-40"
                      title="Add to top"
                    >
                      <span>+ Top</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setEditingFieldIdx(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-border text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveFieldEdit}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#00AEEF] hover:bg-[#0098d4] text-white shadow-xs"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
