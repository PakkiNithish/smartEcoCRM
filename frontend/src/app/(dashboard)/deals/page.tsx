"use client";

import React from "react";
import { DealsToolbar } from "@/components/crm/deals-toolbar";
import { DealsKanban } from "@/components/crm/deals-kanban";
import { DealsTable } from "@/components/crm/deals-table";
import { DealForm } from "@/components/crm/deal-form";
import { DealDetails } from "@/components/crm/deal-details";
import { DeleteDealDialog } from "@/components/crm/delete-deal-dialog";
import { BulkCreateModal } from "@/components/crm/bulk-create-modal";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/states";
import { Deal, PipelineStage } from "@/types/crm";
import { api } from "@/lib/api-client";

export default function DealsPage() {
  // Data States
  const [stages, setStages] = React.useState<PipelineStage[]>([]);
  const [deals, setDeals] = React.useState<Deal[]>([]);
  const [total, setTotal] = React.useState(0);
  const [skip, setSkip] = React.useState(0);
  const limit = 50;

  // Filter States
  const [viewMode, setViewMode] = React.useState<"kanban" | "list">("kanban");
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [selectedStageId, setSelectedStageId] = React.useState("");

  // Loading & Error States
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Modal / Action States
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = React.useState(false);
  const [editingDeal, setEditingDeal] = React.useState<Deal | null>(null);
  const [viewingDeal, setViewingDeal] = React.useState<Deal | null>(null);
  const [deletingDeal, setDeletingDeal] = React.useState<Deal | null>(null);

  // Success Notification Banner
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  function triggerSuccess(msg: string) {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  }

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setSkip(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load pipeline stages once on mount
  React.useEffect(() => {
    async function loadStages() {
      try {
        const fetchedStages = await api.getPipelineStages();
        setStages(fetchedStages);
      } catch (err: any) {
        setError(err.detail || err.message || "Failed to load pipeline stages.");
      }
    }
    loadStages();
  }, []);

  // Fetch deals whenever search, filter, or pagination changes
  const fetchDeals = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getDeals({
        skip,
        limit,
        search: debouncedSearch,
        stage_id: selectedStageId || undefined,
      });
      setDeals(res.items);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.detail || err.message || "Failed to fetch deals from server.");
    } finally {
      setIsLoading(false);
    }
  }, [skip, limit, debouncedSearch, selectedStageId]);

  React.useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  // Deal Form Success Handler
  function handleDealSaved(savedDeal: Deal) {
    if (editingDeal) {
      // Updated
      setDeals((prev) =>
        prev.map((d) => (d.id === savedDeal.id ? savedDeal : d))
      );
      if (viewingDeal?.id === savedDeal.id) {
        setViewingDeal(savedDeal);
      }
      triggerSuccess(`Deal "${savedDeal.title}" updated successfully.`);
    } else {
      // Created
      setDeals((prev) => [savedDeal, ...prev]);
      setTotal((prev) => prev + 1);
      triggerSuccess(`Deal "${savedDeal.title}" created successfully.`);
    }
    setEditingDeal(null);
  }

  // Deal Deleted Handler
  function handleDealDeleted(dealId: string) {
    setDeals((prev) => prev.filter((d) => d.id !== dealId));
    setTotal((prev) => Math.max(0, prev - 1));
    if (viewingDeal?.id === dealId) {
      setViewingDeal(null);
    }
    setDeletingDeal(null);
    triggerSuccess("Deal deleted successfully.");
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50">
      {/* Deals Toolbar */}
      <DealsToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        search={search}
        onSearchChange={setSearch}
        selectedStageId={selectedStageId}
        onStageChange={(id) => {
          setSelectedStageId(id);
          setSkip(0);
        }}
        stages={stages}
        onCreateClick={() => {
          setEditingDeal(null);
          setIsFormOpen(true);
        }}
        onBulkAddClick={() => setIsBulkModalOpen(true)}
        onRefresh={fetchDeals}
        isLoading={isLoading}
      />

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="mx-6 mt-3 flex items-center justify-between rounded-md bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800 border border-emerald-200 shadow-xs animate-in fade-in">
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-h-0">
        {isLoading && deals.length === 0 ? (
          <LoadingState message="Connecting to CRM pipeline and loading deals..." />
        ) : error && deals.length === 0 ? (
          <ErrorState
            title="Failed to Load Pipeline"
            message={error}
            onRetry={fetchDeals}
          />
        ) : deals.length === 0 && !debouncedSearch && !selectedStageId ? (
          <EmptyState
            title="No Deals in Pipeline"
            description="Your Simple CRM pipeline is empty. Create your first sales deal to begin tracking revenue and stages."
            actionLabel="Create First Deal"
            onAction={() => {
              setEditingDeal(null);
              setIsFormOpen(true);
            }}
          />
        ) : deals.length === 0 ? (
          <EmptyState
            title="No Matching Deals"
            description="No deals match your search criteria or selected stage filter."
            actionLabel="Clear Filters"
            onAction={() => {
              setSearch("");
              setSelectedStageId("");
            }}
          />
        ) : viewMode === "kanban" ? (
          <DealsKanban
            stages={stages}
            deals={deals}
            onDealsChange={setDeals}
            onView={(deal) => setViewingDeal(deal)}
            onEdit={(deal) => {
              setEditingDeal(deal);
              setIsFormOpen(true);
            }}
            onDelete={(deal) => setDeletingDeal(deal)}
          />
        ) : (
          <DealsTable
            deals={deals}
            total={total}
            skip={skip}
            limit={limit}
            onPageChange={setSkip}
            onView={(deal) => setViewingDeal(deal)}
            onEdit={(deal) => {
              setEditingDeal(deal);
              setIsFormOpen(true);
            }}
            onDelete={(deal) => setDeletingDeal(deal)}
            onBulkDeleted={(count) => {
              fetchDeals();
              triggerSuccess(`Successfully deleted ${count} deals.`);
            }}
          />
        )}
      </div>

      {/* Create / Edit Deal Modal */}
      <DealForm
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingDeal(null);
        }}
        stages={stages}
        initialDeal={editingDeal}
        onSuccess={handleDealSaved}
      />

      {/* Bulk Add / Import Deals Modal */}
      <BulkCreateModal
        open={isBulkModalOpen}
        onOpenChange={setIsBulkModalOpen}
        entityType="deal"
        stages={stages}
        onSuccess={(count) => {
          fetchDeals();
          triggerSuccess(`Successfully created ${count} deals.`);
        }}
      />

      {/* View Deal Details Modal */}
      <DealDetails
        deal={viewingDeal}
        open={Boolean(viewingDeal)}
        onOpenChange={(open) => {
          if (!open) setViewingDeal(null);
        }}
        onEdit={(deal) => {
          setEditingDeal(deal);
          setIsFormOpen(true);
        }}
        onDelete={(deal) => {
          setDeletingDeal(deal);
        }}
      />

      {/* Delete Deal Confirmation Dialog */}
      <DeleteDealDialog
        deal={deletingDeal}
        open={Boolean(deletingDeal)}
        onOpenChange={(open) => {
          if (!open) setDeletingDeal(null);
        }}
        onDeleted={handleDealDeleted}
      />
    </div>
  );
}
