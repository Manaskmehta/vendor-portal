"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogOut, Building2, X, Upload, Trash2, Truck, FileText } from "lucide-react";
import { TOKEN_KEY, USER_KEY } from "@/lib/config";
import { apiRequest } from "@/lib/api";
import { QUOTATION_DELIVERY_TERM_OPTIONS } from "@/lib/quotation-terms";
import { calcLineGstAmount, calcLineTotalInclGst } from "@/lib/gst";
import Loader from "@/components/Loader";
import SubmitButton from "@/components/ui/SubmitButton";
import { useSubmitLock } from "@/lib/useSubmitLock";

function formatCurrency(value: number): string {
  return `₹ ${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface VendorUser {
  id?: string;
  email?: string;
  name?: string;
  fullName?: string;
}

interface VendorRfq {
  id: string;
  requestNo: string;
  status: "SENT" | "RESPONDED" | "CANCELLED";
  dueDate?: string;
  note?: string;
  quotationId?: string;
  respondedAt?: string;
  createdAt: string;
  lines: {
    id: string;
    indentItemId: string;
    quantity: number | string;
    indentItem: {
      itemCode: string;
      itemName: string;
      uom: string;
      item?: {
        hsnCodeRef?: { gstRate?: number | string | null } | null;
      } | null;
      indent: {
        documentNo: string;
        title: string;
        priority?: "NORMAL" | "URGENT";
      };
    };
  }[];
}

interface VendorRfqResponse {
  data?: VendorRfq[];
}

interface DispatchDocument {
  fileName: string;
  type: string;
  url: string;
}

interface VendorPoAllocation {
  id: string;
  quantity: number | string;
  poLineItem?: {
    itemCode: string;
    itemName: string;
    hsnCode?: string;
    uom: string;
    quantity: number | string;
  } | null;
}

interface VendorPo {
  id: string;
  poNo: string;
  status: string;
  expectedDeliveryDate: string;
  destination?: string;
  allocations: VendorPoAllocation[];
}

interface VendorDispatch {
  id: string;
  dispatchNo: string;
  status?: string;
  vehicleNo: string;
  challanNo: string;
  driverName?: string;
  grossWeightKg?: number | string;
  tareWeightKg?: number | string;
  remarks?: string;
  packingDocuments?: DispatchDocument[];
  invoiceDocuments?: DispatchDocument[];
  createdAt: string;
  po?: { poNo: string; destination?: string };
  lines: {
    id: string;
    dispatchedQty: number | string;
    poAllocation?: VendorPoAllocation;
  }[];
}

interface PaginatedResponse<T> {
  data?: T[];
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function readDocument(file: File) {
  return new Promise<DispatchDocument>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}`));
    reader.onload = () => resolve({ fileName: file.name, type: file.type || "application/octet-stream", url: String(reader.result) });
    reader.readAsDataURL(file);
  });
}

function readQuotationAttachment(file: File) {
  return readDocument(file).then((doc) => doc.url);
}

function isPdfAttachment(url: string) {
  return url.startsWith("data:application/pdf") || url.toLowerCase().includes(".pdf");
}

