"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  ListFilter,
  Sparkles,
  X,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Trash2,
  ArrowUpDown,
  ListOrdered,
} from "lucide-react";
import { FormFieldConfig } from "@/types/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FormBuilderActionsProps {
  hiddenFields?: FormFieldConfig[];
  availableFields?: FormFieldConfig[];
  onAddField: (key: string) => void;
  onCreateCustomField: (field: FormFieldConfig) => void;
  onDeleteSection?: () => void;
  entityName?: string;
  isViewMode?: boolean;
  onEnterEditMode?: () => void;
}

export function FormBuilderActions({
  hiddenFields = [],
  availableFields,
  onAddField,
  onCreateCustomField,
  onDeleteSection,
  entityName = "entity",
  isViewMode = false,
  onEnterEditMode,
}: FormBuilderActionsProps) {
  const [mounted, setMounted] = useState(false);
  const [selectMenuOpen, setSelectMenuOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // New field state
  const [label, setLabel] = useState("");
  const [type, setType] = useState<FormFieldConfig["type"]>("text");
  const [required, setRequired] = useState(false);
  const [placeholder, setPlaceholder] = useState("");
  const [optionsStr, setOptionsStr] = useState("");
  const [optionsList, setOptionsList] = useState<string[]>([]);
  const [newOptText, setNewOptText] = useState("");
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const selectRef = useRef<HTMLDivElement>(null);

  const handleAddOpt = (atBeginning: boolean = false) => {
    const trimmed = newOptText.trim();
    if (!trimmed) return;
    if (!optionsList.includes(trimmed)) {
      if (atBeginning) {
        setOptionsList([trimmed, ...optionsList]);
      } else {
        setOptionsList([...optionsList, trimmed]);
      }
    }
    setNewOptText("");
    if (formError) setFormError(null);
  };

  const handleRemoveOpt = (index: number) => {
    setOptionsList(optionsList.filter((_, i) => i !== index));
  };

  const handleEditOpt = (index: number, val: string) => {
    const updated = [...optionsList];
    updated[index] = val;
    setOptionsList(updated);
  };

  const handleMoveOptUp = (index: number) => {
    if (index <= 0) return;
    const updated = [...optionsList];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setOptionsList(updated);
  };

  const handleMoveOptDown = (index: number) => {
    if (index >= optionsList.length - 1) return;
    const updated = [...optionsList];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setOptionsList(updated);
  };

  const handleSortAZ = () => {
    setOptionsList([...optionsList].sort((a, b) => a.localeCompare(b)));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedIdx === null || draggedIdx === index) return;
    const updated = [...optionsList];
    const draggedItem = updated[draggedIdx];
    updated.splice(draggedIdx, 1);
    updated.splice(index, 0, draggedItem);
    setDraggedIdx(index);
    setOptionsList(updated);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (selectRef.current && !selectRef.current.contains(e.target as Node)) {
        setSelectMenuOpen(false);
      }
    }
    if (selectMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectMenuOpen]);

  // Use availableFields if provided, otherwise fallback to hiddenFields
  const fieldsForSelection = availableFields ?? hiddenFields;

  function handleCreateSubmit(e?: React.SyntheticEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setFormError(null);

    if (!label.trim()) {
      setFormError("Field label is required");
      return;
    }

    let finalOptions: string[] | undefined = undefined;
    if (type === "select") {
      let candidate = optionsList.map((s) => s.trim()).filter(Boolean);
      if (candidate.length === 0 && optionsStr.trim()) {
        candidate = optionsStr.split(",").map((s) => s.trim()).filter(Boolean);
      }
      if (candidate.length === 0) {
        setFormError("Please add at least one dropdown option");
        return;
      }
      finalOptions = candidate;
    }

    const key = `cf_${label.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now().toString().slice(-4)}`;

    const newField: FormFieldConfig = {
      key,
      label: label.trim(),
      type,
      required,
      enabled: true,
      is_custom: true,
      placeholder: placeholder.trim() || undefined,
      options: finalOptions,
    };

    if (isViewMode && onEnterEditMode) {
      onEnterEditMode();
    }
    onCreateCustomField(newField);
    setLabel("");
    setType("text");
    setRequired(false);
    setPlaceholder("");
    setOptionsStr("");
    setOptionsList([]);
    setNewOptText("");
    setFormError(null);
    setCreateModalOpen(false);
  }

  const modalContent = createModalOpen && (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in"
      onClick={(e) => {
        e.stopPropagation();
        setCreateModalOpen(false);
      }}
    >
      <div
        className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-4 animate-in zoom-in-95 text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#00AEEF]/10 text-[#00AEEF]">
              <Sparkles className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Create Field for {entityName}
            </h3>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCreateModalOpen(false);
            }}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {formError && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{formError}</span>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Field Label <span className="text-red-500">*</span>
            </label>
            <Input
              autoFocus
              placeholder="e.g. Skype ID, Passport No, Region"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                if (formError) setFormError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCreateSubmit();
                }
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Field Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs sm:text-sm shadow-2xs focus:outline-none focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF]"
            >
              <option value="text">String / Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="datetime">Date & Time (Separated)</option>
              <option value="select">List / Dropdown</option>
              <option value="checkbox">Checkbox (Yes/No)</option>
              <option value="textarea">Multi-line Text</option>
            </select>
          </div>

          {type === "select" && (
            <div className="space-y-2 p-3 bg-slate-50/70 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ListOrdered className="h-3.5 w-3.5 text-[#00AEEF]" />
                  <span>Dropdown Options ({optionsList.length})</span>
                </label>
                <div className="flex items-center gap-1.5">
                  {optionsList.length > 1 && (
                    <button
                      type="button"
                      onClick={handleSortAZ}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-[#00AEEF] px-1.5 py-0.5 rounded border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                      title="Sort A to Z"
                    >
                      <ArrowUpDown className="h-3 w-3" />
                      <span>Sort A-Z</span>
                    </button>
                  )}
                  <span className="text-[10px] text-slate-400">
                    Drag or use arrows to reorder
                  </span>
                </div>
              </div>

              {/* Options Items */}
              {optionsList.length > 0 ? (
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
                  {optionsList.map((opt, idx) => (
                    <div
                      key={idx}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-1.5 bg-white p-1.5 rounded border transition-all ${
                        draggedIdx === idx
                          ? "opacity-60 border-[#00AEEF] bg-sky-50 shadow-md ring-1 ring-[#00AEEF]"
                          : "border-slate-200 shadow-2xs hover:border-slate-300"
                      }`}
                    >
                      <div
                        className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-600 p-0.5 rounded shrink-0 select-none"
                        title="Drag to reorder"
                      >
                        <GripVertical className="h-3.5 w-3.5" />
                      </div>

                      <span className="text-[10px] text-slate-400 font-mono w-4 text-right shrink-0 select-none">
                        {idx + 1}.
                      </span>

                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => handleEditOpt(idx, e.target.value)}
                        className="flex-1 text-xs text-slate-800 bg-transparent outline-none border-b border-transparent focus:border-[#00AEEF] px-1 py-0.5"
                        placeholder="Option name..."
                      />

                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveOptUp(idx)}
                          disabled={idx === 0}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
                          title="Move up"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveOptDown(idx)}
                          disabled={idx === optionsList.length - 1}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
                          title="Move down"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveOpt(idx)}
                        className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                        title="Remove option"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic p-2 text-center bg-white rounded border border-dashed border-slate-200">
                  No options added yet. Add choices below.
                </div>
              )}

              {/* Add Option Row */}
              <div className="flex items-center gap-1.5 pt-1">
                <Input
                  placeholder="Type new option name..."
                  value={newOptText}
                  onChange={(e) => setNewOptText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddOpt(false);
                    }
                  }}
                  className="h-8 text-xs flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleAddOpt(false)}
                  disabled={!newOptText.trim()}
                  className="h-8 px-2.5 text-xs bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1 shrink-0"
                  title="Add to bottom"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddOpt(true)}
                  disabled={!newOptText.trim()}
                  className="h-8 px-2 text-xs border-slate-300 text-slate-600 hover:bg-slate-100 flex items-center gap-1 shrink-0"
                  title="Add to top"
                >
                  <span>+ Top</span>
                </Button>
              </div>

              {/* Quick comma-separated import */}
              <div className="pt-1">
                <details className="text-[11px] text-slate-500 cursor-pointer">
                  <summary className="hover:text-slate-800 font-medium">Or paste comma-separated choices</summary>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Input
                      placeholder="e.g. Bronze, Silver, Gold, Platinum"
                      value={optionsStr}
                      onChange={(e) => setOptionsStr(e.target.value)}
                      className="h-7 text-xs flex-1 bg-white"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const parsed = optionsStr.split(",").map((s) => s.trim()).filter(Boolean);
                        if (parsed.length > 0) {
                          setOptionsList([...optionsList, ...parsed]);
                          setOptionsStr("");
                          if (formError) setFormError(null);
                        }
                      }}
                      disabled={!optionsStr.trim()}
                      className="h-7 px-2 text-[10px] shrink-0"
                    >
                      Import
                    </Button>
                  </div>
                </details>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Placeholder (Optional)
            </label>
            <Input
              placeholder="e.g. Enter details..."
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCreateSubmit();
                }
              }}
            />
          </div>

          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="rounded border-slate-300 text-[#00AEEF] focus:ring-[#00AEEF]"
              />
              <span className="text-xs font-medium text-slate-700">
                Mandatory / Required field
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="bitrix"
              onClick={handleCreateSubmit}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add to Form</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
      {/* Left Action Links: Select field ⌵ and Create field (Bitrix24 Signature Layout) */}
      <div className="flex items-center gap-4 text-xs font-normal">
        {/* Select Field Dropdown */}
        <div className="relative" ref={selectRef}>
          <button
            type="button"
            onClick={() => {
              if (isViewMode && onEnterEditMode) {
                onEnterEditMode();
              }
              setSelectMenuOpen(!selectMenuOpen);
            }}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer select-none group"
          >
            <span className="border-b border-dashed border-slate-300 group-hover:border-slate-500 pb-0.5">
              Select field
            </span>
            <span className="text-[10px] text-slate-400">⌵</span>
          </button>

          {/* Selectable Fields Popover */}
          {selectMenuOpen && (
            <div className="absolute left-0 bottom-7 sm:bottom-auto sm:top-7 z-50 w-64 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 text-xs text-slate-700">
              <div className="px-2 py-1 font-semibold text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                Add Field to Section
              </div>
              {fieldsForSelection.length === 0 ? (
                <div className="p-3 text-center text-slate-400 text-xs italic">
                  All available fields are currently visible in this section.
                </div>
              ) : (
                <div className="space-y-0.5">
                  {fieldsForSelection.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => {
                        if (isViewMode && onEnterEditMode) {
                          onEnterEditMode();
                        }
                        onAddField(f.key);
                        setSelectMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-slate-50 text-left transition-colors group cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">{f.label}</span>
                        <span className="text-[10px] text-slate-400">
                          {f.type} {f.is_custom ? "• custom" : "• standard"}
                        </span>
                      </div>
                      <Plus className="h-3.5 w-3.5 text-[#1c9be8] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Create Field Link */}
        <button
          type="button"
          onClick={() => {
            if (isViewMode && onEnterEditMode) {
              onEnterEditMode();
            }
            setFormError(null);
            setCreateModalOpen(true);
          }}
          className="text-slate-500 hover:text-slate-800 transition-colors cursor-pointer select-none"
        >
          <span className="border-b border-dashed border-slate-300 hover:border-slate-500 pb-0.5">
            Create field
          </span>
        </button>
      </div>

      {/* Right Action Link: Delete section */}
      {onDeleteSection && (
        <button
          type="button"
          onClick={() => {
            if (confirm("Delete this section and remove its fields from view?")) {
              onDeleteSection();
            }
          }}
          className="text-xs text-slate-400 hover:text-red-500 transition-colors cursor-pointer select-none"
        >
          <span className="border-b border-dashed border-slate-300 hover:border-red-400 pb-0.5">
            Delete section
          </span>
        </button>
      )}

      {/* Portal modal to document.body */}
      {mounted && modalContent && createPortal(modalContent, document.body)}
    </div>
  );
}
