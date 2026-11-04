"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Compass,
  Check,
  CheckCircle2,
  Clock,
  Sparkles,
  Calendar,
  Building2,
  User as UserIcon,
  Briefcase,
  Activity,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerJourneyHoverCardProps {
  stage?: string | null;
  entityType: "company" | "contact";
  name: string;
  dealsCount?: number;
  activitiesCount?: number;
  responsibleName?: string;
  createdAt?: string;
  onStageChange?: (newStage: string) => void | Promise<void>;
}

const COMPANY_JOURNEY_STAGES = [
  { name: "Not Contacted", label: "Not Contacted" },
  { name: "Contacted (LinkedIn & Email )", label: "Contacted" },
  { name: "Responded", label: "Responded" },
  { name: "Meeting Scheduled & Discussion", label: "Meeting & Discussion" },
  { name: "Proposal Shared", label: "Proposal Shared" },
  { name: "Negotiation", label: "Negotiation" },
  { name: "Deal Won", label: "Deal Won" },
];

const CONTACT_JOURNEY_STAGES = [
  { name: "Not Contacted", label: "Not Contacted" },
  { name: "Contacted (LinkedIn & Email )", label: "Contacted" },
  { name: "Follow-up Required", label: "Follow-up Required" },
  { name: "Meeting Scheduled & Discussion", label: "Meeting & Discussion" },
  { name: "Proposal Shared", label: "Proposal Shared" },
  { name: "Negotiation", label: "Negotiation" },
  { name: "Deal Won", label: "Deal Won" },
];

function getStageGuidance(stageName: string, entityType: "company" | "contact"): string {
  const norm = (stageName || "").toLowerCase();
  if (norm.includes("won")) {
    return "Contract closed! Begin onboarding, client welcoming, and service delivery.";
  }
  if (norm.includes("lost") || norm.includes("not interested")) {
    return "Document lost reasons and add to long-term nurture cadence for future outreach.";
  }
  if (norm.includes("negotiation")) {
    return "Finalize commercial terms, address contract questions, and secure executive sign-off.";
  }
  if (norm.includes("proposal")) {
    return "Review proposal with stakeholders, answer technical queries, and establish closing timeline.";
  }
  if (norm.includes("meeting")) {
    return "Conduct discovery session, identify pain points, and map requirements to solutions.";
  }
  if (norm.includes("responded")) {
    return "Prospect expressed interest! Promptly schedule a discovery call or product demo.";
  }
  if (norm.includes("follow-up")) {
    return "Send a timely follow-up message with valuable resources or relevant case studies.";
  }
  if (norm.includes("contacted")) {
    return "Outreach sent. Monitor responses, connect on LinkedIn, and follow up in 2-3 days.";
  }
  return entityType === "company"
    ? "Research decision makers and initiate multi-channel outreach."
    : "Review profile and send personalized introduction via email or LinkedIn.";
}