export default function VendorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<VendorUser | null>(null);
  const [rfqs, setRfqs] = useState<VendorRfq[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<VendorPo[]>([]);
  const [dispatches, setDispatches] = useState<VendorDispatch[]>([]);
  const [selectedRfq, setSelectedRfq] = useState<VendorRfq | null>(null);
  const [selectedPo, setSelectedPo] = useState<VendorPo | null>(null);
  const [validTill, setValidTill] = useState("");
  const [promisedDays, setPromisedDays] = useState("7");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [termsOfDelivery, setTermsOfDelivery] = useState("");
  const [rates, setRates] = useState<Record<string, string>>({});
  const [gstPercents, setGstPercents] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<{ fileName: string; preview: string }[]>([]);
  const [dispatchQty, setDispatchQty] = useState<Record<string, string>>({});
  const [vehicleNo, setVehicleNo] = useState("");
  const [challanNo, setChallanNo] = useState("");
  const [driverName, setDriverName] = useState("");
  const [grossWeightKg, setGrossWeightKg] = useState("");
  const [tareWeightKg, setTareWeightKg] = useState("");
  const [dispatchRemarks, setDispatchRemarks] = useState("");
  const [packingDocuments, setPackingDocuments] = useState<DispatchDocument[]>([]);
  const [invoiceDocuments, setInvoiceDocuments] = useState<DispatchDocument[]>([]);
  const [error, setError] = useState("");
  const [quoteModalError, setQuoteModalError] = useState("");
  const [dispatchModalError, setDispatchModalError] = useState("");
  const [success, setSuccess] = useState("");
  const { isSubmitting: saving, withSubmitLock: withQuoteSubmitLock } = useSubmitLock();
  const { isSubmitting: dispatchSaving, withSubmitLock: withDispatchSubmitLock } = useSubmitLock();
  const [pageLoading, setPageLoading] = useState(true);

  const loadRfqs = useCallback(async () => {
    const res = await apiRequest<VendorRfqResponse>("/vendor/procurement/quotation-requests?limit=50");
    setRfqs(res.data || []);
  }, []);

  const loadDispatchData = useCallback(async () => {
    const [poRes, dispatchRes] = await Promise.all([
      apiRequest<PaginatedResponse<VendorPo>>("/vendor/procurement/purchase-orders?limit=50"),
      apiRequest<PaginatedResponse<VendorDispatch>>("/vendor/procurement/dispatches?limit=50"),
    ]);
    setPurchaseOrders(poRes.data || []);
    setDispatches(dispatchRes.data || []);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.replace("/");
      return;
    }
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      setTimeout(() => {
        try {
          setUser(JSON.parse(raw));
        } catch {
          setUser(null);
        }
      }, 0);
    }
    const id = window.setTimeout(() => {
      void Promise.all([loadRfqs(), loadDispatchData()])
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Unable to load vendor portal data.");
        })
        .finally(() => setPageLoading(false));
    }, 0);
    return () => window.clearTimeout(id);
  }, [router, loadRfqs, loadDispatchData]);

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    router.replace("/");
  };

  const openDispatch = (po: VendorPo) => {
    setSelectedPo(po);
    setVehicleNo("");
    setChallanNo("");
    setDriverName("");
    setGrossWeightKg("");
    setTareWeightKg("");
    setDispatchRemarks("");
    setDispatchQty(Object.fromEntries(po.allocations.map((line) => [line.id, String(line.quantity || "")])));
    setPackingDocuments([]);
    setInvoiceDocuments([]);
    setDispatchModalError("");
    setError("");
    setSuccess("");
  };

  const submitDispatch = async () => {
    if (!selectedPo || !vehicleNo.trim() || !challanNo.trim()) {
      setDispatchModalError("Vehicle No and Challan No are mandatory.");
      return;
    }
    const lines = selectedPo.allocations
      .map((line) => ({
        poAllocationId: line.id,
        dispatchedQty: Number(dispatchQty[line.id] || 0),
      }))
      .filter((line) => line.dispatchedQty > 0);
    if (lines.length === 0) {
      setDispatchModalError("Enter dispatch quantity for at least one PO line.");
      return;
    }
    await withDispatchSubmitLock(async () => {
    setDispatchModalError("");
    try {
      await apiRequest("/vendor/procurement/dispatches", {
        method: "POST",
        body: JSON.stringify({
          poId: selectedPo.id,
          vehicleNo: vehicleNo.trim(),
          challanNo: challanNo.trim(),
          driverName: driverName.trim() || undefined,
          grossWeightKg: grossWeightKg ? Number(grossWeightKg) : undefined,
          tareWeightKg: tareWeightKg ? Number(tareWeightKg) : undefined,
          remarks: dispatchRemarks.trim() || undefined,
          packingDocuments,
          invoiceDocuments,
          lines,
        }),
      });
      setSuccess("Dispatch submitted successfully.");
      setSelectedPo(null);
      await loadDispatchData();
    } catch (err) {
      setDispatchModalError(err instanceof Error ? err.message : "Unable to submit dispatch.");
    }
    });
  };

  const openSubmit = (rfq: VendorRfq) => {
    if (rfq.status !== "SENT") {
      setSelectedRfq(null);
      setError("Quotation has already been submitted for this RFQ.");
      return;
    }
    setSelectedRfq(rfq);
    setValidTill("");
    setPromisedDays("7");
    setPaymentTerms("");
    setTermsOfDelivery("");
    setRates(Object.fromEntries(rfq.lines.map((line) => [line.indentItemId, ""])));
    setGstPercents(
      Object.fromEntries(
        rfq.lines.map((line) => {
          const defaultGst = line.indentItem.item?.hsnCodeRef?.gstRate;
          return [line.indentItemId, defaultGst != null ? String(Number(defaultGst)) : "0"];
        })
      )
    );
    setPhotos([]);
    setQuoteModalError("");
    setError("");
    setSuccess("");
  };

  const submitQuote = async () => {
    if (!selectedRfq || !validTill) {
      setQuoteModalError("Quotation validity date is mandatory.");
      return;
    }
    if (selectedRfq.status !== "SENT") {
      setSelectedRfq(null);
      setError("Quotation has already been submitted for this RFQ.");
      return;
    }
    for (const line of selectedRfq.lines) {
      const rate = Number(rates[line.indentItemId]);
      if (!Number.isFinite(rate) || rate <= 0) {
        setQuoteModalError(`Rate is mandatory for ${line.indentItem.itemCode}. Enter a value greater than zero.`);
        return;
      }
      const gstPercent = Number(gstPercents[line.indentItemId]);
      if (!Number.isFinite(gstPercent) || gstPercent < 0 || gstPercent > 100) {
        setQuoteModalError(`Enter a valid GST % (0–100) for ${line.indentItem.itemCode}.`);
        return;
      }
    }
    await withQuoteSubmitLock(async () => {
    setQuoteModalError("");
    try {
      await apiRequest(`/vendor/procurement/quotation-requests/${selectedRfq.id}/submit`, {
        method: "POST",
        body: JSON.stringify({
          validTill,
          promisedDays: Math.max(0, Math.floor(Number(promisedDays) || 0)),
          paymentTerms: paymentTerms.trim() || undefined,
          termsOfDelivery: termsOfDelivery.trim() || undefined,
          photoUrls: photos.map((photo) => photo.preview),
          lines: selectedRfq.lines.map((line) => ({
            indentItemId: line.indentItemId,
            unitRate: Number(rates[line.indentItemId]),
            gstPercent: Number(gstPercents[line.indentItemId]) || 0,
          })),
        }),
      });
      setSuccess("Quotation submitted successfully.");
      setSelectedRfq(null);
      await loadRfqs();
    } catch (err) {
      setQuoteModalError(err instanceof Error ? err.message : "Unable to submit quotation.");
    }
    });
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest">Vendor Portal</h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">WCCS ERP</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </header>

      <main className="px-8 py-12 max-w-6xl mx-auto space-y-8">
        {pageLoading ? (
          <Loader text="Loading vendor portal..." />
        ) : (
        <>
        <h2 className="text-2xl font-black tracking-tight">
          Welcome{user?.name || user?.fullName || user?.email ? `, ${user.name || user.fullName || user.email}` : ""}.
        </h2>
        {error && <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-bold text-red-600">{error}</div>}
        {success && <div className="rounded-2xl bg-green-50 border border-green-100 px-4 py-3 text-sm font-bold text-green-700">{success}</div>}

        <section className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="text-lg font-black tracking-tight">RFQ Inbox</h3>
            <p className="text-xs font-medium text-gray-400 mt-1">Submit rates for requests sent by WCCS purchase team.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  {["RFQ No", "Items", "Due Date", "Sent On", "Status", "Action"].map((h) => (
                    <th key={h} className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rfqs.map((rfq) => {
                  const canSubmit = rfq.status === "SENT";
                  return (
                  <tr key={rfq.id} className="border-b border-gray-50">
                    <td className="px-5 py-4 text-xs font-mono font-bold">{rfq.requestNo}</td>
                    <td className="px-5 py-4 text-sm font-medium">{rfq.lines.length}</td>
                    <td className="px-5 py-4 text-sm font-medium">{formatDate(rfq.dueDate)}</td>
                    <td className="px-5 py-4 text-sm font-medium">{formatDate(rfq.createdAt)}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${rfq.status === "RESPONDED" ? "bg-green-50 text-green-700" : rfq.status === "CANCELLED" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                        {rfq.status === "RESPONDED" ? "SUBMITTED" : rfq.status}
                      </span>
                      {rfq.respondedAt && (
                        <p className="mt-1 text-[10px] font-medium text-gray-400">
                          Submitted on {formatDate(rfq.respondedAt)}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        disabled={!canSubmit}
                        onClick={() => openSubmit(rfq)}
                        className="rounded-xl bg-black px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                      >
                        {canSubmit ? "Submit Quote" : "Already Submitted"}
                      </button>
                    </td>
                  </tr>
                  );
                })}
                {rfqs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-xs font-bold uppercase tracking-widest text-gray-300">
                      No RFQs available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="text-lg font-black tracking-tight">Dispatch Against Purchase Order</h3>
              <p className="text-xs font-medium text-gray-400 mt-1">Share dispatch, vehicle, challan, documents, and line quantities before WCCS creates GRN.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  {["PO No", "Destination", "Expected Delivery", "Lines", "Status", "Action"].map((h) => (
                    <th key={h} className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map((po) => (
                  <tr key={po.id} className="border-b border-gray-50">
                    <td className="px-5 py-4 text-xs font-mono font-bold">{po.poNo}</td>
                    <td className="px-5 py-4 text-sm font-medium">{po.destination || "-"}</td>
                    <td className="px-5 py-4 text-sm font-medium">{formatDate(po.expectedDeliveryDate)}</td>
                    <td className="px-5 py-4 text-sm font-medium">{po.allocations.length}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700">
                        {po.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => openDispatch(po)}
                        className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white"
                      >
                        <Truck className="h-3.5 w-3.5" />
                        Add Dispatch
                      </button>
                    </td>
                  </tr>
                ))}
                {purchaseOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-xs font-bold uppercase tracking-widest text-gray-300">
                      No open purchase orders available for dispatch.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="text-lg font-black tracking-tight">Submitted Dispatches</h3>
            <p className="text-xs font-medium text-gray-400 mt-1">Dispatch details already sent to WCCS stores team.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  {["Dispatch No", "Status", "PO No", "Vehicle", "Challan", "Lines", "Submitted"].map((h) => (
                    <th key={h} className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dispatches.map((dispatch) => (
                  <tr key={dispatch.id} className="border-b border-gray-50">
                    <td className="px-5 py-4 text-xs font-mono font-bold">{dispatch.dispatchNo}</td>
                    <td className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-600">
                      {(dispatch.status || "SUBMITTED").replaceAll("_", " ")}
                    </td>
                    <td className="px-5 py-4 text-xs font-mono font-bold">{dispatch.po?.poNo || "-"}</td>
                    <td className="px-5 py-4 text-sm font-medium">{dispatch.vehicleNo}</td>
                    <td className="px-5 py-4 text-sm font-medium">{dispatch.challanNo}</td>
                    <td className="px-5 py-4 text-sm font-medium">{dispatch.lines.length}</td>
                    <td className="px-5 py-4 text-sm font-medium">{formatDate(dispatch.createdAt)}</td>
                  </tr>
                ))}
                {dispatches.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-xs font-bold uppercase tracking-widest text-gray-300">
                      No dispatches submitted yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        </>
        )}
      </main>

      {selectedPo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
          <div className="bg-white w-full max-w-6xl rounded-[2rem] shadow-2xl max-h-[90vh] overflow-y-auto p-8 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Vendor Dispatch</p>
                <h2 className="text-2xl font-black tracking-tight">{selectedPo.poNo}</h2>
                <p className="text-xs font-medium text-gray-400 mt-1">This does not create GRN. WCCS will verify and receive separately.</p>
              </div>
              <button onClick={() => { setSelectedPo(null); setDispatchModalError(""); }} className="p-2 hover:bg-gray-50 rounded-full">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            {dispatchModalError && (
              <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-bold text-red-600">
                {dispatchModalError}
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Vehicle No <span className="text-red-500">*</span></label>
                <input value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} className={`w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-black ${dispatchModalError && !vehicleNo.trim() ? "ring-2 ring-red-200" : ""}`} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Challan No <span className="text-red-500">*</span></label>
                <input value={challanNo} onChange={(e) => setChallanNo(e.target.value)} className={`w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-black ${dispatchModalError && !challanNo.trim() ? "ring-2 ring-red-200" : ""}`} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Driver Name</label>
                <input value={driverName} onChange={(e) => setDriverName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-black" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Gross Weight KG</label>
                <input type="number" min={0} value={grossWeightKg} onChange={(e) => setGrossWeightKg(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-black" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tare Weight KG</label>
                <input type="number" min={0} value={tareWeightKg} onChange={(e) => setTareWeightKg(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-black" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Remarks</label>
                <input value={dispatchRemarks} onChange={(e) => setDispatchRemarks(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-black" />
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-100 rounded-2xl">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    {["Item", "HSN", "PO Qty", "Dispatch Qty"].map((h) => (
                      <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedPo.allocations.map((line) => (
                    <tr key={line.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3 text-sm font-bold">
                        {line.poLineItem?.itemCode || "-"} — {line.poLineItem?.itemName || "PO line"}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">{line.poLineItem?.hsnCode || "-"}</td>
                      <td className="px-4 py-3 text-sm font-medium">{Number(line.quantity).toLocaleString("en-IN")} {line.poLineItem?.uom || ""}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          max={Number(line.quantity)}
                          value={dispatchQty[line.id] || ""}
                          onChange={(e) => setDispatchQty((prev) => ({ ...prev, [line.id]: e.target.value }))}
                          className="w-36 px-3 py-2 bg-gray-50 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-black"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {[
                { title: "Packing Documents", docs: packingDocuments, setDocs: setPackingDocuments },
                { title: "Invoice Documents", docs: invoiceDocuments, setDocs: setInvoiceDocuments },
              ].map((group) => (
                <div key={group.title} className="space-y-3 rounded-2xl border border-gray-100 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{group.title}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.docs.map((doc, idx) => (
                      <div key={`${doc.fileName}-${idx}`} className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="max-w-[160px] truncate text-xs font-bold">{doc.fileName}</span>
                        <button type="button" onClick={() => group.setDocs((prev) => prev.filter((_, i) => i !== idx))} className="p-1 hover:bg-red-50 rounded-lg">
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </button>
                      </div>
                    ))}
                    <label className="cursor-pointer flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 hover:border-gray-300 rounded-xl text-xs font-bold text-gray-500 transition-all">
                      <Upload className="w-4 h-4" />
                      Upload
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          const docs = await Promise.all(files.map(readDocument));
                          group.setDocs((prev) => [...prev, ...docs]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => { setSelectedPo(null); setDispatchModalError(""); }} className="px-6 py-3 border border-gray-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50">Cancel</button>
              <SubmitButton onClick={() => void submitDispatch()} loading={dispatchSaving} loadingText="Submitting..." className="bg-black disabled:bg-gray-300 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest">
                Submit Dispatch
              </SubmitButton>
            </div>
          </div>
        </div>
      )}

      {selectedRfq && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
          <div className="bg-white w-full max-w-5xl rounded-[2rem] shadow-2xl max-h-[90vh] overflow-y-auto p-8 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Submit Vendor Quotation</p>
                <h2 className="text-2xl font-black tracking-tight">{selectedRfq.requestNo}</h2>
              </div>
              <button onClick={() => { setSelectedRfq(null); setQuoteModalError(""); }} className="p-2 hover:bg-gray-50 rounded-full">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            {quoteModalError && (
              <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-bold text-red-600">
                {quoteModalError}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Valid Till <span className="text-red-500">*</span></label>
                <input type="date" value={validTill} onChange={(e) => setValidTill(e.target.value)} className={`w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-black ${quoteModalError && !validTill ? "ring-2 ring-red-200" : ""}`} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Promised Days after PO <span className="text-red-500">*</span></label>
                <input type="number" min={0} value={promisedDays} onChange={(e) => setPromisedDays(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-black" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Terms of Delivery</label>
                <select
                  value={termsOfDelivery}
                  onChange={(e) => setTermsOfDelivery(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Select delivery terms</option>
                  {QUOTATION_DELIVERY_TERM_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Payment Terms</label>
                <input
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="e.g. 15 Days, 30 Days from GRN"
                  maxLength={120}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
              Enter line rates excluding GST. Set GST % per line — GST amount and total are auto-calculated.
            </div>

            <div className="overflow-x-auto border border-gray-100 rounded-2xl">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    {["Indent", "Item", "Requested Qty", "Rate", "GST %", "Taxable", "GST Amt", "Total"].map((h) => (
                      <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedRfq.lines.map((line) => {
                    const qty = Number(line.quantity);
                    const rate = Number(rates[line.indentItemId]);
                    const gstPercent = Number(gstPercents[line.indentItemId]) || 0;
                    const taxable = qty > 0 && rate > 0 ? qty * rate : 0;
                    const gstAmount = calcLineGstAmount(taxable, gstPercent);
                    const lineTotal = calcLineTotalInclGst(taxable, gstPercent);
                    return (
                    <tr key={line.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3 text-xs font-mono font-bold">{line.indentItem.indent.documentNo}</td>
                      <td className="px-4 py-3 text-sm font-bold">{line.indentItem.itemCode} — {line.indentItem.itemName}</td>
                      <td className="px-4 py-3 text-sm font-medium">{qty.toLocaleString("en-IN")} {line.indentItem.uom}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={rates[line.indentItemId] || ""}
                          onChange={(e) => setRates((prev) => ({ ...prev, [line.indentItemId]: e.target.value }))}
                          placeholder="0.00"
                          className={`w-32 px-3 py-2 bg-gray-50 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-black ${quoteModalError && !(Number(rates[line.indentItemId]) > 0) ? "ring-2 ring-red-200" : ""}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          value={gstPercents[line.indentItemId] ?? "0"}
                          onChange={(e) => setGstPercents((prev) => ({ ...prev, [line.indentItemId]: e.target.value }))}
                          className="w-20 px-3 py-2 bg-gray-50 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-black"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-700">{taxable > 0 ? formatCurrency(taxable) : "—"}</td>
                      <td className="px-4 py-3 text-sm font-bold text-amber-700">{gstAmount > 0 ? formatCurrency(gstAmount) : "—"}</td>
                      <td className="px-4 py-3 text-sm font-bold text-black">
                        {lineTotal > 0 ? formatCurrency(lineTotal) : "—"}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {selectedRfq.lines.length > 0 && (
              <div className="bg-gray-50 rounded-2xl p-4 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Subtotal</p>
                  <p className="text-lg font-black text-black">
                    {formatCurrency(
                      selectedRfq.lines.reduce((sum, line) => {
                        const qty = Number(line.quantity);
                        const rate = Number(rates[line.indentItemId]) || 0;
                        return sum + (qty > 0 && rate > 0 ? qty * rate : 0);
                      }, 0)
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Total GST</p>
                  <p className="text-lg font-black text-amber-700">
                    {formatCurrency(
                      selectedRfq.lines.reduce((sum, line) => {
                        const qty = Number(line.quantity);
                        const rate = Number(rates[line.indentItemId]) || 0;
                        const taxable = qty > 0 && rate > 0 ? qty * rate : 0;
                        return sum + calcLineGstAmount(taxable, Number(gstPercents[line.indentItemId]) || 0);
                      }, 0)
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Grand Total</p>
                  <p className="text-lg font-black text-black">
                    {formatCurrency(
                      selectedRfq.lines.reduce((sum, line) => {
                        const qty = Number(line.quantity);
                        const rate = Number(rates[line.indentItemId]) || 0;
                        const taxable = qty > 0 && rate > 0 ? qty * rate : 0;
                        return sum + calcLineTotalInclGst(taxable, Number(gstPercents[line.indentItemId]) || 0);
                      }, 0)
                    )}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Quotation Attachments</p>
              <div className="flex flex-wrap gap-3">
                {photos.map((photo, idx) => (
                  <div key={`${photo.fileName}-${idx}`} className="relative flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                    {isPdfAttachment(photo.preview) ? (
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-gray-200">
                        <FileText className="h-5 w-5 text-red-500" />
                      </span>
                    ) : (
                      <Image src={photo.preview} alt="" width={40} height={40} unoptimized className="h-10 w-10 rounded-lg object-cover" />
                    )}
                    <span className="max-w-[140px] truncate text-xs font-bold">{photo.fileName}</span>
                    <button type="button" onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))} className="p-1 hover:bg-red-50 rounded-lg">
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </button>
                  </div>
                ))}
                <label className="cursor-pointer flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 hover:border-gray-300 rounded-xl text-xs font-bold text-gray-500 transition-all">
                  <Upload className="w-4 h-4" />
                  Upload Image/PDF
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []).filter((file) => file.type.startsWith("image/") || file.type === "application/pdf");
                      for (const file of files) {
                        const preview = await readQuotationAttachment(file);
                        setPhotos((prev) => [...prev, { fileName: file.name, preview }]);
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => { setSelectedRfq(null); setQuoteModalError(""); }} className="px-6 py-3 border border-gray-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50">Cancel</button>
              <SubmitButton onClick={() => void submitQuote()} loading={saving} loadingText="Submitting..." className="bg-black disabled:bg-gray-300 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest">
                Submit Quotation
              </SubmitButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
