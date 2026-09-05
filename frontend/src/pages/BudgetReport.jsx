import { useMemo, useState } from "react";

function BudgetReport() {
  const [view, setView] = useState("list");
  const [search, setSearch] = useState("");

  const reports = [
    {
      id: 1,
      department: "Sales",
      original: 500000,
      revised: 550000,
      used: 385000,
    },
    {
      id: 2,
      department: "Purchase",
      original: 300000,
      revised: 320000,
      used: 245000,
    },
    {
      id: 3,
      department: "Administration",
      original: 150000,
      revised: 145000,
      used: 92000,
    },
    {
      id: 4,
      department: "Marketing",
      original: 100000,
      revised: 120000,
      used: 78000,
    },
    {
      id: 5,
      department: "Finance",
      original: 120000,
      revised: 125000,
      used: 65000,
    },
  ];

  const filteredReports = reports.filter((report) =>
    report.department
      .toLowerCase()
      .includes(search.toLowerCase())
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
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const getPercentage = (used, revised) => {
    if (!revised) {
      return 0;
    }

    return Math.min(
      100,
      Math.round((used / revised) * 100)
    );
  };

  return (
    <div className="module-page">
      {/* HEADER */}

      <div className="page-header">
        <div>
          <h1>Budget Report</h1>

          <p>
            Analyze original, revised and utilized budgets.
          </p>
        </div>

        <div className="view-switcher">
          <button
            className={
              view === "list"
                ? "view-btn active"
                : "view-btn"
            }
            onClick={() => setView("list")}
          >
            ☷ List View
          </button>

          <button
            className={
              view === "report"
                ? "view-btn active"
                : "view-btn"
            }
            onClick={() => setView("report")}
          >
            ◔ Report View
          </button>
        </div>
      </div>

      {/* SUMMARY */}

      <div className="account-summary">
        <div className="account-summary-card">
          <div>
            <span>Original Budget</span>

            <strong>
              {formatMoney(totals.original)}
            </strong>
          </div>

          <div className="account-summary-icon">
            O
          </div>
        </div>

        <div className="account-summary-card">
          <div>
            <span>Revised Budget</span>

            <strong>
              {formatMoney(totals.revised)}
            </strong>
          </div>

          <div className="account-summary-icon">
            R
          </div>
        </div>

        <div className="account-summary-card">
          <div>
            <span>Budget Used</span>

            <strong>
              {formatMoney(totals.used)}
            </strong>
          </div>

          <div className="account-summary-icon">
            U
          </div>
        </div>

        <div className="account-summary-card">
          <div>
            <span>Remaining Budget</span>

            <strong>
              {formatMoney(remaining)}
            </strong>
          </div>

          <div className="account-summary-icon">
            ✓
          </div>
        </div>
      </div>

      {/* LIST VIEW */}

      {view === "list" && (
        <>
          <div className="module-toolbar">
            <input
              type="text"
              placeholder="Search department..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />

            <div className="contact-count">
              Departments:{" "}
              <strong>
                {filteredReports.length}
              </strong>
            </div>
          </div>

          <div className="module-card">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Original Budget</th>
                    <th>Revised Budget</th>
                    <th>Used Budget</th>
                    <th>Remaining</th>
                    <th>Utilization</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredReports.length > 0 ? (
                    filteredReports.map((report) => {
                      const remainingAmount =
                        report.revised - report.used;

                      const percentage =
                        getPercentage(
                          report.used,
                          report.revised
                        );

                      let status = "On Track";

                      if (percentage >= 90) {
                        status = "Near Limit";
                      }

                      if (percentage >= 100) {
                        status = "Exceeded";
                      }

                      return (
                        <tr key={report.id}>
                          <td>
                            <strong>
                              {report.department}
                            </strong>
                          </td>

                          <td>
                            {formatMoney(
                              report.original
                            )}
                          </td>

                          <td>
                            {formatMoney(
                              report.revised
                            )}
                          </td>

                          <td>
                            {formatMoney(
                              report.used
                            )}
                          </td>

                          <td>
                            {formatMoney(
                              remainingAmount
                            )}
                          </td>

                          <td>
                            <div className="budget-progress-cell">
                              <div className="budget-progress">
                                <div
                                  className="budget-progress-fill"
                                  style={{
                                    width: `${percentage}%`,
                                  }}
                                ></div>
                              </div>

                              <span>
                                {percentage}%
                              </span>
                            </div>
                          </td>

                          <td>
                            <span
                              className={
                                status === "On Track"
                                  ? "badge green"
                                  : status ===
                                    "Near Limit"
                                  ? "badge orange"
                                  : "badge red"
                              }
                            >
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan="7"
                        className="empty-state"
                      >
                        No budget report found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* REPORT VIEW */}

      {view === "report" && (
        <div className="budget-report-layout">
          {/* PIE CHART */}

          <div className="module-card budget-chart-card">
            <div className="panel-header">
              <div>
                <h3>Budget Utilization</h3>

                <p>
                  Overall revised budget utilization
                </p>
              </div>
            </div>

            <div className="pie-chart-area">
              <div
                className="budget-pie"
                style={{
                  background: `conic-gradient(
                    #2563eb 0deg ${
                      usedPercentage * 3.6
                    }deg,
                    #dbeafe ${
                      usedPercentage * 3.6
                    }deg 360deg
                  )`,
                }}
              >
                <div className="pie-inner">
                  <strong>
                    {usedPercentage}%
                  </strong>

                  <span>Used</span>
                </div>
              </div>
            </div>

            <div className="chart-legend">
              <div>
                <span className="legend-dot used"></span>
                <span>Used Budget</span>

                <strong>
                  {formatMoney(totals.used)}
                </strong>
              </div>

              <div>
                <span className="legend-dot remaining"></span>
                <span>Remaining</span>

                <strong>
                  {formatMoney(remaining)}
                </strong>
              </div>
            </div>
          </div>

          {/* REPORT SUMMARY */}

          <div className="module-card">
            <div className="panel-header">
              <div>
                <h3>Budget Summary</h3>

                <p>
                  Current financial year overview
                </p>
              </div>
            </div>

            <div className="budget-summary-box">
              <div className="budget-summary-row">
                <span>Original Budget</span>

                <strong>
                  {formatMoney(totals.original)}
                </strong>
              </div>

              <div className="budget-summary-row">
                <span>Revised Budget</span>

                <strong>
                  {formatMoney(totals.revised)}
                </strong>
              </div>

              <div className="budget-summary-row">
                <span>Total Used</span>

                <strong>
                  {formatMoney(totals.used)}
                </strong>
              </div>

              <div className="budget-summary-row highlight">
                <span>Remaining Budget</span>

                <strong>
                  {formatMoney(remaining)}
                </strong>
              </div>
            </div>

            <div className="overall-progress">
              <div className="overall-progress-header">
                <span>
                  Budget Utilization
                </span>

                <strong>
                  {usedPercentage}%
                </strong>
              </div>

              <div className="budget-progress large">
                <div
                  className="budget-progress-fill"
                  style={{
                    width: `${usedPercentage}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEPARTMENT CARDS */}

      <div className="budget-department-section">
        <div className="panel-header">
          <div>
            <h3>Department-wise Budget</h3>

            <p>
              Budget utilization by department
            </p>
          </div>
        </div>

        <div className="budget-department-grid">
          {filteredReports.map((report) => {
            const percentage = getPercentage(
              report.used,
              report.revised
            );

            return (
              <div
                className="budget-department-card"
                key={report.id}
              >
                <div className="budget-department-top">
                  <div className="department-icon">
                    {report.department
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div>
                    <strong>
                      {report.department}
                    </strong>

                    <span>
                      Revised:{" "}
                      {formatMoney(report.revised)}
                    </span>
                  </div>
                </div>

                <div className="department-amount">
                  {formatMoney(report.used)}
                </div>

                <div className="budget-progress">
                  <div
                    className="budget-progress-fill"
                    style={{
                      width: `${percentage}%`,
                    }}
                  ></div>
                </div>

                <div className="department-footer">
                  <span>
                    {percentage}% used
                  </span>

                  <span>
                    Remaining:{" "}
                    {formatMoney(
                      report.revised -
                        report.used
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default BudgetReport;