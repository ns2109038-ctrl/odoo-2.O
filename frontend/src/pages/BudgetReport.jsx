import { useMemo, useState, useEffect } from "react";
import { getBudgetReport, getTrialBalanceReport, getBalanceSheetReport, getProfitLossReport } from "../lib/api.js";
import Alert from "../components/ui/Alert.jsx";

function BudgetReport() {
  const [reportType, setReportType] = useState("budget"); // "budget" | "trial-balance" | "balance-sheet" | "profit-loss"
  const [view, setView] = useState("list");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [budgetReportData, setBudgetReportData] = useState(null);
  const [tbData, setTbData] = useState(null);
  const [bsData, setBsData] = useState(null);
  const [plData, setPlData] = useState(null);

  const loadReport = async () => {
    setLoading(true);
    setError("");
    try {
      if (reportType === "budget") {
        const data = await getBudgetReport();
        setBudgetReportData(data);
      } else if (reportType === "trial-balance") {
        const data = await getTrialBalanceReport();
        setTbData(data);
      } else if (reportType === "balance-sheet") {
        const data = await getBalanceSheetReport();
        setBsData(data);
      } else if (reportType === "profit-loss") {
        const data = await getProfitLossReport();
        setPlData(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportType]);

  const rawReports = useMemo(() => {
    if (!budgetReportData?.items) return [];
    return budgetReportData.items.map((it, idx) => ({
      id: it.account_id || idx + 1,
      department: it.name || "Account",
      original: Number(it.planned || 0),
      revised: Number(it.planned || 0),
      used: Number(it.actual || 0),
    }));
  }, [budgetReportData]);

  const filteredReports = rawReports.filter((report) =>
    report.department.toLowerCase().includes(search.toLowerCase())
  );

  const totals = useMemo(() => {
    return filteredReports.reduce(
      (total, report) => {
        total.original += report.original;
        total.revised += report.revised;
        total.used += report.used;
        return total;
      },
      {
        original: 0,
        revised: 0,
        used: 0,
      }
    );
  }, [filteredReports]);

  const remaining = totals.revised - totals.used;

  const usedPercentage =
    totals.revised > 0
      ? Math.round((totals.used / totals.revised) * 100)
      : 0;

  const formatMoney = (amount) => {
    return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
  };

  const getPercentage = (used, revised) => {
    if (!revised) return 0;
    return Math.min(100, Math.round((used / revised) * 100));
  };

  return (
    <div className="module-page">
      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1>Financial & Budget Reports</h1>
          <p>Analyze trial balance, balance sheet, profit & loss, and budget utilization.</p>
        </div>

        <div className="view-switcher" style={{ gap: "8px" }}>
          <button
            className={reportType === "budget" ? "view-btn active" : "view-btn"}
            onClick={() => setReportType("budget")}
          >
            Budget Report
          </button>
          <button
            className={reportType === "trial-balance" ? "view-btn active" : "view-btn"}
            onClick={() => setReportType("trial-balance")}
          >
            Trial Balance
          </button>
          <button
            className={reportType === "balance-sheet" ? "view-btn active" : "view-btn"}
            onClick={() => setReportType("balance-sheet")}
          >
            Balance Sheet
          </button>
          <button
            className={reportType === "profit-loss" ? "view-btn active" : "view-btn"}
            onClick={() => setReportType("profit-loss")}
          >
            Profit & Loss
          </button>
        </div>
      </div>

      {error && <Alert type="error" style={{ marginBottom: "16px" }}>{error}</Alert>}

      {/* ── 1. BUDGET REPORT ────────────────────────────────────────────── */}
      {reportType === "budget" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px" }}>
            <div className="view-switcher">
              <button
                className={view === "list" ? "view-btn active" : "view-btn"}
                onClick={() => setView("list")}
              >
                ☷ List View
              </button>
              <button
                className={view === "report" ? "view-btn active" : "view-btn"}
                onClick={() => setView("report")}
              >
                ◔ Report View
              </button>
            </div>
          </div>

          <div className="account-summary">
            <div className="account-summary-card">
              <div>
                <span>Planned Budget</span>
                <strong>{formatMoney(totals.original)}</strong>
              </div>
              <div className="account-summary-icon">P</div>
            </div>

            <div className="account-summary-card">
              <div>
                <span>Actual Used</span>
                <strong>{formatMoney(totals.used)}</strong>
              </div>
              <div className="account-summary-icon">U</div>
            </div>

            <div className="account-summary-card">
              <div>
                <span>Remaining Budget</span>
                <strong>{formatMoney(remaining)}</strong>
              </div>
              <div className="account-summary-icon">✓</div>
            </div>

            <div className="account-summary-card">
              <div>
                <span>Utilization</span>
                <strong>{usedPercentage}%</strong>
              </div>
              <div className="account-summary-icon">%</div>
            </div>
          </div>

          {view === "list" && (
            <>
              <div className="module-toolbar">
                <input
                  type="text"
                  placeholder="Search account / department..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="contact-count">
                  Items: <strong>{filteredReports.length}</strong>
                </div>
              </div>

              <div className="module-card">
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Account / Department</th>
                        <th>Planned Budget</th>
                        <th>Actual Spend</th>
                        <th>Remaining</th>
                        <th>Utilization</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan="6" className="empty-state">Loading budget report...</td></tr>
                      ) : filteredReports.length > 0 ? (
                        filteredReports.map((report) => {
                          const remainingAmount = report.revised - report.used;
                          const percentage = getPercentage(report.used, report.revised);
                          let status = "On Track";
                          if (percentage >= 90) status = "Near Limit";
                          if (percentage >= 100) status = "Exceeded";

                          return (
                            <tr key={report.id}>
                              <td><strong>{report.department}</strong></td>
                              <td>{formatMoney(report.original)}</td>
                              <td>{formatMoney(report.used)}</td>
                              <td>{formatMoney(remainingAmount)}</td>
                              <td>
                                <div className="budget-progress-cell">
                                  <div className="budget-progress">
                                    <div
                                      className="budget-progress-fill"
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>
                                  <span>{percentage}%</span>
                                </div>
                              </td>
                              <td>
                                <span className={status === "On Track" ? "badge green" : "badge red"}>
                                  {status}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr><td colSpan="6" className="empty-state">No budget records found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {view === "report" && (
            <div className="budget-report-grid">
              <div className="module-card">
                <div className="panel-header">
                  <h3>Budget Distribution</h3>
                </div>
                <div className="chart-box">
                  <div
                    className="pie-chart"
                    style={{
                      background: `conic-gradient(#2563eb 0deg ${usedPercentage * 3.6}deg, #dbeafe ${usedPercentage * 3.6}deg 360deg)`,
                    }}
                  >
                    <div className="pie-inner">
                      <strong>{usedPercentage}%</strong>
                      <span>Used</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="module-card">
                <div className="panel-header">
                  <h3>Summary Overview</h3>
                </div>
                <div className="budget-summary-box">
                  <div className="budget-summary-row">
                    <span>Total Planned</span>
                    <strong>{formatMoney(totals.original)}</strong>
                  </div>
                  <div className="budget-summary-row">
                    <span>Total Actual Used</span>
                    <strong>{formatMoney(totals.used)}</strong>
                  </div>
                  <div className="budget-summary-row highlight">
                    <span>Remaining Budget</span>
                    <strong>{formatMoney(remaining)}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── 2. TRIAL BALANCE ────────────────────────────────────────────── */}
      {reportType === "trial-balance" && (
        <div className="module-card">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Account Name</th>
                  <th>Type</th>
                  <th>Debit</th>
                  <th>Credit</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="empty-state">Loading trial balance...</td></tr>
                ) : tbData?.items?.length > 0 ? (
                  tbData.items.map((it) => (
                    <tr key={it.account_id}>
                      <td><strong>{it.code}</strong></td>
                      <td>{it.name}</td>
                      <td><span className="badge blue">{it.type}</span></td>
                      <td>{formatMoney(it.debit)}</td>
                      <td>{formatMoney(it.credit)}</td>
                      <td><strong>{formatMoney(it.balance)}</strong></td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="6" className="empty-state">No posted accounting transactions found</td></tr>
                )}
              </tbody>
              {tbData && (
                <tfoot>
                  <tr>
                    <th colSpan="3">Total</th>
                    <th>{formatMoney(tbData.total_debit)}</th>
                    <th>{formatMoney(tbData.total_credit)}</th>
                    <th>{formatMoney(tbData.total_balance)}</th>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ── 3. BALANCE SHEET ────────────────────────────────────────────── */}
      {reportType === "balance-sheet" && (
        <div className="budget-report-grid">
          <div className="module-card">
            <div className="panel-header">
              <h3>Assets</h3>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>Account</th><th>Balance</th></tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="2" className="empty-state">Loading...</td></tr>
                  ) : bsData?.assets?.length > 0 ? (
                    bsData.assets.map((a) => (
                      <tr key={a.account_id}><td>{a.name}</td><td>{formatMoney(a.balance)}</td></tr>
                    ))
                  ) : (
                    <tr><td colSpan="2" className="empty-state">No assets recorded</td></tr>
                  )}
                </tbody>
                {bsData && (
                  <tfoot>
                    <tr><th>Total Assets</th><th>{formatMoney(bsData.total_assets)}</th></tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          <div className="module-card">
            <div className="panel-header">
              <h3>Liabilities & Equity</h3>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>Account</th><th>Balance</th></tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="2" className="empty-state">Loading...</td></tr>
                  ) : (
                    <>
                      {bsData?.liabilities?.map((l) => (
                        <tr key={l.account_id}><td>{l.name}</td><td>{formatMoney(l.balance)}</td></tr>
                      ))}
                      {bsData?.equity?.map((e) => (
                        <tr key={e.account_id}><td>{e.name}</td><td>{formatMoney(e.balance)}</td></tr>
                      ))}
                      {bsData?.retained_earnings !== undefined && (
                        <tr><td><em>Retained Earnings</em></td><td>{formatMoney(bsData.retained_earnings)}</td></tr>
                      )}
                    </>
                  )}
                </tbody>
                {bsData && (
                  <tfoot>
                    <tr><th>Total Liabilities & Equity</th><th>{formatMoney(bsData.total_liabilities_and_equity)}</th></tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. PROFIT & LOSS ────────────────────────────────────────────── */}
      {reportType === "profit-loss" && (
        <div className="budget-report-grid">
          <div className="module-card">
            <div className="panel-header">
              <h3>Income</h3>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead><tr><th>Account</th><th>Amount</th></tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="2" className="empty-state">Loading...</td></tr>
                  ) : plData?.income?.length > 0 ? (
                    plData.income.map((i) => (
                      <tr key={i.account_id}><td>{i.name}</td><td>{formatMoney(i.amount)}</td></tr>
                    ))
                  ) : (
                    <tr><td colSpan="2" className="empty-state">No income recorded</td></tr>
                  )}
                </tbody>
                {plData && <tfoot><tr><th>Total Income</th><th>{formatMoney(plData.total_income)}</th></tr></tfoot>}
              </table>
            </div>
          </div>

          <div className="module-card">
            <div className="panel-header">
              <h3>Expenses & Net Profit</h3>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead><tr><th>Account</th><th>Amount</th></tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="2" className="empty-state">Loading...</td></tr>
                  ) : plData?.expenses?.length > 0 ? (
                    plData.expenses.map((e) => (
                      <tr key={e.account_id}><td>{e.name}</td><td>{formatMoney(e.amount)}</td></tr>
                    ))
                  ) : (
                    <tr><td colSpan="2" className="empty-state">No expenses recorded</td></tr>
                  )}
                </tbody>
                {plData && (
                  <tfoot>
                    <tr><th>Total Expenses</th><th>{formatMoney(plData.total_expenses)}</th></tr>
                    <tr><th>Net Profit / Loss</th><th style={{ color: Number(plData.net_profit || 0) >= 0 ? "#16a34a" : "#dc2626" }}>{formatMoney(plData.net_profit)}</th></tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BudgetReport;