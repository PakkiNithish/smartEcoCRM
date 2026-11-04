"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Settings,
  EyeOff,
  Trash2,
  Check,
  AlertCircle,
  Pencil,
  X,
  Plus,
  ListOrdered,
  ChevronUp,
  ChevronDown,
  GripVertical,
  ArrowUpDown,
} from "lucide-react";
import { FormFieldConfig } from "@/types/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface FormFieldUpdates {
  label?: string;
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

interface FormFieldWrapperProps {
  field?: FormFieldConfig;
  label?: string;
  required?: boolean;
  isCustom?: boolean;
  fieldKey: string;
  error?: string;
  options?: string[];
  placeholder?: string;
  onToggleRequired?: (key: string) => void;
  onRemoveField?: (key: string) => void;
  onDeleteField?: (key: string) => void;
  onUpdateField?: (key: string, updates: FormFieldUpdates) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormFieldWrapper({
  field,
  label,
  required,
  isCustom,
  fieldKey,
  error,
  options,
  placeholder,
  onToggleRequired,
  onRemoveField,
  onDeleteField,
  onUpdateField,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  children,
  className = "",
}: FormFieldWrapperProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayLabel = label || field?.label || fieldKey;
  const isRequired = required ?? field?.required ?? false;
  const custom = isCustom ?? field?.is_custom ?? false;
  const currentOptions = useMemo(() => {
    return options || field?.options || [];
  }, [options, field?.options]);

  // Edit modal state
  const [editLabel, setEditLabel] = useState(displayLabel);
  const [editPlaceholder, setEditPlaceholder] = useState(
    placeholder || field?.placeholder || ""
  );
  const [editRequired, setEditRequired] = useState(isRequired);
  const [editOptions, setEditOptions] = useState<string[]>(currentOptions);
  const [newOptionText, setNewOptionText] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync modal state when opening
  useEffect(() => {
    if (editModalOpen) {
      setEditLabel(displayLabel);
      setEditPlaceholder(placeholder || field?.placeholder || "");
      setEditRequired(isRequired);
      setEditOptions(currentOptions);
      setNewOptionText("");
    }
  }, [editModalOpen, displayLabel, placeholder, field, isRequired, currentOptions]);

  // Click outside listener for settings gear menu
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  const [draggedOptionIndex, setDraggedOptionIndex] = useState<number | null>(null);

  const handleAddOption = (atBeginning: boolean = false) => {
    const trimmed = newOptionText.trim();
    if (!trimmed) return;
    if (!editOptions.includes(trimmed)) {
      if (atBeginning) {
        setEditOptions([trimmed, ...editOptions]);
      } else {
        setEditOptions([...editOptions, trimmed]);
      }
    }
    setNewOptionText("");
  };

  const handleRemoveOption = (indexToRemove: number) => {
    setEditOptions(editOptions.filter((_, idx) => idx !== indexToRemove));
  };

  const handleOptionChange = (index: number, val: string) => {
    const updated = [...editOptions];
    updated[index] = val;
    setEditOptions(updated);
  };

  const handleMoveOptionUp = (index: number) => {
    if (index <= 0) return;
    const updated = [...editOptions];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setEditOptions(updated);
  };

  const handleMoveOptionDown = (index: number) => {
    if (index >= editOptions.length - 1) return;
    const updated = [...editOptions];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setEditOptions(updated);
  };

  const handleSortOptionsAZ = () => {
    const sorted = [...editOptions].sort((a, b) => a.localeCompare(b));
    setEditOptions(sorted);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedOptionIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedOptionIndex === null || draggedOptionIndex === index) return;
    const updated = [...editOptions];
    const draggedItem = updated[draggedOptionIndex];
    updated.splice(draggedOptionIndex, 1);
    updated.splice(index, 0, draggedItem);
    setDraggedOptionIndex(index);
    setEditOptions(updated);
  };

  const handleDragEnd = () => {
    setDraggedOptionIndex(null);
  };

  const handleSaveFieldChanges = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const finalLabel = editLabel.trim() || displayLabel;
    const finalOptions = editOptions.map((o) => o.trim()).filter(Boolean);

