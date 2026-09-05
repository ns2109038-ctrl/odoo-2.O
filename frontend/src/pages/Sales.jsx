import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  ShoppingCart,
  FileText,
  CreditCard,
  Eye,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  Clock3,
  AlertCircle,
} from "lucide-react";

const initialOrders = [
  {
    id: 1,
    orderNo: "SO-001",
    customer: "ABC Furniture",
    date: "05 Sep 2026",
    amount: 45000,
    status: "Confirmed",
  },
  {
    id: 2,
    orderNo: "SO-002",
    customer: "Modern Interiors",
    date: "04 Sep 2026",
    amount: 28000,
    status: "Draft",
  },
  {
    id: 3,
    orderNo: "SO-003",
    customer: "City Home Decor",
    date: "03 Sep 2026",
    amount: 37500,
    status: "Delivered",
  },
];

const initialInvoices = [
  {
    id: 1,
    invoiceNo: "INV-001",
    customer: "ABC Furniture",
    orderNo: "SO-001",
    date: "05 Sep 2026",
    dueDate: "20 Sep 2026",
    amount: 45000,
    paid: 45000,
    status: "Paid",
  },
  {
    id: 2,
    invoiceNo: "INV-002",
    customer: "Modern Interiors",
    orderNo: "SO-002",
    date: "04 Sep 2026",
    dueDate: "19 Sep 2026",
    amount: 28000,
    paid: 10000,
    status: "Partial",
  },
  {
    id: 3,
    invoiceNo: "INV-003",
    customer: "City Home Decor",
    orderNo: "SO-003",
    date: "03 Sep 2026",
    dueDate: "18 Sep 2026",
    amount: 37500,
    paid: 0,
    status: "Pending",
  },
];

const initialPayments = [
  {
    id: 1,
    paymentNo: "PAY-001",
    invoiceNo: "INV-001",
    customer: "ABC Furniture",
    date: "05 Sep 2026",
    method: "Bank Transfer",
    amount: 45000,
    status: "Received",
  },
  {
    id: 2,
    paymentNo: "PAY-002",
    invoiceNo: "INV-002",
    customer: "Modern Interiors",
    date: "05 Sep 2026",
    method: "UPI",
    amount: 10000,
    status: "Received",
  },
];

