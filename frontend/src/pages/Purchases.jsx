import { useMemo, useState, useEffect } from "react";
import {
  Search,
  ShoppingCart,
  FileText,
  CreditCard,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import {
  getPurchaseOrders,
  createPurchaseOrder,
  confirmPurchaseOrder,
  getInvoices,
  createInvoice,
  postInvoice,
  getPayments,
  createPayment,
  getContacts,
  getProducts,
  getJournals,
} from "../lib/api.js";
import Alert from "../components/ui/Alert.jsx";

function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function statusClass(status) {
  const value = (status || "").toLowerCase();
  if (
    value === "paid" ||
    value === "received" ||
    value === "confirmed" ||
    value === "posted" ||
    value === "delivered"
  ) {
    return "badge active";
  }
  if (value === "pending" || value === "partial") {
    return "badge vendor";
  }
  if (value === "draft") {
    return "badge inactive";
  }
  return "badge inactive";
}

export default function Purchases({ initialTab = "orders" } = {}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);
  const [orders, setOrders] = useState([]);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState("");

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [orderForm, setOrderForm] = useState({
    vendor_id: "",
    product_id: "",
    quantity: "1",
    unit_price: "",
  });

  const [billForm, setBillForm] = useState({
    contact_id: "",
    due_date: "",
    product_id: "",
    quantity: "1",
    unit_price: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    contact_id: "",
    journal_id: "",
    amount: "",
    reference: "",
  });

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [poRes, billRes, payRes, contactsData, prodsData, jData] = await Promise.all([
        getPurchaseOrders(),
        getInvoices({ invoice_type: "vendor_bill" }),
        getPayments({ payment_type: "vendor_payment" }),
        getContacts(),
        getProducts(),
        getJournals(),
      ]);

      setOrders(
        (poRes?.data || []).map((o) => ({
          id: o.id,
          orderNo: o.order_number,
          vendor: o.vendor?.name || `Vendor #${o.vendor_id}`,
          date: o.order_date,
          amount: Number(o.total || 0),
          status: o.status ? o.status.charAt(0).toUpperCase() + o.status.slice(1) : "Draft",
        }))
      );

      setBills(
        (billRes?.data || []).map((i) => ({
          id: i.id,
          billNo: i.invoice_number,
          vendor: i.contact?.name || `Vendor #${i.contact_id}`,
          date: i.invoice_date,
          dueDate: i.due_date || "-",
          amount: Number(i.total || 0),
          paid: i.status === "paid" ? Number(i.total || 0) : 0,
          status: i.status ? i.status.charAt(0).toUpperCase() + i.status.slice(1) : "Draft",
        }))
      );

      setPayments(
        (payRes?.data || []).map((p) => ({
          id: p.id,
          paymentNo: p.payment_number,
          billNo: p.reference || "-",
          vendor: p.contact?.name || `Vendor #${p.contact_id}`,
          date: p.payment_date,
          method: p.journal?.journal_name || "Bank",
          amount: Number(p.amount || 0),
          status: p.status ? p.status.charAt(0).toUpperCase() + p.status.slice(1) : "Draft",
        }))
      );

      const vendorList = (contactsData || []).filter(
        (c) => c.contact_type?.toLowerCase() === "vendor" || !c.contact_type
      );
      setVendors(vendorList.length > 0 ? vendorList : contactsData || []);
      setProducts(prodsData || []);
      setJournals(jData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredOrders = useMemo(() => {
    const query = search.toLowerCase();
    return orders.filter(
      (item) =>
        item.orderNo?.toLowerCase().includes(query) ||
        item.vendor?.toLowerCase().includes(query) ||
        item.status?.toLowerCase().includes(query)
    );
  }, [orders, search]);

  const filteredBills = useMemo(() => {
    const query = search.toLowerCase();
    return bills.filter(
      (item) =>
        item.billNo?.toLowerCase().includes(query) ||
        item.vendor?.toLowerCase().includes(query) ||
        item.status?.toLowerCase().includes(query)
    );
  }, [bills, search]);

  const filteredPayments = useMemo(() => {
    const query = search.toLowerCase();
    return payments.filter(
      (item) =>
        item.paymentNo?.toLowerCase().includes(query) ||
        item.billNo?.toLowerCase().includes(query) ||
        item.vendor?.toLowerCase().includes(query)
    );
  }, [payments, search]);

  const totalPurchases = orders.reduce((sum, item) => sum + item.amount, 0);
  const totalBilled = bills.reduce((sum, item) => sum + item.amount, 0);
  const totalPaid = payments.reduce((sum, item) => sum + item.amount, 0);
  const totalPayable = bills.reduce(
    (sum, item) => sum + (item.amount - item.paid),
    0
  );

  function openOrderModal() {
    setOrderForm({
      vendor_id: vendors[0]?.id ? String(vendors[0].id) : "",
      product_id: products[0]?.id ? String(products[0].id) : "",
      quantity: "1",
      unit_price: products[0]?.purchase_price ? String(products[0].purchase_price) : "0",
    });
    setShowOrderModal(true);
  }

  async function saveOrder(event) {
    event.preventDefault();
    if (!orderForm.vendor_id || !orderForm.product_id) {
      alert("Please select vendor and product.");
      return;
    }

    setSubmitting(true);
    try {
      await createPurchaseOrder({
        vendor_id: Number(orderForm.vendor_id),
        lines: [
          {
            product_id: Number(orderForm.product_id),
            quantity: Number(orderForm.quantity || 1),
            unit_price: Number(orderForm.unit_price || 0),
          },
        ],
      });
      setShowOrderModal(false);
      await loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmOrder(id) {
    try {
      await confirmPurchaseOrder(id);
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  function openBillModal() {
    setBillForm({
      contact_id: vendors[0]?.id ? String(vendors[0].id) : "",
      due_date: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
      product_id: products[0]?.id ? String(products[0].id) : "",
      quantity: "1",
      unit_price: products[0]?.purchase_price ? String(products[0].purchase_price) : "0",
    });
    setShowBillModal(true);
  }

  async function saveBill(event) {
    event.preventDefault();
    if (!billForm.contact_id) {
      alert("Please select vendor.");
      return;
    }

    setSubmitting(true);
    try {
      await createInvoice({
        invoice_type: "vendor_bill",
        contact_id: Number(billForm.contact_id),
        due_date: billForm.due_date || null,
        lines: [
          {
            product_id: billForm.product_id ? Number(billForm.product_id) : undefined,
            description: "Purchase Item",
            quantity: Number(billForm.quantity || 1),
            unit_price: Number(billForm.unit_price || 0),
          },
        ],
      });
      setShowBillModal(false);
      await loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePostBill(id) {
    try {
      await postInvoice(id);
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  function openPaymentModal(bill = null) {
    setPaymentForm({
      contact_id: vendors[0]?.id ? String(vendors[0].id) : "",
      journal_id: journals[0]?.id ? String(journals[0].id) : "",
      amount: bill ? String(bill.amount - bill.paid) : "0",
      reference: bill ? bill.billNo : "",
    });
    setShowPaymentModal(true);
  }

  async function savePayment(event) {
    event.preventDefault();
    if (!paymentForm.contact_id || !paymentForm.journal_id || Number(paymentForm.amount) <= 0) {
      alert("Please fill in vendor, payment journal, and valid amount.");
      return;
    }

    setSubmitting(true);
    try {
      await createPayment({
        payment_type: "vendor_payment",
        contact_id: Number(paymentForm.contact_id),
        journal_id: Number(paymentForm.journal_id),
        amount: Number(paymentForm.amount),
        reference: paymentForm.reference || null,
      });
      setShowPaymentModal(false);
      await loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="module-page">
      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h1>Purchases</h1>
          <p>Manage purchase orders, vendor bills and outgoing payments.</p>
        </div>
        <div className="financial-year">FY 2026-27</div>
      </div>

      {error && <Alert type="error" style={{ marginBottom: "16px" }}>{error}</Alert>}

      {/* SUMMARY */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-top">
            <div>
              <div className="stat-title">Purchase Orders</div>
              <div className="stat-value">{orders.length}</div>
            </div>
            <div className="stat-icon"><ShoppingCart size={18} /></div>
          </div>
          <div className="stat-change">
            <span>{money(totalPurchases)}</span>
            <small>Total order value</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div>
              <div className="stat-title">Vendor Bills</div>
              <div className="stat-value">{bills.length}</div>
            </div>
            <div className="stat-icon"><FileText size={18} /></div>
          </div>
          <div className="stat-change">
            <span>{money(totalBilled)}</span>
            <small>Total billed</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div>
              <div className="stat-title">Paid</div>
              <div className="stat-value">{money(totalPaid)}</div>
            </div>
            <div className="stat-icon"><CheckCircle2 size={18} /></div>
          </div>
          <div className="stat-change">
            <span>Disbursed</span>
            <small>Vendor payments</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div>
              <div className="stat-title">Payable</div>
              <div className="stat-value">{money(totalPayable)}</div>
            </div>
            <div className="stat-icon"><Clock3 size={18} /></div>
          </div>
          <div className="stat-change">
            <span>Pending</span>
            <small>Amount to pay</small>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="module-toolbar" style={{ marginBottom: "12px", justifyContent: "flex-start", gap: "10px" }}>
        <button
          className={activeTab === "orders" ? "primary-btn" : "secondary-btn"}
          onClick={() => { setActiveTab("orders"); setSearch(""); }}
        >
          <ShoppingCart size={14} /> Purchase Orders
        </button>

        <button
          className={activeTab === "bills" ? "primary-btn" : "secondary-btn"}
          onClick={() => { setActiveTab("bills"); setSearch(""); }}
        >
          <FileText size={14} /> Vendor Bills
        </button>

        <button
          className={activeTab === "payments" ? "primary-btn" : "secondary-btn"}
          onClick={() => { setActiveTab("payments"); setSearch(""); }}
        >
          <CreditCard size={14} /> Vendor Payments
        </button>
      </div>

      {/* TOOLBAR */}
      <div className="module-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
          <Search size={17} color="#94a3b8" />
          <input
            type="text"
            placeholder={
              activeTab === "orders"
                ? "Search purchase orders..."
                : activeTab === "bills"
                ? "Search vendor bills..."
                : "Search payments..."
            }
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {activeTab === "orders" && (
          <button className="primary-btn" onClick={openOrderModal}>
            + New Purchase Order
          </button>
        )}
        {activeTab === "bills" && (
          <button className="primary-btn" onClick={openBillModal}>
            + New Vendor Bill
          </button>
        )}
        {activeTab === "payments" && (
          <button className="primary-btn" onClick={() => openPaymentModal()}>
            + Record Payment
          </button>
        )}
      </div>

      {/* TAB 1: ORDERS */}
      {activeTab === "orders" && (
        <div className="module-card">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order No</th>
                  <th>Vendor</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="empty-state">Loading purchase orders...</td></tr>
                ) : filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td><strong>{order.orderNo}</strong></td>
                      <td>{order.vendor}</td>
                      <td>{order.date}</td>
                      <td>{money(order.amount)}</td>
                      <td><span className={statusClass(order.status)}>{order.status}</span></td>
                      <td>
                        {order.status === "Draft" && (
                          <button className="small-btn" onClick={() => handleConfirmOrder(order.id)}>
                            Confirm
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="6" className="empty-state">No purchase orders found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: BILLS */}
      {activeTab === "bills" && (
        <div className="module-card">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bill No</th>
                  <th>Vendor</th>
                  <th>Date</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className="empty-state">Loading bills...</td></tr>
                ) : filteredBills.length > 0 ? (
                  filteredBills.map((bill) => (
                    <tr key={bill.id}>
                      <td><strong>{bill.billNo}</strong></td>
                      <td>{bill.vendor}</td>
                      <td>{bill.date}</td>
                      <td>{bill.dueDate}</td>
                      <td>{money(bill.amount)}</td>
                      <td><span className={statusClass(bill.status)}>{bill.status}</span></td>
                      <td>
                        {bill.status === "Draft" ? (
                          <button className="small-btn" onClick={() => handlePostBill(bill.id)}>
                            Post
                          </button>
                        ) : bill.status !== "Paid" ? (
                          <button className="small-btn" onClick={() => openPaymentModal(bill)}>
                            Pay
                          </button>
                        ) : (
                          <CheckCircle2 size={16} color="#16a34a" />
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="7" className="empty-state">No vendor bills found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PAYMENTS */}
      {activeTab === "payments" && (
        <div className="module-card">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Payment No</th>
                  <th>Vendor</th>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="empty-state">Loading payments...</td></tr>
                ) : filteredPayments.length > 0 ? (
                  filteredPayments.map((p) => (
                    <tr key={p.id}>
                      <td><strong>{p.paymentNo}</strong></td>
                      <td>{p.vendor}</td>
                      <td>{p.date}</td>
                      <td><span className="badge blue">{p.method}</span></td>
                      <td>{money(p.amount)}</td>
                      <td><span className={statusClass(p.status)}>{p.status}</span></td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="6" className="empty-state">No payments recorded</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ORDER MODAL */}
      {showOrderModal && (
        <div className="modal-overlay" onClick={() => setShowOrderModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Purchase Order</h2>
              <button className="close-btn" onClick={() => setShowOrderModal(false)}>×</button>
            </div>
            <form onSubmit={saveOrder}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Vendor *</label>
                  <select
                    value={orderForm.vendor_id}
                    onChange={(e) => setOrderForm({ ...orderForm, vendor_id: e.target.value })}
                    required
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Product *</label>
                  <select
                    value={orderForm.product_id}
                    onChange={(e) => {
                      const p = products.find((x) => String(x.id) === e.target.value);
                      setOrderForm({
                        ...orderForm,
                        product_id: e.target.value,
                        unit_price: p?.purchase_price ? String(p.purchase_price) : orderForm.unit_price,
                      });
                    }}
                    required
                  >
                    <option value="">Select Product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={orderForm.quantity}
                    onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Unit Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={orderForm.unit_price}
                    onChange={(e) => setOrderForm({ ...orderForm, unit_price: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowOrderModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={submitting}>
                  {submitting ? "Creating..." : "Create Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BILL MODAL */}
      {showBillModal && (
        <div className="modal-overlay" onClick={() => setShowBillModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Vendor Bill</h2>
              <button className="close-btn" onClick={() => setShowBillModal(false)}>×</button>
            </div>
            <form onSubmit={saveBill}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Vendor *</label>
                  <select
                    value={billForm.contact_id}
                    onChange={(e) => setBillForm({ ...billForm, contact_id: e.target.value })}
                    required
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={billForm.due_date}
                    onChange={(e) => setBillForm({ ...billForm, due_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Product</label>
                  <select
                    value={billForm.product_id}
                    onChange={(e) => {
                      const p = products.find((x) => String(x.id) === e.target.value);
                      setBillForm({
                        ...billForm,
                        product_id: e.target.value,
                        unit_price: p?.purchase_price ? String(p.purchase_price) : billForm.unit_price,
                      });
                    }}
                  >
                    <option value="">Select Product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Unit Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={billForm.unit_price}
                    onChange={(e) => setBillForm({ ...billForm, unit_price: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowBillModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={submitting}>
                  {submitting ? "Creating..." : "Create Bill"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Record Vendor Payment</h2>
              <button className="close-btn" onClick={() => setShowPaymentModal(false)}>×</button>
            </div>
            <form onSubmit={savePayment}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Vendor *</label>
                  <select
                    value={paymentForm.contact_id}
                    onChange={(e) => setPaymentForm({ ...paymentForm, contact_id: e.target.value })}
                    required
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Payment Journal *</label>
                  <select
                    value={paymentForm.journal_id}
                    onChange={(e) => setPaymentForm({ ...paymentForm, journal_id: e.target.value })}
                    required
                  >
                    <option value="">Select Bank / Cash Journal</option>
                    {journals.map((j) => (
                      <option key={j.id} value={j.id}>{j.journal_name} ({j.journal_type})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Payment Amount (₹) *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Reference / Bill #</label>
                  <input
                    type="text"
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                    placeholder="e.g. BILL-001"
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowPaymentModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={submitting}>
                  {submitting ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
