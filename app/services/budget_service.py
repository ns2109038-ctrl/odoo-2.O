from typing import Optional, List, Dict, Any, Tuple
from datetime import date as PyDate, datetime
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.models.budget import Budget, BudgetLine
from app.models.account import Account
from app.models.analytic_account import AnalyticAccount
from app.models.journal_entry import JournalEntry, JournalEntryLine
from app.schemas.budget import BudgetCreate, BudgetUpdate, BudgetLineCreate


def _calculate_budget_actuals(db: Session, budget: Budget) -> Budget:
    """
    Computes actual amounts and variances for a budget and its lines from POSTED journal entries
    between start_date and end_date (optionally matching analytic_account_id).
    """
    total_planned = Decimal("0.00")
    total_actual = Decimal("0.00")

    for line in budget.lines:
        account = line.account or db.query(Account).filter(Account.id == line.account_id).first()
        account_type = account.account_type.lower() if account else "expense"

        # Query posted journal items for this account in the budget date range
        query = (
            db.query(
                func.coalesce(func.sum(JournalEntryLine.debit), Decimal("0.00")),
                func.coalesce(func.sum(JournalEntryLine.credit), Decimal("0.00")),
            )
            .join(JournalEntry, JournalEntry.id == JournalEntryLine.journal_entry_id)
            .filter(
                JournalEntry.status == "posted",
                JournalEntry.entry_date >= budget.start_date,
                JournalEntry.entry_date <= budget.end_date,
                JournalEntryLine.account_id == line.account_id,
            )
        )

        if budget.analytic_account_id is not None:
            query = query.filter(JournalEntryLine.analytic_account_id == budget.analytic_account_id)

        sum_debit, sum_credit = query.first()
        sum_debit = Decimal(str(sum_debit))
        sum_credit = Decimal(str(sum_credit))

        if account_type in ["expense", "asset"]:
            line_actual = sum_debit - sum_credit
        else:
            line_actual = sum_credit - sum_debit

        line_planned = Decimal(str(line.planned_amount))
        line_variance = line_planned - line_actual

        setattr(line, "planned", line_planned)
        setattr(line, "actual", line_actual)
        setattr(line, "variance", line_variance)

        total_planned += line_planned
        total_actual += line_actual

    total_variance = total_planned - total_actual
    setattr(budget, "planned", total_planned)
    setattr(budget, "actual", total_actual)
    setattr(budget, "variance", total_variance)

    return budget


def _validate_budget_details(
    db: Session,
    start_date: PyDate,
    end_date: PyDate,
    analytic_account_id: Optional[int],
    lines: Optional[List[BudgetLineCreate]],
) -> Tuple[Decimal, List[BudgetLineCreate]]:
    # 1. Date validation
    if start_date > end_date:
        raise ValueError(f"start_date ({start_date}) must be less than or equal to end_date ({end_date}).")

    # 2. Analytic account validation
    if analytic_account_id is not None:
        analytic_acc = db.query(AnalyticAccount).filter(AnalyticAccount.id == analytic_account_id).first()
        if not analytic_acc:
            raise ValueError(f"Analytic account with id {analytic_account_id} does not exist.")
        if not analytic_acc.is_active:
            raise ValueError(f"Analytic account '{analytic_acc.name}' is inactive.")

    # 3. Lines validation
    validated_lines = lines or []
    total_planned = Decimal("0.00")
    account_cache: Dict[int, Account] = {}

    for index, line in enumerate(validated_lines, start=1):
        if line.planned_amount < Decimal("0.00"):
            raise ValueError(f"Line #{index}: Planned amount must be greater than or equal to 0.")

        if line.account_id not in account_cache:
            account = db.query(Account).filter(Account.id == line.account_id).first()
            if not account:
                raise ValueError(f"Line #{index}: Account with id {line.account_id} does not exist.")
            if not account.is_active:
                raise ValueError(f"Line #{index}: Account '{account.name}' is inactive/archived and cannot be used in a budget.")
            account_cache[line.account_id] = account

        total_planned += line.planned_amount

    return total_planned, validated_lines


def create_budget(
    db: Session,
    budget_data: BudgetCreate,
    user_id: Optional[int] = None,
) -> Budget:
    total_planned, lines = _validate_budget_details(
        db,
        start_date=budget_data.start_date,
        end_date=budget_data.end_date,
        analytic_account_id=budget_data.analytic_account_id,
        lines=budget_data.lines,
    )

    try:
        new_budget = Budget(
            name=budget_data.name.strip(),
            analytic_account_id=budget_data.analytic_account_id,
            start_date=budget_data.start_date,
            end_date=budget_data.end_date,
            status="draft",
            total_amount=total_planned,
            created_by=user_id,
        )
        db.add(new_budget)
        db.flush()

        for line in lines:
            budget_line = BudgetLine(
                budget_id=new_budget.id,
                account_id=line.account_id,
                planned_amount=line.planned_amount,
                period=line.period.strip() if line.period else None,
            )
            db.add(budget_line)

        db.commit()
        db.refresh(new_budget)
        return _calculate_budget_actuals(db, new_budget)
    except Exception:
        db.rollback()
        raise


