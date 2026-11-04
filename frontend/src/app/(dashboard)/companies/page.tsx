"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CompaniesToolbar } from "@/components/crm/companies-toolbar";
import { CompaniesTable } from "@/components/crm/companies-table";
import { CompanySidePanel } from "@/components/crm/company-side-panel";
import { DeleteCompanyDialog } from "@/components/crm/delete-company-dialog";
import { BulkCreateModal } from "@/components/crm/bulk-create-modal";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/states";
import { Company, User } from "@/types/crm";
import { api } from "@/lib/api-client";

export default function CompaniesPage() {
  const [user, setUser] = useState<User | null>(null);

  // Load current user for preset filtering
  useEffect(() => {
    api.getCurrentUser().then(setUser).catch(() => {});
  }, []);

  // Check URL parameter (?id=...) to open company details in new tab immediately
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlId = params.get("id");
      if (urlId) {
        api
          .getCompany(urlId)
          .then((comp) => {
            if (comp) {
              setSelectedCompany(comp);
              setIsCreateMode(false);
              setIsSidePanelOpen(true);
            }
          })
          .catch((err) => {
            console.error("Failed to load company by url id:", urlId, err);
          });
      }
    }
  }, []);

  // Data States
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(100); // Bitrix24 Default: 100 records per page for Companies
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Filter & Search States
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activePreset, setActivePreset] = useState("all"); // "all" | "my"

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & SidePanel Drawer States
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);

  // Success Notification Banner
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function triggerSuccess(msg: string) {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  }

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setSkip(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch companies with current pagination, search, sorting, and preset
  const fetchCompanies = useCallback(
    async (append: boolean = false) => {
      setIsLoading(true);
      setError(null);
      try {
        const actualSkip = append ? companies.length : skip;
        const res = await api.getCompanies({
          skip: actualSkip,
          limit,
          search: debouncedSearch,
          sort_field: "created_at",
          sort_order: sortOrder,
        });

        if (append) {
          setCompanies((prev) => [...prev, ...res.items]);
        } else {
          setCompanies(res.items);
        }
        setTotal(res.total);
      } catch (err: any) {
        setError(err.detail || err.message || "Failed to load companies from server.");
      } finally {
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [skip, limit, debouncedSearch, sortOrder]
  );

  useEffect(() => {
    fetchCompanies(false);
  }, [fetchCompanies, activePreset]);

  // Handle Sort Toggle (Created ⌵ -> Created ⌃)
  const handleSortToggle = () => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    setSkip(0);
  };

  // Handle "Show more" button
  const handleShowMore = () => {
    fetchCompanies(true);
  };

  // Company Saved Handler (from Create or View/Edit SidePanel)
  const handleCompanySaved = (saved: Company) => {
    if (selectedCompany && !isCreateMode) {
      setCompanies((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
      setSelectedCompany(saved);
      triggerSuccess(`Company "${saved.name}" updated successfully.`);
    } else {
      setCompanies((prev) => [saved, ...prev]);
      setTotal((prev) => prev + 1);
      triggerSuccess(`Company "${saved.name}" created successfully.`);
    }
  };

  // Company Deleted Handler
  const handleCompanyDeleted = (companyId: string) => {
    setCompanies((prev) => prev.filter((c) => c.id !== companyId));
    setTotal((prev) => Math.max(0, prev - 1));
    if (selectedCompany?.id === companyId) {
      setIsSidePanelOpen(false);
      setSelectedCompany(null);
    }
    setDeletingCompany(null);
    triggerSuccess("Company deleted successfully.");
  };

  // Active Filter Fields (from Bitrix24 filter popup)
  const [activeFilters, setActiveFilters] = useState<Record<string, string> | null>(null);

  // Filter companies locally based on presets and verified REA filter fields
  const displayedCompanies = companies.filter((c) => {
    if (activePreset === "my" && user) {
      if (c.user_id !== user.id && c.user?.id !== user.id) return false;
    }
    if (!activeFilters) return true;
    if (
      activeFilters.name &&
      !c.name.toLowerCase().includes(activeFilters.name.toLowerCase())
    ) {
      return false;
    }
    if (
      activeFilters.created_by &&
      !(c.user?.full_name || c.user?.email || "")
        .toLowerCase()
        .includes(activeFilters.created_by.toLowerCase())
    ) {
      return false;
    }
    if (
      activeFilters.modified_by &&
      !(c.user?.full_name || c.user?.email || "")
        .toLowerCase()
        .includes(activeFilters.modified_by.toLowerCase())
    ) {
      return false;
    }
    if (
      activeFilters.phone &&
      !(c.phone || "").toLowerCase().includes(activeFilters.phone.toLowerCase())
    ) {
      return false;
    }
    if (
      activeFilters.email &&
      !(c.email || "").toLowerCase().includes(activeFilters.email.toLowerCase())
    ) {
      return false;
    }
    if (
      activeFilters.responsible_person &&
      !(c.user?.full_name || c.user?.email || "")
        .toLowerCase()
        .includes(activeFilters.responsible_person.toLowerCase())
    ) {
      return false;
    }
    if (
      activeFilters.industry &&
      !(c.industry || "").toLowerCase().includes(activeFilters.industry.toLowerCase())
    ) {
      return false;
    }
    if (activeFilters.company_type) {
      if ((c.company_type || "").toLowerCase() !== activeFilters.company_type.toLowerCase()) return false;
    }
    if (activeFilters.stage) {
      if ((c.stage || "").toLowerCase() !== activeFilters.stage.toLowerCase()) return false;
    }
    if (
      activeFilters.address &&
      !(c.address || "").toLowerCase().includes(activeFilters.address.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50">
      {/* Bitrix24 Module Toolbar */}
      <CompaniesToolbar
        total={total}
        search={search}
        onSearchChange={setSearch}
        activePreset={activePreset}
        onPresetChange={(preset) => {
          setActivePreset(preset);
          setSkip(0);
        }}
        onFilterSubmit={(filters) => {
          setActiveFilters(filters);
          setSkip(0);
        }}
        onResetFilters={() => {
          setActiveFilters(null);
          setSkip(0);
        }}
        onCreateClick={() => {
          setSelectedCompany(null);
          setIsCreateMode(true);
          setIsSidePanelOpen(true);
        }}
        onBulkAddClick={() => setIsBulkModalOpen(true)}
        onRefresh={() => fetchCompanies(false)}
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
      <div className="flex flex-1 flex-col overflow-y-auto min-h-0">
        {isLoading && companies.length === 0 ? (
          <LoadingState message="Loading CRM companies..." />
        ) : error && companies.length === 0 ? (
          <ErrorState
            title="Failed to Load Companies"
            message={error}
            onRetry={() => fetchCompanies(false)}
          />
        ) : displayedCompanies.length === 0 && !debouncedSearch ? (
          <EmptyState
            title="No Companies in CRM"
            description="Start building your client database by adding your first company."
            actionLabel="+ Create Company"
            onAction={() => {
              setSelectedCompany(null);
              setIsCreateMode(true);
              setIsSidePanelOpen(true);
            }}
          />
        ) : displayedCompanies.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-sm text-slate-500">
            No companies match your current search or filter criteria.
          </div>
        ) : (
          <CompaniesTable
            companies={displayedCompanies}
            total={total}
            skip={skip}
            limit={limit}
            sortOrder={sortOrder}
            onSortToggle={handleSortToggle}
            onPageChange={setSkip}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setSkip(0);
            }}
            onShowMore={handleShowMore}
            onView={(c) => {
              setSelectedCompany(c);
              setIsCreateMode(false);
              setIsSidePanelOpen(true);
            }}
            onEdit={(c) => {
              setSelectedCompany(c);
              setIsCreateMode(false);
              setIsSidePanelOpen(true);
            }}
            onDelete={(c) => setDeletingCompany(c)}
            onBulkDeleted={(count) => {
              fetchCompanies(false);
              triggerSuccess(`Successfully deleted ${count} companies.`);
            }}
            onCompanyUpdated={(updated) => {
              setCompanies((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            }}
          />
        )}
      </div>

      {/* Bitrix24 SidePanel Slider (Create, View, and Section-level In-Place Edit Mode) */}
      <CompanySidePanel
        company={selectedCompany}
        open={isSidePanelOpen}
        onClose={() => {
          setIsSidePanelOpen(false);
          setSelectedCompany(null);
          setIsCreateMode(false);
          if (typeof window !== "undefined" && window.location.search.includes("id=")) {
            const url = new URL(window.location.href);
            url.searchParams.delete("id");
            window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
          }
        }}
        isCreateMode={isCreateMode}
        currentUser={user}
        onSaved={handleCompanySaved}
      />

      {/* Bulk Add / Import Companies Modal */}
      <BulkCreateModal
        open={isBulkModalOpen}
        onOpenChange={setIsBulkModalOpen}
        entityType="company"
        onSuccess={(count) => {
          fetchCompanies(false);
          triggerSuccess(`Successfully registered ${count} companies.`);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteCompanyDialog
        company={deletingCompany}
        open={!!deletingCompany}
        onOpenChange={(open) => !open && setDeletingCompany(null)}
        onSuccess={handleCompanyDeleted}
      />
    </div>
  );
}
