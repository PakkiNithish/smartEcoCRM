"use client";

import React from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActionMenuItem {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: "default" | "destructive";
}

interface TableActionMenuProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  items: ActionMenuItem[];
  triggerClassName?: string;
  menuWidth?: number;
}

export function TableActionMenu({
  isOpen,
  onOpenChange,
  items,
  triggerClassName,
  menuWidth = 144,
}: TableActionMenuProps) {
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);
  const [coords, setCoords] = React.useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = React.useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    // If trigger is scrolled out of viewport, close menu
    if (
      rect.bottom < 0 ||
      rect.top > window.innerHeight ||
      rect.right < 0 ||
      rect.left > window.innerWidth
    ) {
      onOpenChange(false);
      return;
    }

    const estimatedHeight = items.length * 34 + 10;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Determine vertical placement: open above if space below is limited
    let top: number;
    if (spaceBelow < estimatedHeight + 8 && spaceAbove > estimatedHeight) {
      top = rect.top - estimatedHeight - 4;
    } else {
      top = rect.bottom + 4;
    }

    // Determine horizontal placement: align right edge with trigger, unless clipping left
    let left = rect.right - menuWidth;
    if (left < 8) {
      left = Math.max(8, rect.left);
    }
    // Prevent clipping right edge
    if (left + menuWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - menuWidth - 8);
    }

    setCoords({ top, left });
  }, [items.length, menuWidth, onOpenChange]);

  React.useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    function handleScroll(e: Event) {
      // Reposition on any container scroll
      updatePosition();
    }

    function handleResize() {
      updatePosition();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    }

    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      onOpenChange(false);
    }

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [isOpen, updatePosition, onOpenChange]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(!isOpen);
        }}
        className={cn(
          "p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-1 focus:ring-[#00AEEF]",
          isOpen && "bg-slate-100 text-slate-700",
          triggerClassName
        )}
        title="Actions"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen &&
        mounted &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${menuWidth}px`,
            }}
            className="z-50 rounded-md border border-border bg-card py-1 shadow-lg ring-1 ring-black/5 focus:outline-none animate-in fade-in-80 zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((item, idx) => {
              const Icon = item.icon;
              const isDestructive = item.variant === "destructive";
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenChange(false);
                    item.onClick();
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors",
                    isDestructive
                      ? "text-red-600 hover:bg-red-50 hover:text-red-700"
                      : "text-foreground hover:bg-slate-50"
                  )}
                >
                  {Icon && (
                    <Icon
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        isDestructive ? "text-red-500" : "text-slate-400"
                      )}
                    />
                  )}
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