export function CustomerJourneyHoverCard({
  stage,
  entityType,
  name,
  dealsCount = 0,
  activitiesCount = 0,
  responsibleName = "Unassigned",
  createdAt,
  onStageChange,
}: CustomerJourneyHoverCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placement: "bottom" | "top" }>({
    top: 0,
    left: 0,
    placement: "bottom",
  });

  const triggerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const currentStage = stage?.trim() || "Not Contacted";
  const stagesList = entityType === "company" ? COMPANY_JOURNEY_STAGES : CONTACT_JOURNEY_STAGES;

  const isLost = currentStage.toLowerCase().includes("lost") || currentStage.toLowerCase().includes("not interested");
  const isWon = currentStage.toLowerCase().includes("won");

  // Determine stage index
  let stageIndex = stagesList.findIndex(
    (s) =>
      s.name.toLowerCase() === currentStage.toLowerCase() ||
      s.label.toLowerCase() === currentStage.toLowerCase()
  );

  if (stageIndex === -1) {
    if (isWon) stageIndex = stagesList.length - 1;
    else if (isLost) stageIndex = -1;
    else stageIndex = 0;
  }

  const progressPercent = isLost
    ? 100
    : isWon
    ? 100
    : Math.round(((stageIndex + 1) / stagesList.length) * 100);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    if (
      rect.bottom < 0 ||
      rect.top > window.innerHeight ||
      rect.right < 0 ||
      rect.left > window.innerWidth
    ) {
      setIsOpen(false);
      return;
    }

    const cardWidth = 360;
    const cardHeight = 380;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let placement: "bottom" | "top" = "bottom";
    let top = rect.bottom + 8;

    if (spaceBelow < cardHeight + 10 && spaceAbove > cardHeight) {
      placement = "top";
      top = rect.top - cardHeight - 8;
    }

    // Center horizontally relative to trigger, but constrain within viewport
    let left = rect.left + rect.width / 2 - cardWidth / 2;
    if (left + cardWidth > window.innerWidth - 12) {
      left = window.innerWidth - cardWidth - 12;
    }
    if (left < 12) {
      left = 12;
    }

    setCoords({ top, left, placement });
  }, []);

  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    updatePosition();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 180);
  };

  const handleCardMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handleCardMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  // Stage display badges
  const getBadgeStyle = () => {
    if (isWon) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (isLost) return "bg-rose-50 text-rose-700 border-rose-200";
    if (stageIndex >= 4) return "bg-amber-50 text-amber-700 border-amber-200";
    if (stageIndex >= 2) return "bg-sky-50 text-[#1c9be8] border-sky-200";
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  const getDotColor = () => {
    if (isWon) return "bg-emerald-500 shadow-emerald-500/50";
    if (isLost) return "bg-rose-500 shadow-rose-500/50";
    if (stageIndex >= 4) return "bg-amber-500 shadow-amber-500/50";
    if (stageIndex >= 2) return "bg-sky-500 shadow-sky-500/50";
    return "bg-slate-400";
  };

  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-flex items-center justify-center cursor-pointer select-none"
      >
        <div
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all duration-150 hover:shadow-xs",
            getBadgeStyle()
          )}
        >
          {/* Status Dot / Indicator */}
          <span className={cn("h-2 w-2 rounded-full ring-2 ring-white shrink-0", getDotColor())} />
          <span className="truncate max-w-[100px]">
            {isLost ? "Lost" : isWon ? "Won" : stagesList[stageIndex]?.label || currentStage}
          </span>
          {/* Mini progress dots */}
          {!isLost && (
            <div className="flex items-center gap-0.5 ml-0.5">
              {stagesList.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1 w-1 rounded-full transition-colors",
                    i <= stageIndex ? (isWon ? "bg-emerald-500" : "bg-sky-500") : "bg-slate-200"
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {mounted &&
        isOpen &&
        createPortal(
          <div
            ref={cardRef}
            onMouseEnter={handleCardMouseEnter}
            onMouseLeave={handleCardMouseLeave}
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: "360px",
              zIndex: 9999,
            }}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-xl text-left text-xs animate-in fade-in-0 zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-[#1c9be8] shrink-0 border border-sky-100">
                  <Compass className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Customer Journey • {entityType === "company" ? "Company" : "Contact"}
                  </span>
                  <p className="text-xs font-semibold text-slate-900 truncate" title={name}>
                    {name}
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shrink-0",
                  getBadgeStyle()
                )}
              >
                {isLost ? "Lost" : isWon ? "Deal Won" : `Step ${stageIndex + 1} of ${stagesList.length}`}
              </span>
            </div>

            {/* Progress Bar & Status */}
            <div className="pt-3 pb-2">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="font-semibold text-slate-700">
                  {currentStage}
                </span>
                <span className="text-slate-500 font-medium">{progressPercent}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    isWon
                      ? "bg-emerald-500"
                      : isLost
                      ? "bg-rose-500"
                      : "bg-gradient-to-r from-sky-400 to-[#1c9be8]"
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Step-by-Step Pipeline */}
            <div className="my-2.5 space-y-1 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Pipeline Milestones
                </span>
                {onStageChange && (
                  <span className="text-[10px] text-[#1c9be8] font-medium flex items-center gap-1">
                    {isUpdating ? "Updating..." : "Click to change"}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {stagesList.map((step, idx) => {
                  const isCurrent = !isLost && idx === stageIndex;
                  const isCompleted = !isLost && (isWon || idx < stageIndex);

                  return (
                    <button
                      key={step.name}
                      type="button"
                      disabled={isUpdating}
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (onStageChange && step.name !== currentStage) {
                          setIsUpdating(true);
                          try {
                            await onStageChange(step.name);
                          } catch (err) {
                            console.error("Failed to update journey stage:", err);
                          } finally {
                            setIsUpdating(false);
                          }
                        }
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-2.5 py-1.5 rounded text-[11px] transition-all text-left",
                        onStageChange && !isCurrent ? "cursor-pointer hover:bg-white hover:shadow-2xs hover:border-slate-200" : "",
                        isCurrent
                          ? "bg-white font-bold text-slate-900 shadow-2xs border border-sky-300 ring-1 ring-sky-200"
                          : isCompleted
                          ? "text-slate-700 bg-slate-50/50"
                          : "text-slate-400"
                      )}
                      title={onStageChange ? `Change stage to "${step.label}"` : step.label}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isCompleted ? (
                          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shrink-0">
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          </div>
                        ) : isCurrent ? (
                          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#1c9be8] text-white shrink-0 shadow-xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                          </div>
                        ) : (
                          <div className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-slate-400 text-[9px] font-bold shrink-0">
                            {idx + 1}
                          </div>
                        )}
                        <span className="truncate">{step.label}</span>
                      </div>

                      {isCurrent ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#1c9be8] bg-sky-50 px-1.5 py-0.5 rounded">
                          Current
                        </span>
                      ) : onStageChange ? (
                        <span className="text-[9px] text-slate-400 hover:text-[#1c9be8] font-medium">
                          Select →
                        </span>
                      ) : null}
                    </button>
                  );
                })}

                {/* Option for Lost / Not Interested */}
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (onStageChange && currentStage !== "Lost / Not Interested") {
                      setIsUpdating(true);
                      try {
                        await onStageChange("Lost / Not Interested");
                      } catch (err) {
                        console.error("Failed to update journey stage to lost:", err);
                      } finally {
                        setIsUpdating(false);
                      }
                    }
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded text-[11px] transition-all text-left",
                    onStageChange ? "cursor-pointer" : "",
                    isLost
                      ? "bg-rose-50 border border-rose-300 text-rose-900 font-bold"
                      : "hover:bg-rose-50/60 text-slate-500 hover:text-rose-700"
                  )}
                  title={onStageChange ? "Change stage to Lost / Not Interested" : "Lost"}
                >
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>Lost / Not Interested</span>
                  </div>
                  {isLost ? (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-rose-600">
                      Terminated
                    </span>
                  ) : onStageChange ? (
                    <span className="text-[9px] text-slate-400 hover:text-rose-600 font-medium">
                      Select →
                    </span>
                  ) : null}
                </button>
              </div>
            </div>

            {/* Next Recommended Action */}
            <div className="mt-2.5 p-2.5 rounded-lg bg-sky-50/60 border border-sky-100 flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-[#1c9be8] shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#1c9be8] block">
                  Recommended Action
                </span>
                <p className="text-[11px] text-slate-700 font-medium leading-relaxed">
                  {getStageGuidance(currentStage, entityType)}
                </p>
              </div>
            </div>

            {/* Footer Summary Stats */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Activities</span>
                <span className="text-xs font-bold text-slate-800">
                  {activitiesCount}
                </span>
              </div>
              <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Deals</span>
                <span className="text-xs font-bold text-slate-800">
                  {dealsCount}
                </span>
              </div>
              <div className="bg-slate-50 p-1.5 rounded border border-slate-100 truncate">
                <span className="text-[10px] text-slate-400 block font-medium truncate">Owner</span>
                <span className="text-[11px] font-semibold text-slate-800 truncate block" title={responsibleName}>
                  {responsibleName}
                </span>
              </div>
            </div>

            {formattedDate && (
              <div className="mt-2 text-center text-[10px] text-slate-400">
                Added to CRM on {formattedDate}
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}

