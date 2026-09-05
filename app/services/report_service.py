from typing import Optional, List, Dict, Tuple
from datetime import date as PyDate
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.account import Account
from app.models.journal_entry import JournalEntry, JournalEntryLine
from app.models.budget import Budget, BudgetLine
from app.schemas.report import (
    TrialBalanceReport,
    TrialBalanceItem,
    BalanceSheetReport,
    BalanceSheetItem,
    ProfitLossReport,
    ProfitLossItem,
    BudgetReport,
    BudgetReportItem,
)


def _get_account_balances(
    db: Session,
    start_date: Optional[PyDate] = None,
    end_date: Optional[PyDate] = None,
    analytic_account_id: Optional[int] = None,
) -> Dict[int, Tuple[Decimal, Decimal]]:
    """
    Returns a map: account_id -> (sum_debit, sum_credit) for all POSTED journal items.
    """
    query = (
        db.query(
            JournalEntryLine.account_id,
            func.coalesce(func.sum(JournalEntryLine.debit), Decimal("0.00")),
            func.coalesce(func.sum(JournalEntryLine.credit), Decimal("0.00")),
        )
        .join(JournalEntry, JournalEntry.id == JournalEntryLine.journal_entry_id)
        .filter(JournalEntry.status == "posted")
    )

    if start_date:
        query = query.filter(JournalEntry.entry_date >= start_date)
    if end_date:
        query = query.filter(JournalEntry.entry_date <= end_date)
    if analytic_account_id is not None:
        query = query.filter(JournalEntryLine.analytic_account_id == analytic_account_id)

    results = query.group_by(JournalEntryLine.account_id).all()
    return {
        r[0]: (Decimal(str(r[1])), Decimal(str(r[2])))
        for r in results
    }


def generate_trial_balance(
    db: Session,
    start_date: Optional[PyDate] = None,
    end_date: Optional[PyDate] = None,
) -> TrialBalanceReport:
    """
    Generates a Trial Balance report:
    Asset/Expense balance = Debit - Credit
    Liability/Equity/Income balance = Credit - Debit
    """
    accounts = db.query(Account).order_by(Account.code.asc()).all()
    balances = _get_account_balances(db, start_date=start_date, end_date=end_date)

    items: List[TrialBalanceItem] = []
    total_debit = Decimal("0.00")
    total_credit = Decimal("0.00")
    total_balance = Decimal("0.00")

    for acc in accounts:
        sum_debit, sum_credit = balances.get(acc.id, (Decimal("0.00"), Decimal("0.00")))
        account_type = (acc.account_type or "").lower().strip()

        if account_type in ["asset", "expense"]:
            balance = sum_debit - sum_credit
        else:
            balance = sum_credit - sum_debit

        # Include account in trial balance if it has activity or is active
        if sum_debit != Decimal("0.00") or sum_credit != Decimal("0.00") or acc.is_active:
            items.append(
                TrialBalanceItem(
                    account_id=acc.id,
                    code=acc.code,
                    name=acc.name,
                    type=acc.account_type,
                    debit=sum_debit,
                    credit=sum_credit,
                    balance=balance,
                )
            )
            total_debit += sum_debit
            total_credit += sum_credit
            total_balance += balance

    return TrialBalanceReport(
        start_date=start_date,
        end_date=end_date,
        items=items,
        total_debit=total_debit,
        total_credit=total_credit,
        total_balance=total_balance,
    )


def generate_balance_sheet(
    db: Session,
    start_date: Optional[PyDate] = None,
    end_date: Optional[PyDate] = None,
) -> BalanceSheetReport:
    """
    Generates a Balance Sheet report:
    Assets = Liabilities + Equity
    where Equity includes Retained Earnings (Net Profit from Income - Expenses).
    """
    accounts = db.query(Account).order_by(Account.code.asc()).all()
    # For balance sheet cumulative balances, we take all posted entries up to end_date
    balances = _get_account_balances(db, start_date=start_date, end_date=end_date)

    assets: List[BalanceSheetItem] = []
    liabilities: List[BalanceSheetItem] = []
    equity: List[BalanceSheetItem] = []

    total_assets = Decimal("0.00")
    total_liabilities = Decimal("0.00")
    base_equity = Decimal("0.00")
    total_income = Decimal("0.00")
    total_expense = Decimal("0.00")

    for acc in accounts:
        sum_debit, sum_credit = balances.get(acc.id, (Decimal("0.00"), Decimal("0.00")))
        account_type = (acc.account_type or "").lower().strip()

        if account_type == "asset":
            bal = sum_debit - sum_credit
            if bal != Decimal("0.00") or acc.is_active:
                assets.append(BalanceSheetItem(account_id=acc.id, code=acc.code, name=acc.name, balance=bal))
                total_assets += bal

        elif account_type == "liability":
            bal = sum_credit - sum_debit
            if bal != Decimal("0.00") or acc.is_active:
                liabilities.append(BalanceSheetItem(account_id=acc.id, code=acc.code, name=acc.name, balance=bal))
                total_liabilities += bal

        elif account_type == "equity":
            bal = sum_credit - sum_debit
            if bal != Decimal("0.00") or acc.is_active:
                equity.append(BalanceSheetItem(account_id=acc.id, code=acc.code, name=acc.name, balance=bal))
                base_equity += bal

        elif account_type == "income":
            total_income += (sum_credit - sum_debit)

        elif account_type == "expense":
            total_expense += (sum_debit - sum_credit)

    # Retained earnings = Net profit / (loss)
    retained_earnings = total_income - total_expense
    total_equity = base_equity + retained_earnings
    total_liabilities_and_equity = total_liabilities + total_equity
    is_balanced = (total_assets == total_liabilities_and_equity)

    return BalanceSheetReport(
        start_date=start_date,
        end_date=end_date,
        assets=assets,
        total_assets=total_assets,
        liabilities=liabilities,
        total_liabilities=total_liabilities,
        equity=equity,
        retained_earnings=retained_earnings,
        total_equity=total_equity,
        total_liabilities_and_equity=total_liabilities_and_equity,
        is_balanced=is_balanced,
    )