    if (onUpdateField) {
      onUpdateField(fieldKey, {
        label: finalLabel,
        options: finalOptions,
        required: editRequired,
        placeholder: editPlaceholder.trim() || undefined,
      });
    }

    if (onToggleRequired && editRequired !== isRequired) {
      onToggleRequired(fieldKey);
    }

    setEditModalOpen(false);
  };

  return (
    <div className={`group/field relative space-y-1 ${className}`}>
      {/* Field Label Header with Inline Edit Trigger */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-normal text-slate-500 tracking-wide select-none">
            {displayLabel}
            {isRequired && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <button
            type="button"
            onClick={() => setEditModalOpen(true)}
            className="opacity-0 group-hover/field:opacity-100 hover:text-[#00AEEF] text-slate-400 p-0.5 rounded transition-all cursor-pointer"
            title={`Edit ${displayLabel} name and options`}
          >
            <Pencil className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Field Input + Gear Icon Action */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">{children}</div>

        {/* Gear / Settings Menu Trigger */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            title="Configure field"
            className={`h-8 w-8 flex items-center justify-center rounded-md border border-transparent transition-all ${
              menuOpen
                ? "bg-slate-200 text-slate-800 border-slate-300"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Settings className="h-4 w-4" />
          </button>

          {/* Settings Popover Dropdown */}
          {menuOpen && (
            <div className="absolute right-0 top-9 z-50 w-56 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 text-xs text-slate-700">
              <div className="px-2 py-1 font-semibold text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                Field Settings
              </div>

              {/* Toggle Mandatory */}
              {onToggleRequired && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleRequired(fieldKey);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-100 text-left transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <span>Required field</span>
                  </span>
                  <div
                    className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                      isRequired
                        ? "bg-[#00AEEF] border-[#00AEEF] text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isRequired && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </button>
              )}

              {/* Reorder Field */}
              {(onMoveUp || onMoveDown) && (
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-50 text-slate-700 transition-colors">
                  <span className="flex items-center gap-1.5 font-medium">
                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                    <span>Reorder field</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={!canMoveUp || !onMoveUp}
                      onClick={() => {
                        onMoveUp?.();
                        setMenuOpen(false);
                      }}
                      className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-20 transition-colors cursor-pointer"
                      title="Move up"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={!canMoveDown || !onMoveDown}
                      onClick={() => {
                        onMoveDown?.();
                        setMenuOpen(false);
                      }}
                      className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-20 transition-colors cursor-pointer"
                      title="Move down"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Edit Field Name & Dropdown Options */}
              <button
                type="button"
                onClick={() => {
                  setEditModalOpen(true);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-sky-50 text-sky-700 text-left transition-colors font-medium cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5 text-[#00AEEF] shrink-0" />
                <span>Configure / Edit field</span>
              </button>

              {/* Hide / Remove Field */}
              {onRemoveField && (
                <button
                  type="button"
                  onClick={() => {
                    onRemoveField(fieldKey);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-amber-50 text-amber-700 text-left transition-colors cursor-pointer"
                >
                  <EyeOff className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span>Remove from form</span>
                </button>
              )}

              {/* Delete Field (Available for all fields) */}
              {onDeleteField && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete field "${displayLabel}" from this form?`)) {
                      onDeleteField(fieldKey);
                    }
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-red-50 text-red-600 text-left transition-colors border-t border-slate-100 mt-1 pt-1 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  <span>Delete field</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Field Validation Error */}
      {error && (
        <p className="text-[11px] text-red-600 font-medium flex items-center gap-1 mt-0.5 animate-in fade-in">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {/* Edit Field Modal (Portal to body for clean stacking context) */}
      {mounted &&
        editModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in"
            onClick={(e) => {
              e.stopPropagation();
              setEditModalOpen(false);
            }}
          >
            <div
              className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 space-y-4 max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with Title and close '✕' button (no secondary cancel button) */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100 shrink-0">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Settings className="h-4 w-4 text-[#00AEEF]" />
                    <span>Configure Field: {displayLabel}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Customize field name, required status, and dropdown choices.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 rounded-md p-1 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Body - Scrollable */}
              <div className="space-y-4 overflow-y-auto pr-1 flex-1 min-h-0 text-xs">
                {/* Field Name / Label */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                    Field Name / Label <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    placeholder="e.g., Organization Name, Primary Phone"
                    className="h-9 text-sm"
                  />
                  <p className="text-[11px] text-slate-400">
                    This name will appear as the label in forms, tables, and detail views.
                  </p>
                </div>

                {/* Placeholder / Hint */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                    Placeholder / Hint Text
                  </label>
                  <Input
                    value={editPlaceholder}
                    onChange={(e) => setEditPlaceholder(e.target.value)}
                    placeholder="e.g., Enter description or value..."
                    className="h-9 text-sm"
                  />
                </div>

                {/* Required Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div>
                    <div className="font-semibold text-slate-800 text-xs">
                      Mandatory / Required Field
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Users must provide a value before saving this form.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditRequired(!editRequired)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      editRequired ? "bg-[#00AEEF]" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        editRequired ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Dropdown Options Manager */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <ListOrdered className="h-3.5 w-3.5 text-[#00AEEF]" />
                      <span>Dropdown Options ({editOptions.length})</span>
                    </label>
                    <div className="flex items-center gap-2">
                      {editOptions.length > 1 && (
                        <button
                          type="button"
                          onClick={handleSortOptionsAZ}
                          className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-[#00AEEF] px-2 py-0.5 rounded border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                          title="Sort options alphabetically (A to Z)"
                        >
                          <ArrowUpDown className="h-3 w-3" />
                          <span>Sort A-Z</span>
                        </button>
                      )}
                      <span className="text-[11px] text-slate-400">
                        Drag or use arrows to reorder
                      </span>
                    </div>
                  </div>

                  {/* Existing Options List */}
                  {editOptions.length === 0 ? (
                    <div className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center">
                      No dropdown options configured yet. Add options below to turn this into a dropdown.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto p-1 rounded-lg border border-slate-200 bg-slate-50/50">
                      {editOptions.map((opt, idx) => (
                        <div
                          key={idx}
                          draggable
                          onDragStart={(e) => handleDragStart(e, idx)}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDragEnd={handleDragEnd}
                          className={`flex items-center gap-1.5 bg-white p-1.5 rounded border transition-all ${
                            draggedOptionIndex === idx
                              ? "opacity-60 border-[#00AEEF] bg-sky-50 shadow-md ring-1 ring-[#00AEEF]"
                              : "border-slate-200 shadow-2xs hover:border-slate-300"
                          }`}
                        >
                          {/* Drag Handle */}
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
                            onChange={(e) => handleOptionChange(idx, e.target.value)}
                            className="flex-1 text-xs text-slate-800 bg-transparent outline-none border-b border-transparent focus:border-[#00AEEF] px-1 py-0.5"
                            placeholder="Option text..."
                          />

                          {/* Reorder Buttons (Move Up / Move Down) */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveOptionUp(idx)}
                              disabled={idx === 0}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
                              title="Move option up"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveOptionDown(idx)}
                              disabled={idx === editOptions.length - 1}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
                              title="Move option down"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveOption(idx)}
                            className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                            title="Remove this option"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Option Input Row with Add at End & Add at Top */}
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      value={newOptionText}
                      onChange={(e) => setNewOptionText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddOption(false);
                        }
                      }}
                      placeholder="Type new option name and press Enter or Add..."
                      className="h-8 text-xs flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleAddOption(false)}
                      disabled={!newOptionText.trim()}
                      className="h-8 px-3 text-xs bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1 shrink-0"
                      title="Add option to bottom"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddOption(true)}
                      disabled={!newOptionText.trim()}
                      className="h-8 px-2 text-xs border-slate-300 text-slate-600 hover:bg-slate-100 flex items-center gap-1 shrink-0"
                      title="Add option to top of list"
                    >
                      <span>+ Top</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Footer - Single affirmative action: Save Changes (NO secondary cancel button) */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end shrink-0">
                <Button
                  type="button"
                  onClick={handleSaveFieldChanges}
                  className="bg-[#00AEEF] text-white hover:bg-[#009cd6] font-semibold text-xs px-5 py-2 shadow-sm"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