function money(value) {
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function statusClass(status) {
  const value = status.toLowerCase();

  if (
    value === "paid" ||
    value === "received" ||
    value === "confirmed" ||
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

export default function Sales() {
  const [activeTab, setActiveTab] = useState("orders");

  const [orders, setOrders] = useState(initialOrders);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [payments, setPayments] = useState(initialPayments);

  const [search, setSearch] = useState("");

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [orderForm, setOrderForm] = useState({
    customer: "",
    date: "",
    amount: "",
    status: "Draft",
  });

  const [invoiceForm, setInvoiceForm] = useState({
    customer: "",
    orderNo: "",
    date: "",
    dueDate: "",
    amount: "",
    status: "Pending",
  });

  const [paymentForm, setPaymentForm] = useState({
    invoiceNo: "",
    customer: "",
    date: "",
    method: "Bank Transfer",
    amount: "",
  });

  const filteredOrders = useMemo(() => {
    const query = search.toLowerCase();

    return orders.filter(
      (item) =>
        item.orderNo.toLowerCase().includes(query) ||
        item.customer.toLowerCase().includes(query) ||
        item.status.toLowerCase().includes(query)
    );
  }, [orders, search]);

  const filteredInvoices = useMemo(() => {
    const query = search.toLowerCase();

    return invoices.filter(
      (item) =>
        item.invoiceNo.toLowerCase().includes(query) ||
        item.customer.toLowerCase().includes(query) ||
        item.status.toLowerCase().includes(query)
    );
  }, [invoices, search]);

  const filteredPayments = useMemo(() => {
    const query = search.toLowerCase();

    return payments.filter(
      (item) =>
        item.paymentNo.toLowerCase().includes(query) ||
        item.invoiceNo.toLowerCase().includes(query) ||
        item.customer.toLowerCase().includes(query)
    );
  }, [payments, search]);

  const totalSales = orders.reduce((sum, item) => sum + item.amount, 0);

  const totalInvoiced = invoices.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  const totalReceived = payments.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  const totalReceivable = invoices.reduce(
    (sum, item) => sum + (item.amount - item.paid),
    0
  );

  function openOrderModal() {
    setSelectedOrder(null);

    setOrderForm({
      customer: "",
      date: "",
      amount: "",
      status: "Draft",
    });

    setShowOrderModal(true);
  }

  function openEditOrder(order) {
    setSelectedOrder(order);

    setOrderForm({
      customer: order.customer,
      date: order.date,
      amount: order.amount,
      status: order.status,
    });

    setShowOrderModal(true);
  }

  function saveOrder(event) {
    event.preventDefault();

    if (!orderForm.customer || !orderForm.amount) {
      return;
    }

    if (selectedOrder) {
      setOrders((current) =>
        current.map((item) =>
          item.id === selectedOrder.id
            ? {
                ...item,
                customer: orderForm.customer,
                date: orderForm.date || "05 Sep 2026",
                amount: Number(orderForm.amount),
                status: orderForm.status,
              }
            : item
        )
      );
    } else {
      const newOrder = {
        id: Date.now(),
        orderNo: `SO-${String(orders.length + 1).padStart(3, "0")}`,
        customer: orderForm.customer,
        date: orderForm.date || "05 Sep 2026",
        amount: Number(orderForm.amount),
        status: orderForm.status,
      };

      setOrders((current) => [newOrder, ...current]);
    }

    setShowOrderModal(false);
  }

  function deleteOrder(id) {
    setOrders((current) => current.filter((item) => item.id !== id));
  }

  function confirmOrder(id) {
    setOrders((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status: "Confirmed" } : item
      )
    );
  }

  function createInvoiceFromOrder(order) {
    setInvoiceForm({
      customer: order.customer,
      orderNo: order.orderNo,
      date: "",
      dueDate: "",
      amount: order.amount,
      status: "Pending",
    });

    setShowInvoiceModal(true);
  }

  function openInvoiceModal() {
    setInvoiceForm({
      customer: "",
      orderNo: "",
      date: "",
      dueDate: "",
      amount: "",
      status: "Pending",
    });

    setShowInvoiceModal(true);
  }

  function saveInvoice(event) {
    event.preventDefault();

    if (!invoiceForm.customer || !invoiceForm.amount) {
      return;
    }

    const newInvoice = {
      id: Date.now(),
      invoiceNo: `INV-${String(invoices.length + 1).padStart(3, "0")}`,
      customer: invoiceForm.customer,
      orderNo: invoiceForm.orderNo || "-",
      date: invoiceForm.date || "05 Sep 2026",
      dueDate: invoiceForm.dueDate || "20 Sep 2026",
      amount: Number(invoiceForm.amount),
      paid: 0,
      status: invoiceForm.status,
    };

    setInvoices((current) => [newInvoice, ...current]);

    setShowInvoiceModal(false);
  }

  function deleteInvoice(id) {
    setInvoices((current) =>
      current.filter((item) => item.id !== id)
    );
  }

  function openPaymentModal(invoice = null) {
    setSelectedInvoice(invoice);

    setPaymentForm({
      invoiceNo: invoice?.invoiceNo || "",
      customer: invoice?.customer || "",
      date: "",
      method: "Bank Transfer",
      amount: invoice
        ? Math.max(invoice.amount - invoice.paid, 0)
        : "",
    });

    setShowPaymentModal(true);
  }

  function savePayment(event) {
    event.preventDefault();

    if (!paymentForm.invoiceNo || !paymentForm.amount) {
      return;
    }

    const paymentAmount = Number(paymentForm.amount);

    const newPayment = {
      id: Date.now(),
      paymentNo: `PAY-${String(payments.length + 1).padStart(3, "0")}`,
      invoiceNo: paymentForm.invoiceNo,
      customer: paymentForm.customer,
      date: paymentForm.date || "05 Sep 2026",
      method: paymentForm.method,
      amount: paymentAmount,
      status: "Received",
    };

    setPayments((current) => [newPayment, ...current]);

    setInvoices((current) =>
      current.map((invoice) => {
        if (invoice.invoiceNo !== paymentForm.invoiceNo) {
          return invoice;
        }

        const newPaid = Math.min(
          invoice.paid + paymentAmount,
          invoice.amount
        );

        return {
          ...invoice,
          paid: newPaid,
          status:
            newPaid >= invoice.amount
              ? "Paid"
              : newPaid > 0
              ? "Partial"
              : "Pending",
        };
      })
    );

    setShowPaymentModal(false);
  }

  function deletePayment(id) {
    setPayments((current) =>
      current.filter((item) => item.id !== id)
    );
  }

  return (
    <div className="module-page">

      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h1>Sales</h1>
          <p>
            Manage sales orders, customer invoices and payments.
          </p>
        </div>

        <div className="financial-year">
          FY 2026-27
        </div>
      </div>

      {/* SUMMARY */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-top">
            <div>
              <div className="stat-title">Sales Orders</div>
              <div className="stat-value">
                {orders.length}
              </div>
            </div>

            <div className="stat-icon">
              <ShoppingCart size={18} />
            </div>
          </div>

          <div className="stat-change">
            <span>{money(totalSales)}</span>
            <small>Total order value</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div>
              <div className="stat-title">Customer Invoices</div>
              <div className="stat-value">
                {invoices.length}
              </div>
            </div>

            <div className="stat-icon">
              <FileText size={18} />
            </div>
          </div>

          <div className="stat-change">
            <span>{money(totalInvoiced)}</span>
            <small>Total invoiced</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div>
              <div className="stat-title">Received</div>
              <div className="stat-value">
                {money(totalReceived)}
              </div>
            </div>

            <div className="stat-icon">
              <CheckCircle2 size={18} />
            </div>
          </div>

          <div className="stat-change">
            <span>Collected</span>
            <small>Customer payments</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div>
              <div className="stat-title">Receivable</div>
              <div className="stat-value">
                {money(totalReceivable)}
              </div>
            </div>

            <div className="stat-icon">
              <Clock3 size={18} />
            </div>
          </div>

          <div className="stat-change">
            <span>Pending</span>
            <small>Amount to receive</small>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div
        className="module-toolbar"
        style={{
          marginBottom: "12px",
          justifyContent: "flex-start",
        }}
      >
        <button
          className={
            activeTab === "orders"
              ? "primary-button"
              : "secondary-button"
          }
          onClick={() => {
            setActiveTab("orders");
            setSearch("");
          }}
        >
          <ShoppingCart size={14} />
          {" "}Sales Orders
        </button>

        <button
          className={
            activeTab === "invoices"
              ? "primary-button"
              : "secondary-button"
          }
          onClick={() => {
            setActiveTab("invoices");
            setSearch("");
          }}
        >
          <FileText size={14} />
          {" "}Customer Invoices
        </button>

        <button
          className={
            activeTab === "payments"
              ? "primary-button"
              : "secondary-button"
          }
          onClick={() => {
            setActiveTab("payments");
            setSearch("");
          }}
        >
          <CreditCard size={14} />
          {" "}Invoice Payments
        </button>
      </div>

      {/* TOOLBAR */}
      <div className="module-toolbar">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flex: 1,
          }}
        >
          <Search size={17} color="#94a3b8" />

          <input
            type="text"
            placeholder={
              activeTab === "orders"
                ? "Search sales orders..."
                : activeTab === "invoices"
                ? "Search customer invoices..."
                : "Search payments..."
            }
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {activeTab === "orders" && (
          <button
            className="primary-button"
            onClick={openOrderModal}
          >
            <Plus size={15} />
            {" "}Create Sales Order
          </button>
        )}

        {activeTab === "invoices" && (
          <button
            className="primary-button"
            onClick={openInvoiceModal}
          >
            <Plus size={15} />
            {" "}Create Invoice
          </button>
        )}

        {activeTab === "payments" && (
          <button
            className="primary-button"
            onClick={() => openPaymentModal()}
          >
            <Plus size={15} />
            {" "}Record Payment
          </button>
        )}
      </div>

      {/* SALES ORDERS */}
      {activeTab === "orders" && (
        <div className="module-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order No.</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong>{order.orderNo}</strong>
                  </td>

                  <td>{order.customer}</td>

                  <td>{order.date}</td>

                  <td>
                    <strong>{money(order.amount)}</strong>
                  </td>

                  <td>
                    <span className={statusClass(order.status)}>
                      {order.status}
                    </span>
                  </td>

                  <td>
                    <div className="action-buttons">

                      <button
                        className="action-button"
                        title="View"
                      >
                        <Eye size={14} />
                      </button>

                      <button
                        className="action-button"
                        title="Edit"
                        onClick={() => openEditOrder(order)}
                      >
                        <Pencil size={14} />
                      </button>

                      {order.status === "Draft" && (
                        <button
                          className="action-button"
                          title="Confirm"
                          onClick={() =>
                            confirmOrder(order.id)
                          }
                        >
                          <CheckCircle2 size={14} />
                        </button>
                      )}

                      <button
                        className="action-button"
                        title="Create Invoice"
                        onClick={() =>
                          createInvoiceFromOrder(order)
                        }
                      >
                        <FileText size={14} />
                      </button>

                      <button
                        className="action-button delete-button"
                        title="Delete"
                        onClick={() =>
                          deleteOrder(order.id)
                        }
                      >
                        <Trash2 size={14} />
                      </button>

                    </div>
                  </td>
                </tr>
              ))}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan="6">
                    No sales orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CUSTOMER INVOICES */}
      {activeTab === "invoices" && (
        <div className="module-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice No.</th>
                <th>Customer</th>
                <th>Sales Order</th>
                <th>Invoice Date</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>
                    <strong>{invoice.invoiceNo}</strong>
                  </td>

                  <td>{invoice.customer}</td>

                  <td>{invoice.orderNo}</td>

                  <td>{invoice.date}</td>

                  <td>
                    <strong>{money(invoice.amount)}</strong>
                  </td>

                  <td>
                    {money(invoice.paid)}
                  </td>

                  <td>
                    <span className={statusClass(invoice.status)}>
                      {invoice.status}
                    </span>
                  </td>

                  <td>
                    <div className="action-buttons">

                      <button
                        className="action-button"
                        title="View"
                      >
                        <Eye size={14} />
                      </button>

                      {invoice.status !== "Paid" && (
                        <button
                          className="action-button"
                          title="Record Payment"
                          onClick={() =>
                            openPaymentModal(invoice)
                          }
                        >
                          <CreditCard size={14} />
                        </button>
                      )}

                      <button
                        className="action-button delete-button"
                        title="Delete"
                        onClick={() =>
                          deleteInvoice(invoice.id)
                        }
                      >
                        <Trash2 size={14} />
                      </button>

                    </div>
                  </td>
                </tr>
              ))}

              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan="8">
                    No invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* PAYMENTS */}
      {activeTab === "payments" && (
        <div className="module-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Payment No.</th>
                <th>Invoice No.</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Payment Method</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredPayments.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    <strong>{payment.paymentNo}</strong>
                  </td>

                  <td>{payment.invoiceNo}</td>

                  <td>{payment.customer}</td>

                  <td>{payment.date}</td>

                  <td>{payment.method}</td>

                  <td>
                    <strong>{money(payment.amount)}</strong>
                  </td>

                  <td>
                    <span className={statusClass(payment.status)}>
                      {payment.status}
                    </span>
                  </td>

                  <td>
                    <div className="action-buttons">

                      <button
                        className="action-button"
                        title="View"
                      >
                        <Eye size={14} />
                      </button>

                      <button
                        className="action-button delete-button"
                        title="Delete"
                        onClick={() =>
                          deletePayment(payment.id)
                        }
                      >
                        <Trash2 size={14} />
                      </button>

                    </div>
                  </td>
                </tr>
              ))}

              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan="8">
                    No payments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ORDER MODAL */}
      {showOrderModal && (
        <div className="modal-overlay">
          <div className="modal-box">

            <div className="modal-header">
              <h2>
                {selectedOrder
                  ? "Edit Sales Order"
                  : "Create Sales Order"}
              </h2>

              <button
                className="modal-close"
                onClick={() =>
                  setShowOrderModal(false)
                }
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={saveOrder}>
              <div className="modal-body">

                <div className="form-grid">

                  <div className="form-group">
                    <label>Customer</label>

                    <select
                      value={orderForm.customer}
                      onChange={(event) =>
                        setOrderForm({
                          ...orderForm,
                          customer: event.target.value,
                        })
                      }
                    >
                      <option value="">
                        Select Customer
                      </option>

                      <option>
                        ABC Furniture
                      </option>

                      <option>
                        Modern Interiors
                      </option>

                      <option>
                        City Home Decor
                      </option>

                      <option>
                        Royal Furniture
                      </option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Order Date</label>

                    <input
                      type="date"
                      value={orderForm.date}
                      onChange={(event) =>
                        setOrderForm({
                          ...orderForm,
                          date: event.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Order Amount</label>

                    <input
                      type="number"
                      placeholder="Enter amount"
                      value={orderForm.amount}
                      onChange={(event) =>
                        setOrderForm({
                          ...orderForm,
                          amount: event.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Status</label>

                    <select
                      value={orderForm.status}
                      onChange={(event) =>
                        setOrderForm({
                          ...orderForm,
                          status: event.target.value,
                        })
                      }
                    >
                      <option>Draft</option>
                      <option>Confirmed</option>
                      <option>Delivered</option>
                    </select>
                  </div>

                </div>

              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setShowOrderModal(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  {selectedOrder
                    ? "Update Order"
                    : "Create Order"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* INVOICE MODAL */}
      {showInvoiceModal && (
        <div className="modal-overlay">
          <div className="modal-box">

            <div className="modal-header">
              <h2>Create Customer Invoice</h2>

              <button
                className="modal-close"
                onClick={() =>
                  setShowInvoiceModal(false)
                }
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={saveInvoice}>
              <div className="modal-body">

                <div className="form-grid">

                  <div className="form-group">
                    <label>Customer</label>

                    <select
                      value={invoiceForm.customer}
                      onChange={(event) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          customer: event.target.value,
                        })
                      }
                    >
                      <option value="">
                        Select Customer
                      </option>

                      <option>
                        ABC Furniture
                      </option>

                      <option>
                        Modern Interiors
                      </option>

                      <option>
                        City Home Decor
                      </option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Sales Order</label>

                    <input
                      type="text"
                      placeholder="SO-001"
                      value={invoiceForm.orderNo}
                      onChange={(event) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          orderNo: event.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Invoice Date</label>

                    <input
                      type="date"
                      value={invoiceForm.date}
                      onChange={(event) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          date: event.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Due Date</label>

                    <input
                      type="date"
                      value={invoiceForm.dueDate}
                      onChange={(event) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          dueDate: event.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Invoice Amount</label>

                    <input
                      type="number"
                      placeholder="Enter amount"
                      value={invoiceForm.amount}
                      onChange={(event) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          amount: event.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Status</label>

                    <select
                      value={invoiceForm.status}
                      onChange={(event) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          status: event.target.value,
                        })
                      }
                    >
                      <option>Pending</option>
                      <option>Paid</option>
                    </select>
                  </div>

                </div>

              </div>

              <div className="modal-footer">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setShowInvoiceModal(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  Create Invoice
                </button>

              </div>
            </form>

          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="modal-box">

            <div className="modal-header">
              <h2>Record Invoice Payment</h2>

              <button
                className="modal-close"
                onClick={() =>
                  setShowPaymentModal(false)
                }
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={savePayment}>
              <div className="modal-body">

                <div className="form-grid">

                  <div className="form-group">
                    <label>Invoice No.</label>

                    <input
                      type="text"
                      placeholder="INV-001"
                      value={paymentForm.invoiceNo}
                      onChange={(event) =>
                        setPaymentForm({
                          ...paymentForm,
                          invoiceNo: event.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Customer</label>

                    <input
                      type="text"
                      placeholder="Customer name"
                      value={paymentForm.customer}
                      onChange={(event) =>
                        setPaymentForm({
                          ...paymentForm,
                          customer: event.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Payment Date</label>

                    <input
                      type="date"
                      value={paymentForm.date}
                      onChange={(event) =>
                        setPaymentForm({
                          ...paymentForm,
                          date: event.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Payment Method</label>

                    <select
                      value={paymentForm.method}
                      onChange={(event) =>
                        setPaymentForm({
                          ...paymentForm,
                          method: event.target.value,
                        })
                      }
                    >
                      <option>
                        Bank Transfer
                      </option>

                      <option>
                        UPI
                      </option>

                      <option>
                        Cash
                      </option>

                      <option>
                        Cheque
                      </option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Payment Amount</label>

                    <input
                      type="number"
                      placeholder="Enter amount"
                      value={paymentForm.amount}
                      onChange={(event) =>
                        setPaymentForm({
                          ...paymentForm,
                          amount: event.target.value,
                        })
                      }
                    />
                  </div>

                </div>

                <div
                  style={{
                    marginTop: "18px",
                    padding: "12px",
                    background: "#f8fafc",
                    borderRadius: "8px",
                    display: "flex",
                    gap: "9px",
                    alignItems: "center",
                  }}
                >
                  <AlertCircle
                    size={16}
                    color="#6366f1"
                  />

                  <span
                    style={{
                      fontSize: "10px",
                      color: "#64748b",
                    }}
                  >
                    Payment will automatically update the
                    invoice paid amount and status.
                  </span>
                </div>

              </div>

              <div className="modal-footer">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setShowPaymentModal(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  Record Payment
                </button>

              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}