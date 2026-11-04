"use client";

import React from "react";
import * as XLSX from "xlsx";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PipelineStage } from "@/types/crm";
import { api } from "@/lib/api-client";
import { extractDomain } from "@/lib/utils";
import {
  Plus,
  Trash2,
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Table,
} from "lucide-react";

interface BulkCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "deal" | "contact" | "company";
  stages?: PipelineStage[];
  onSuccess: (count: number) => void;
}

export function BulkCreateModal({
  open,
  onOpenChange,
  entityType,
  stages = [],
  onSuccess,
}: BulkCreateModalProps) {
  const [activeTab, setActiveTab] = React.useState<"grid" | "file">("grid");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // --- Quick Grid State ---
  const [dealRows, setDealRows] = React.useState<
    Array<{
      title: string;
      amount: string;
      currency: string;
      stage_id: string;
      expected_close_date: string;
    }>
  >([
    { title: "", amount: "", currency: "INR", stage_id: stages[0]?.id || "", expected_close_date: "" },
    { title: "", amount: "", currency: "INR", stage_id: stages[0]?.id || "", expected_close_date: "" },
    { title: "", amount: "", currency: "INR", stage_id: stages[0]?.id || "", expected_close_date: "" },
  ]);

  const [contactRows, setContactRows] = React.useState<
    Array<{
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
      job_title: string;
    }>
  >([
    { first_name: "", last_name: "", email: "", phone: "", job_title: "" },
    { first_name: "", last_name: "", email: "", phone: "", job_title: "" },
    { first_name: "", last_name: "", email: "", phone: "", job_title: "" },
  ]);

  const [companyRows, setCompanyRows] = React.useState<
    Array<{
      name: string;
      industry: string;
      phone: string;
      email: string;
      website: string;
    }>
  >([
    { name: "", industry: "", phone: "", email: "", website: "" },
    { name: "", industry: "", phone: "", email: "", website: "" },
    { name: "", industry: "", phone: "", email: "", website: "" },
  ]);

  // --- XLS / CSV Import State ---
  const [uploadedFileName, setUploadedFileName] = React.useState<string | null>(null);
  const [fileParsedRows, setFileParsedRows] = React.useState<any[]>([]);
  const [fileError, setFileError] = React.useState<string | null>(null);

  // Reset when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setError(null);
      setFileError(null);
      setUploadedFileName(null);
      setFileParsedRows([]);
      if (stages.length > 0) {
        setDealRows((prev) =>
          prev.map((r) => (!r.stage_id ? { ...r, stage_id: stages[0].id } : r))
        );
      }
    }
  }, [open, stages]);

  // Title helpers
  const entityTitle =
    entityType === "deal"
      ? "Deals"
      : entityType === "contact"
      ? "Contacts"
      : "Companies";

  // --- Helper: Add empty row ---
  function handleAddRow() {
    if (entityType === "deal") {
      setDealRows((prev) => [
        ...prev,
        {
          title: "",
          amount: "",
          currency: "AED",
          stage_id: stages[0]?.id || "",
          expected_close_date: "",
        },
      ]);
    } else if (entityType === "contact") {
      setContactRows((prev) => [
        ...prev,
        { first_name: "", last_name: "", email: "", phone: "", job_title: "" },
      ]);
    } else {
      setCompanyRows((prev) => [
        ...prev,
        { name: "", industry: "", phone: "", email: "", website: "" },
      ]);
    }
  }

  // --- Helper: Remove row ---
  function handleRemoveRow(index: number) {
    if (entityType === "deal") {
      if (dealRows.length <= 1) return;
      setDealRows((prev) => prev.filter((_, i) => i !== index));
    } else if (entityType === "contact") {
      if (contactRows.length <= 1) return;
      setContactRows((prev) => prev.filter((_, i) => i !== index));
    } else {
      if (companyRows.length <= 1) return;
      setCompanyRows((prev) => prev.filter((_, i) => i !== index));
    }
  }

  // --- Helper: Download Template (XLS or CSV) ---
  function handleDownloadTemplate(format: "xls" | "csv" = "xls") {
    let headers: string[] = [];
    let sampleData: any[] = [];
    let baseFilename = "";

    if (entityType === "deal") {
      baseFilename = "deals_template";
      headers = ["title", "amount", "currency", "expected_close_date", "description"];
      sampleData = [
        {
          title: "Gulf Distribution Agreement",
          amount: 45000,
          currency: "AED",
          expected_close_date: "2026-12-31",
          description: "Exclusive distribution for UAE",
        },
        {
          title: "European Media Package",
          amount: 12000,
          currency: "EUR",
          expected_close_date: "2026-11-20",
          description: "Broadcasting licenses",
        },
        {
          title: "North America Syndication",
          amount: 30000,
          currency: "USD",
          expected_close_date: "2026-10-30",
          description: "Streaming rights",
        },
      ];
    } else if (entityType === "contact") {
      baseFilename = "contacts_template";
      headers = ["first_name", "last_name", "email", "phone", "job_title"];
      sampleData = [
        {
          first_name: "Rashid",
          last_name: "Al Nuaimi",
          email: "rashid@emiratesholding.ae",
          phone: "+971 50 123 4567",
          job_title: "Chief Commercial Officer",
        },
        {
          first_name: "Elena",
          last_name: "Rostova",
          email: "elena@globalpartners.org",
          phone: "+44 20 7946 0912",
          job_title: "Head of Acquisitions",
        },
        {
          first_name: "Vijay",
          last_name: "Varma",
          email: "vijay@hyderabadstudios.in",
          phone: "+91 98480 12345",
          job_title: "Producer",
        },
      ];
    } else {
      baseFilename = "companies_template";
      headers = ["name", "industry", "phone", "email", "website"];
      sampleData = [
        {
          name: "Dubai Media City LLC",
          industry: "Media & Entertainment",
          phone: "+971 4 391 1111",
          email: "contact@dmc.ae",
          website: "https://dmc.ae",
        },
        {
          name: "Reliance Entertainment",
          industry: "Film Production",
          phone: "+91 22 3800 5000",
          email: "info@relianceent.com",
          website: "https://relianceentertainment.com",
        },
        {
          name: "Paramount Global",
          industry: "Broadcasting",
          phone: "+1 212 975 4321",
          email: "sales@paramount.com",
          website: "https://paramount.com",
        },
      ];
    }

    if (format === "xls") {
      const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, entityTitle);
      XLSX.writeFile(wb, `${baseFilename}.xls`, { bookType: "xls" });
    } else {
      const headerLine = headers.join(",");
      const sampleLines = sampleData
        .map((row) => headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(","))
        .join("\n");
      const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headerLine + "\n" + sampleLines);
      const link = document.createElement("a");
      link.setAttribute("href", csvContent);
      link.setAttribute("download", `${baseFilename}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  // --- Helper: Parse CSV File ---
  function parseCSV(text: string) {
    const lines = text
      .split(/\r\n|\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length < 2) {
      throw new Error("CSV file must have a header row and at least one data row.");
    }

    // Parse header
    const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());

    const records: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0 || (values.length === 1 && !values[0])) continue;

      const obj: any = {};
      headers.forEach((hdr, idx) => {
        obj[hdr] = values[idx] !== undefined ? values[idx].trim() : "";
      });
      records.push(obj);
    }
    return records;
  }

  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === "," && !inQuotes) {
        result.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
    result.push(cur);
    return result;
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isXls = lowerName.endsWith(".xls") || lowerName.endsWith(".xlsx");
    const isCsv = lowerName.endsWith(".csv");

    if (!isXls && !isCsv) {
      setFileError("Please upload a valid Excel spreadsheet (.xls, .xlsx) or .csv file.");
      return;
    }

    setUploadedFileName(file.name);
    const reader = new FileReader();

    if (isXls) {
      reader.onload = (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error("No worksheets found in this Excel spreadsheet.");
          }
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

          if (!rawData || rawData.length === 0) {
            throw new Error("No data records found in the uploaded Excel worksheet.");
          }

          // Normalize keys to lowercase trimmed
          const normalized = rawData.map((row) => {
            const obj: any = {};
            for (const [key, val] of Object.entries(row)) {
              const cleanKey = key.toLowerCase().trim();
              obj[cleanKey] = val !== undefined && val !== null ? val : "";
            }
            return obj;
          });

          setFileParsedRows(normalized);
        } catch (err: any) {
          setFileError(err.message || "Failed to parse Excel spreadsheet.");
          setFileParsedRows([]);
        }
      };
      reader.onerror = () => {
        setFileError("Failed to read the uploaded Excel file.");
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const parsed = parseCSV(text);
          if (parsed.length === 0) {
            throw new Error("No data records found in CSV file.");
          }
          setFileParsedRows(parsed);
        } catch (err: any) {
          setFileError(err.message || "Failed to parse CSV file.");
          setFileParsedRows([]);
        }
      };
      reader.onerror = () => {
        setFileError("Failed to read the uploaded CSV file.");
      };
      reader.readAsText(file);
    }
  }

  // --- Save / Submit Handlers ---
  async function handleSubmitGrid() {
    setError(null);
    setIsSubmitting(true);
    try {
      if (entityType === "deal") {
        // Filter out empty rows
        const validRows = dealRows.filter((r) => r.title.trim().length > 0);
        if (validRows.length === 0) {
          throw new Error("Please enter at least one deal title.");
        }
        const payload = validRows.map((r) => ({
          title: r.title.trim(),
          amount: parseFloat(r.amount) || 0.0,
          currency: r.currency || "INR",
          stage_id: r.stage_id || undefined,
          expected_close_date: r.expected_close_date
            ? new Date(r.expected_close_date).toISOString()
            : undefined,
        }));
        const res = await api.bulkCreateDeals(payload);
        onSuccess(res.created_count);
        onOpenChange(false);
      } else if (entityType === "contact") {
        const validRows = contactRows.filter((r) => r.first_name.trim().length > 0);
        if (validRows.length === 0) {
          throw new Error("Please enter at least one contact with a first name.");
        }
        const payload = validRows.map((r) => ({
          first_name: r.first_name.trim(),
          last_name: r.last_name.trim() || undefined,
          email: r.email.trim() || undefined,
          phone: r.phone.trim() || undefined,
          job_title: r.job_title.trim() || undefined,
        }));
        const res = await api.bulkCreateContacts(payload);
        onSuccess(res.created_count);
        onOpenChange(false);
      } else {
        const validRows = companyRows.filter((r) => r.name.trim().length > 0);
        if (validRows.length === 0) {
          throw new Error("Please enter at least one company name.");
        }
        const missingWebsite = validRows.find((r) => !r.website || !r.website.trim());
        if (missingWebsite) {
          throw new Error(`Website URL is required for all companies (missing for "${missingWebsite.name}").`);
        }
        for (const r of validRows) {
          const dom = extractDomain(r.website);
          if (!dom || (!dom.includes(".") && dom !== "localhost")) {
            throw new Error(`Please enter a valid website URL or domain for "${r.name}".`);
          }
        }
        const payload = validRows.map((r) => ({
          name: r.name.trim(),
          industry: r.industry.trim() || undefined,
          phone: r.phone.trim() || undefined,
          email: r.email.trim() || undefined,
          website: r.website.trim(),
        }));
        const res = await api.bulkCreateCompanies(payload);
        onSuccess(res.created_count);
        onOpenChange(false);
      }
    } catch (err: any) {
      setError(err.detail || err.message || "Failed to create items in bulk.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmitFile() {
    setError(null);
    setIsSubmitting(true);
    try {
      if (fileParsedRows.length === 0) {
        throw new Error("Please select and upload a valid Excel (.xls, .xlsx) or .csv file first.");
      }

      if (entityType === "deal") {
        const defaultStageId = stages[0]?.id;
        const payload = fileParsedRows.map((row) => {
          let closeDateISO: string | undefined = undefined;
          if (row.expected_close_date) {
            if (row.expected_close_date instanceof Date) {
              if (!isNaN(row.expected_close_date.getTime())) {
                closeDateISO = row.expected_close_date.toISOString();
              }
            } else {
              const parsedDate = new Date(row.expected_close_date);
              if (!isNaN(parsedDate.getTime())) {
                closeDateISO = parsedDate.toISOString();
              }
            }
          }

          const rawAmount = row.amount !== undefined && row.amount !== "" ? row.amount : row.value;
          const numAmount =
            typeof rawAmount === "number"
              ? rawAmount
              : parseFloat(String(rawAmount || "0")) || 0.0;

          return {
            title: String(row.title || row.deal_title || row.name || "Untitled Deal").trim(),
            amount: numAmount,
            currency: String(row.currency || "INR").toUpperCase().trim(),
            stage_id: defaultStageId || undefined,
            expected_close_date: closeDateISO,
            description: row.description ? String(row.description).trim() : undefined,
          };
        });
        const res = await api.bulkCreateDeals(payload);
        onSuccess(res.created_count);
        onOpenChange(false);
      } else if (entityType === "contact") {
        const payload = fileParsedRows.map((row) => {
          let firstName = String(row.first_name || row.firstname || "").trim();
          let lastName = String(row.last_name || row.lastname || "").trim();
          if (!firstName && row.name) {
            const parts = String(row.name).trim().split(" ");
            firstName = parts[0];
            lastName = parts.slice(1).join(" ");
          }
          return {
            first_name: firstName || "Unknown",
            last_name: lastName || undefined,
            email: row.email ? String(row.email).trim() : undefined,
            phone: row.phone ? String(row.phone).trim() : undefined,
            job_title:
              row.job_title || row.jobtitle || row.title
                ? String(row.job_title || row.jobtitle || row.title).trim()
                : undefined,
          };
        });
        const res = await api.bulkCreateContacts(payload);
        onSuccess(res.created_count);
        onOpenChange(false);
      } else {
        const missingWebsite = fileParsedRows.find((row) => !row.website || !String(row.website).trim());
        if (missingWebsite) {
          const cName = String(missingWebsite.name || missingWebsite.company_name || missingWebsite.company || "Row");
          throw new Error(`Website URL is required for company "${cName}".`);
        }
        const payload = fileParsedRows.map((row) => ({
          name: String(row.name || row.company_name || row.company || "Untitled Company").trim(),
          industry: row.industry ? String(row.industry).trim() : undefined,
          phone: row.phone ? String(row.phone).trim() : undefined,
          email: row.email ? String(row.email).trim() : undefined,
          website: String(row.website).trim(),
        }));
        const res = await api.bulkCreateCompanies(payload);
        onSuccess(res.created_count);
        onOpenChange(false);
      }
    } catch (err: any) {
      setError(err.detail || err.message || "Failed to import spreadsheet records.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Count active rows for grid button
  const validGridRowCount =
    entityType === "deal"
      ? dealRows.filter((r) => r.title.trim().length > 0).length
      : entityType === "contact"
      ? contactRows.filter((r) => r.first_name.trim().length > 0).length
      : companyRows.filter((r) => r.name.trim().length > 0).length;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Bulk Add / Import ${entityTitle}`}
      description={`Rapidly create multiple ${entityTitle.toLowerCase()} simultaneously via interactive tabular entry or Excel (.xls, .xlsx) / CSV spreadsheet upload.`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4 pt-1">
        {/* Tab Toggle Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-3 gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("grid")}
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "grid"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Table className="h-3.5 w-3.5" />
              <span>Multi-Row Grid Entry</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("file")}
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "file"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>XLS / CSV Upload</span>
            </button>
          </div>

          {activeTab === "file" && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleDownloadTemplate("xls")}
                className="h-8 gap-1.5 text-xs text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                title="Download formatted sample Excel .xls spreadsheet template"
              >
                <Download className="h-3.5 w-3.5 text-emerald-600" />
                <span>Download XLS Template</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleDownloadTemplate("csv")}
                className="h-8 gap-1.5 text-xs text-slate-700 hover:bg-slate-50"
                title="Download formatted sample CSV file template"
              >
                <Download className="h-3.5 w-3.5" />
                <span>CSV Template</span>
              </Button>
            </div>
          )}
        </div>

        {/* Global Error Alert */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: MULTI-ROW GRID */}
        {activeTab === "grid" && (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground flex items-center justify-between">
              <span>Fill in the rows below. Only completed rows will be saved.</span>
              <span className="font-semibold text-slate-700">
                {validGridRowCount} ready to create
              </span>
            </div>

            {/* Editable Grid Table */}
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <table className="w-full text-left text-xs">
                {/* HEADERS */}
                <thead className="bg-slate-50 border-b border-border text-slate-600 font-semibold uppercase tracking-wider">
                  {entityType === "deal" && (
                    <tr>
                      <th className="px-3 py-2.5 w-10 text-center">#</th>
                      <th className="px-3 py-2.5 min-w-[180px]">Deal Title *</th>
                      <th className="px-3 py-2.5 min-w-[110px]">Amount</th>
                      <th className="px-3 py-2.5 min-w-[110px]">Currency</th>
                      <th className="px-3 py-2.5 min-w-[140px]">Stage</th>
                      <th className="px-3 py-2.5 min-w-[130px]">Close Date</th>
                      <th className="px-3 py-2.5 w-10 text-center"></th>
                    </tr>
                  )}
                  {entityType === "contact" && (
                    <tr>
                      <th className="px-3 py-2.5 w-10 text-center">#</th>
                      <th className="px-3 py-2.5 min-w-[140px]">First Name *</th>
                      <th className="px-3 py-2.5 min-w-[140px]">Last Name</th>
                      <th className="px-3 py-2.5 min-w-[170px]">Email</th>
                      <th className="px-3 py-2.5 min-w-[130px]">Phone</th>
                      <th className="px-3 py-2.5 min-w-[130px]">Job Title</th>
                      <th className="px-3 py-2.5 w-10 text-center"></th>
                    </tr>
                  )}
                  {entityType === "company" && (
                    <tr>
                      <th className="px-3 py-2.5 w-10 text-center">#</th>
                      <th className="px-3 py-2.5 min-w-[180px]">Company Name *</th>
                      <th className="px-3 py-2.5 min-w-[140px]">Industry</th>
                      <th className="px-3 py-2.5 min-w-[130px]">Phone</th>
                      <th className="px-3 py-2.5 min-w-[170px]">Email</th>
                      <th className="px-3 py-2.5 min-w-[150px]">Website *</th>
                      <th className="px-3 py-2.5 w-10 text-center"></th>
                    </tr>
                  )}
                </thead>

                {/* BODY ROWS */}
                <tbody className="divide-y divide-border">
                  {/* DEAL ROWS */}
                  {entityType === "deal" &&
                    dealRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            placeholder="e.g. Media Sponsorship"
                            value={row.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDealRows((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, title: val } : r))
                              );
                            }}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={row.amount}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDealRows((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, amount: val } : r))
                              );
                            }}
                            className="h-8 text-xs font-mono"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={row.currency}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDealRows((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, currency: val } : r))
                              );
                            }}
                            className="h-8 w-full rounded-md border border-input bg-card px-2 text-xs focus:ring-1 focus:ring-ring font-medium"
                          >
                            <option value="INR">INR (₹)</option>
                            <option value="USD">USD ($)</option>
                            <option value="AED">AED (د.إ)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={row.stage_id}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDealRows((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, stage_id: val } : r))
                              );
                            }}
                            className="h-8 w-full rounded-md border border-input bg-card px-2 text-xs focus:ring-1 focus:ring-ring"
                          >
                            {stages.map((stg) => (
                              <option key={stg.id} value={stg.id}>
                                {stg.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="date"
                            value={row.expected_close_date}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDealRows((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, expected_close_date: val } : r
                                )
                              );
                            }}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            disabled={dealRows.length <= 1}
                            className="text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors p-1"
                            title="Remove row"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}

                  {/* CONTACT ROWS */}
                  {entityType === "contact" &&
                    contactRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            placeholder="First Name"
                            value={row.first_name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setContactRows((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, first_name: val } : r))
                              );
                            }}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            placeholder="Last Name"
                            value={row.last_name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setContactRows((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, last_name: val } : r))
                              );
                            }}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="email"
                            placeholder="email@example.com"
                            value={row.email}
                            onChange={(e) => {
                              const val = e.target.value;
                              setContactRows((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, email: val } : r))
                              );
                            }}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            placeholder="+971 50 123 4567"
                            value={row.phone}
                            onChange={(e) => {
                              const val = e.target.value;
                              setContactRows((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, phone: val } : r))
                              );
                            }}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            placeholder="Manager / Director"
                            value={row.job_title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setContactRows((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, job_title: val } : r))
                              );
                            }}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            disabled={contactRows.length <= 1}
                            className="text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors p-1"
                            title="Remove row"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}

                  {/* COMPANY ROWS */}
                  {entityType === "company" &&
                    companyRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            placeholder="Company Name"
                            value={row.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCompanyRows((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, name: val } : r))
                              );
                            }}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            placeholder="Technology, Finance..."
                            value={row.industry}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCompanyRows((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, industry: val } : r))
                              );
                            }}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            placeholder="+971 4 000 0000"
                            value={row.phone}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCompanyRows((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, phone: val } : r))
                              );
                            }}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="email"
                            placeholder="info@company.com"
                            value={row.email}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCompanyRows((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, email: val } : r))
                              );
                            }}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            placeholder="https://company.com"
                            value={row.website}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCompanyRows((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, website: val } : r))
                              );
                            }}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            disabled={companyRows.length <= 1}
                            className="text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors p-1"
                            title="Remove row"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Add row button */}
            <div className="flex items-center justify-between pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRow}
                className="h-8 gap-1.5 text-xs text-slate-700"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Row</span>
              </Button>
            </div>
          </div>
        )}

        {/* TAB 2: XLS / CSV FILE UPLOAD */}
        {activeTab === "file" && (
          <div className="space-y-4">
            {/* File drop area */}
            <div className="relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/70 p-6 text-center hover:bg-slate-50 transition-colors">
              <UploadCloud className="h-10 w-10 text-slate-400 mb-2" />
              <div className="text-sm font-semibold text-slate-800">
                {uploadedFileName ? (
                  <span className="text-[#00AEEF] font-bold">{uploadedFileName}</span>
                ) : (
                  "Choose an Excel (.xls, .xlsx) or .csv file, or drag it here"
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Supports Microsoft Excel (.xls, .xlsx) and Comma-Separated Values (.csv) with headers.
              </p>
              <input
                type="file"
                accept=".xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>

            {/* Parsing error */}
            {fileError && (
              <div className="flex items-center gap-2 rounded-md bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{fileError}</span>
              </div>
            )}

            {/* Parsed Preview Table */}
            {fileParsedRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-700 font-medium">
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Successfully parsed {fileParsedRows.length} rows</span>
                  </div>
                  <span className="text-muted-foreground">Showing first 5 rows</span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-border bg-card max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-border sticky top-0 text-slate-600 uppercase font-semibold">
                      <tr>
                        {Object.keys(fileParsedRows[0] || {}).map((key) => (
                          <th key={key} className="px-3 py-2 font-medium">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {fileParsedRows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          {Object.values(row).map((val: any, j) => (
                            <td key={j} className="px-3 py-1.5 max-w-[150px] truncate">
                              {val instanceof Date
                                ? val.toLocaleDateString()
                                : String(val !== undefined && val !== null ? val : "—")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Actions Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">

          {activeTab === "grid" ? (
            <Button
              type="button"
              variant="bitrix"
              size="sm"
              onClick={handleSubmitGrid}
              disabled={isSubmitting || validGridRowCount === 0}
              className="min-w-[140px] text-white font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                `Save All (${validGridRowCount})`
              )}
            </Button>
          ) : (
            <Button
              type="button"
              variant="bitrix"
              size="sm"
              onClick={handleSubmitFile}
              disabled={isSubmitting || fileParsedRows.length === 0}
              className="min-w-[140px] text-white font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Importing...
                </>
              ) : (
                `Import (${fileParsedRows.length}) Records`
              )}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
