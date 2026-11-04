"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ContactsToolbar } from "@/components/crm/contacts-toolbar";
import { ContactsTable } from "@/components/crm/contacts-table";
import { ContactSidePanel } from "@/components/crm/contact-side-panel";
import { DeleteContactDialog } from "@/components/crm/delete-contact-dialog";
import { BulkCreateModal } from "@/components/crm/bulk-create-modal";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/states";
import { Contact, Company, User } from "@/types/crm";
import { api } from "@/lib/api-client";

export default function ContactsPage() {
  const [user, setUser] = useState<User | null>(null);

  // Load current user for preset filtering
  useEffect(() => {
    api.getCurrentUser().then(setUser).catch(() => {});
  }, []);

  // Check URL parameter (?id=...) to open contact details in new tab immediately
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlId = params.get("id");
      if (urlId) {
        api
          .getContact(urlId)
          .then((ct) => {
            if (ct) {
              setSelectedContact(ct);
              setIsCreateMode(false);
              setIsSidePanelOpen(true);
            }
          })
          .catch((err) => {
            console.error("Failed to load contact by url id:", urlId, err);
          });
      }
    }
  }, []);

  // Data States
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(50); // Bitrix24 Default: 50 records per page
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
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);

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

  // Load companies for reference and lookup
  useEffect(() => {
    async function loadCompanies() {
      try {
        const res = await api.getCompanies({ limit: 100 });
        setCompanies(res.items);
      } catch {
        // Ignored
      }
    }
    loadCompanies();
  }, []);

  // Fetch contacts with current pagination, search, sorting, and preset
  const fetchContacts = useCallback(
    async (append: boolean = false) => {
      setIsLoading(true);
      setError(null);
      try {
        const actualSkip = append ? contacts.length : skip;
        const res = await api.getContacts({
          skip: actualSkip,
          limit,
          search: debouncedSearch,
          sort_field: "created_at",
          sort_order: sortOrder,
        });

        if (append) {
          setContacts((prev) => [...prev, ...res.items]);
        } else {
          setContacts(res.items);
        }
        setTotal(res.total);
      } catch (err: any) {
        setError(err.detail || err.message || "Failed to load contacts from server.");
      } finally {
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [skip, limit, debouncedSearch, sortOrder]
  );

  useEffect(() => {
    fetchContacts(false);
  }, [fetchContacts, activePreset]);

  // Handle Sort Toggle (Created ⌵ -> Created ⌃)
  const handleSortToggle = () => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    setSkip(0);
  };

  // Handle "Show more" button
  const handleShowMore = () => {
    fetchContacts(true);
  };

  // Contact Saved Handler (from Create or View/Edit SidePanel)
  const handleContactSaved = (saved: Contact) => {
    if (selectedContact && !isCreateMode) {
      setContacts((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
      setSelectedContact(saved);
      triggerSuccess(`Contact "${saved.first_name} ${saved.last_name || ""}" updated successfully.`);
    } else {
      setContacts((prev) => [saved, ...prev]);
      setTotal((prev) => prev + 1);
      triggerSuccess(`Contact "${saved.first_name} ${saved.last_name || ""}" created successfully.`);
    }
  };

  // Contact Deleted Handler
  const handleContactDeleted = (contactId: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== contactId));
    setTotal((prev) => Math.max(0, prev - 1));
    if (selectedContact?.id === contactId) {
      setIsSidePanelOpen(false);
      setSelectedContact(null);
    }
    setDeletingContact(null);
    triggerSuccess("Contact deleted successfully.");
  };

  // Active Filter Fields (from Bitrix24 filter popup)
  const [activeFilters, setActiveFilters] = useState<Record<string, string> | null>(null);

  // Filter contacts locally based on presets and verified REA filter fields
  const displayedContacts = contacts.filter((c) => {
    if (activePreset === "my" && user) {
      if (c.user_id !== user.id && c.user?.id !== user.id) return false;
    }
    if (!activeFilters) return true;
    if (
      activeFilters.first_name &&
      !c.first_name.toLowerCase().includes(activeFilters.first_name.toLowerCase())
    ) {
      return false;
    }
    if (
      activeFilters.last_name &&
      !(c.last_name || "").toLowerCase().includes(activeFilters.last_name.toLowerCase())
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
    if (activeFilters.contact_type) {
      const type = (c.custom_fields?.contact_type || (c as any).classification || "").toLowerCase();
      if (!type.includes(activeFilters.contact_type.toLowerCase())) return false;
    }
    if (activeFilters.stage) {
      if ((c.stage || "").toLowerCase() !== activeFilters.stage.toLowerCase()) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50">
      {/* Bitrix24 Module Toolbar */}
      <ContactsToolbar
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
          setSelectedContact(null);
          setIsCreateMode(true);
          setIsSidePanelOpen(true);
        }}
        onBulkAddClick={() => setIsBulkModalOpen(true)}
        onRefresh={() => fetchContacts(false)}
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
        {isLoading && contacts.length === 0 ? (
          <LoadingState message="Loading CRM contacts..." />
        ) : error && contacts.length === 0 ? (
          <ErrorState
            title="Failed to Load Contacts"
            message={error}
            onRetry={() => fetchContacts(false)}
          />
        ) : displayedContacts.length === 0 && !debouncedSearch ? (
          <EmptyState
            title="No Contacts in CRM"
            description="Start building your client database by adding your first contact."
            actionLabel="+ Create Contact"
            onAction={() => {
              setSelectedContact(null);
              setIsCreateMode(true);
              setIsSidePanelOpen(true);
            }}
          />
        ) : displayedContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-sm text-slate-500">
            No contacts match your current search or filter criteria.
          </div>
        ) : (
          <ContactsTable
            contacts={displayedContacts}
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
              setSelectedContact(c);
              setIsCreateMode(false);
              setIsSidePanelOpen(true);
            }}
            onEdit={(c) => {
              setSelectedContact(c);
              setIsCreateMode(false);
              setIsSidePanelOpen(true);
            }}
            onDelete={(c) => setDeletingContact(c)}
            onBulkDeleted={(count) => {
              fetchContacts(false);
              triggerSuccess(`Successfully deleted ${count} contacts.`);
            }}
            onContactUpdated={(updated) => {
              setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            }}
          />
        )}
      </div>

      {/* Bitrix24 SidePanel Slider (Create, View, and Section-level In-Place Edit Mode) */}
      <ContactSidePanel
        contact={selectedContact}
        open={isSidePanelOpen}
        onClose={() => {
          setIsSidePanelOpen(false);
          setSelectedContact(null);
          setIsCreateMode(false);
          if (typeof window !== "undefined" && window.location.search.includes("id=")) {
            const url = new URL(window.location.href);
            url.searchParams.delete("id");
            window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
          }
        }}
        isCreateMode={isCreateMode}
        companies={companies}
        currentUser={user}
        onSaved={handleContactSaved}
      />

      {/* Bulk Add / Import Contacts Modal */}
      <BulkCreateModal
        open={isBulkModalOpen}
        onOpenChange={setIsBulkModalOpen}
        entityType="contact"
        onSuccess={(count) => {
          fetchContacts(false);
          triggerSuccess(`Successfully created ${count} contacts.`);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteContactDialog
        contact={deletingContact}
        open={!!deletingContact}
        onOpenChange={(open) => !open && setDeletingContact(null)}
        onSuccess={handleContactDeleted}
      />
    </div>
  );
}