def get_budgets(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    analytic_account_id: Optional[int] = None,
    search: Optional[str] = None,
) -> List[Budget]:
    query = db.query(Budget)

    if status:
        query = query.filter(Budget.status == status.lower().strip())
    if analytic_account_id is not None:
        query = query.filter(Budget.analytic_account_id == analytic_account_id)
    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(Budget.name.ilike(pattern))

    budgets = query.order_by(Budget.start_date.desc(), Budget.id.desc()).offset(skip).limit(limit).all()
    return [_calculate_budget_actuals(db, b) for b in budgets]


def get_budget(db: Session, budget_id: int) -> Optional[Budget]:
    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not budget:
        return None
    return _calculate_budget_actuals(db, budget)


def update_budget(
    db: Session,
    budget_id: int,
    update_data: BudgetUpdate,
    user_id: Optional[int] = None,
) -> Optional[Budget]:
    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not budget:
        return None

    if budget.status.lower() in ["active", "closed"]:
        raise ValueError(f"Cannot edit a {budget.status} budget. Only draft budgets can be modified.")

    update_dict = update_data.model_dump(exclude_unset=True)

    start_date = update_dict.get("start_date", budget.start_date)
    end_date = update_dict.get("end_date", budget.end_date)
    analytic_account_id = update_dict.get("analytic_account_id", budget.analytic_account_id)

    lines_to_validate = update_data.lines if "lines" in update_dict else None

    if lines_to_validate is not None:
        total_planned, lines = _validate_budget_details(
            db,
            start_date=start_date,
            end_date=end_date,
            analytic_account_id=analytic_account_id,
            lines=lines_to_validate,
        )
    else:
        if start_date > end_date:
            raise ValueError(f"start_date ({start_date}) must be less than or equal to end_date ({end_date}).")
        if analytic_account_id is not None and analytic_account_id != budget.analytic_account_id:
            analytic_acc = db.query(AnalyticAccount).filter(AnalyticAccount.id == analytic_account_id).first()
            if not analytic_acc:
                raise ValueError(f"Analytic account with id {analytic_account_id} does not exist.")
            if not analytic_acc.is_active:
                raise ValueError(f"Analytic account '{analytic_acc.name}' is inactive.")
        total_planned = budget.total_amount

    try:
        if "name" in update_dict and update_dict["name"]:
            budget.name = update_dict["name"].strip()
        if "start_date" in update_dict:
            budget.start_date = start_date
        if "end_date" in update_dict:
            budget.end_date = end_date
        if "analytic_account_id" in update_dict:
            budget.analytic_account_id = analytic_account_id

        if lines_to_validate is not None:
            budget.total_amount = total_planned
            db.query(BudgetLine).filter(BudgetLine.budget_id == budget_id).delete()
            for line in lines_to_validate:
                budget_line = BudgetLine(
                    budget_id=budget_id,
                    account_id=line.account_id,
                    planned_amount=line.planned_amount,
                    period=line.period.strip() if line.period else None,
                )
                db.add(budget_line)

        budget.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(budget)
        return _calculate_budget_actuals(db, budget)
    except Exception:
        db.rollback()
        raise


def activate_budget(db: Session, budget_id: int, user_id: Optional[int] = None) -> Budget:
    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not budget:
        raise ValueError(f"Budget with id {budget_id} not found.")

    if budget.status.lower() == "active":
        raise ValueError(f"Budget #{budget_id} is already active.")
    if budget.status.lower() == "closed":
        raise ValueError(f"Cannot activate a closed budget #{budget_id}.")
    if budget.status.lower() != "draft":
        raise ValueError(f"Invalid status transition from {budget.status} to active.")

    budget.status = "active"
    budget.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(budget)
    return _calculate_budget_actuals(db, budget)


def close_budget(db: Session, budget_id: int, user_id: Optional[int] = None) -> Budget:
    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not budget:
        raise ValueError(f"Budget with id {budget_id} not found.")

    if budget.status.lower() == "closed":
        raise ValueError(f"Budget #{budget_id} is already closed.")

    budget.status = "closed"
    budget.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(budget)
    return _calculate_budget_actuals(db, budget)