def generate_profit_loss(
    db: Session,
    start_date: Optional[PyDate] = None,
    end_date: Optional[PyDate] = None,
) -> ProfitLossReport:
    """
    Generates a Profit & Loss (Income Statement) report:
    Income (Credit - Debit)
    Expenses (Debit - Credit)
    Net Profit = Income - Expenses
    """
    accounts = db.query(Account).order_by(Account.code.asc()).all()
    balances = _get_account_balances(db, start_date=start_date, end_date=end_date)

    income_items: List[ProfitLossItem] = []
    expense_items: List[ProfitLossItem] = []
    total_income = Decimal("0.00")
    total_expenses = Decimal("0.00")

    for acc in accounts:
        sum_debit, sum_credit = balances.get(acc.id, (Decimal("0.00"), Decimal("0.00")))
        account_type = (acc.account_type or "").lower().strip()

        if account_type == "income":
            amount = sum_credit - sum_debit
            if amount != Decimal("0.00") or acc.is_active:
                income_items.append(ProfitLossItem(account_id=acc.id, code=acc.code, name=acc.name, amount=amount))
                total_income += amount

        elif account_type == "expense":
            amount = sum_debit - sum_credit
            if amount != Decimal("0.00") or acc.is_active:
                expense_items.append(ProfitLossItem(account_id=acc.id, code=acc.code, name=acc.name, amount=amount))
                total_expenses += amount

    net_profit = total_income - total_expenses

    return ProfitLossReport(
        start_date=start_date,
        end_date=end_date,
        income=income_items,
        total_income=total_income,
        expenses=expense_items,
        total_expenses=total_expenses,
        net_profit=net_profit,
        net_profit_loss=net_profit,
    )


def generate_budget_report(
    db: Session,
    start_date: Optional[PyDate] = None,
    end_date: Optional[PyDate] = None,
    budget_id: Optional[int] = None,
    analytic_account_id: Optional[int] = None,
) -> BudgetReport:
    """
    Generates a Budget report comparing planned amounts vs actuals from posted journal entries.
    """
    query = db.query(Budget)
    if budget_id:
        query = query.filter(Budget.id == budget_id)
    if analytic_account_id:
        query = query.filter(Budget.analytic_account_id == analytic_account_id)

    budgets = query.all()
    budget_name = budgets[0].name if len(budgets) == 1 else None

    # Collect planned amounts by account
    account_planned: Dict[int, Decimal] = {}
    account_obj_map: Dict[int, Account] = {}

    for b in budgets:
        effective_start = start_date or b.start_date
        effective_end = end_date or b.end_date

        for line in b.lines:
            acc_id = line.account_id
            account_planned[acc_id] = account_planned.get(acc_id, Decimal("0.00")) + Decimal(str(line.planned_amount))
            if acc_id not in account_obj_map and line.account:
                account_obj_map[acc_id] = line.account

    # If specific budgets existed, calculate actuals for those accounts in the effective date range
    balances = _get_account_balances(
        db,
        start_date=start_date,
        end_date=end_date,
        analytic_account_id=analytic_account_id,
    )

    items: List[BudgetReportItem] = []
    total_planned = Decimal("0.00")
    total_actual = Decimal("0.00")

    # If no budgets found, but accounts exist, query all expense accounts
    if not account_planned:
        accounts = db.query(Account).filter(Account.account_type.in_(["expense", "income"])).all()
        for acc in accounts:
            account_obj_map[acc.id] = acc
            account_planned[acc.id] = Decimal("0.00")

    for acc_id, planned_amt in account_planned.items():
        acc = account_obj_map.get(acc_id) or db.query(Account).filter(Account.id == acc_id).first()
        acc_name = acc.name if acc else f"Account #{acc_id}"
        acc_code = acc.code if acc else None
        acc_type = (acc.account_type or "expense").lower() if acc else "expense"

        sum_debit, sum_credit = balances.get(acc_id, (Decimal("0.00"), Decimal("0.00")))
        if acc_type in ["expense", "asset"]:
            actual_amt = sum_debit - sum_credit
        else:
            actual_amt = sum_credit - sum_debit

        variance = planned_amt - actual_amt
        items.append(
            BudgetReportItem(
                account_id=acc_id,
                code=acc_code,
                name=acc_name,
                planned=planned_amt,
                actual=actual_amt,
                variance=variance,
            )
        )
        total_planned += planned_amt
        total_actual += actual_amt

    total_variance = total_planned - total_actual

    return BudgetReport(
        start_date=start_date,
        end_date=end_date,
        budget_id=budget_id,
        budget_name=budget_name,
        items=items,
        total_planned=total_planned,
        total_actual=total_actual,
        total_variance=total_variance,
    )
