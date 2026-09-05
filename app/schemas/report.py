from typing import Optional, List
from datetime import date as PyDate
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


# =====================================================================
# 1. Trial Balance Schemas
# =====================================================================

class TrialBalanceItem(BaseModel):
    account_id: int
    code: str
    name: str
    type: str  # asset, liability, equity, income, expense
    debit: Decimal = Decimal("0.00")
    credit: Decimal = Decimal("0.00")
    balance: Decimal = Decimal("0.00")

    model_config = ConfigDict(from_attributes=True)


class TrialBalanceReport(BaseModel):
    start_date: Optional[PyDate] = None
    end_date: Optional[PyDate] = None
    items: List[TrialBalanceItem] = []
    total_debit: Decimal = Decimal("0.00")
    total_credit: Decimal = Decimal("0.00")
    total_balance: Decimal = Decimal("0.00")


# =====================================================================
# 2. Balance Sheet Schemas
# =====================================================================

class BalanceSheetItem(BaseModel):
    account_id: int
    code: str
    name: str
    balance: Decimal = Decimal("0.00")

    model_config = ConfigDict(from_attributes=True)


class BalanceSheetReport(BaseModel):
    start_date: Optional[PyDate] = None
    end_date: Optional[PyDate] = None
    assets: List[BalanceSheetItem] = []
    total_assets: Decimal = Decimal("0.00")
    liabilities: List[BalanceSheetItem] = []
    total_liabilities: Decimal = Decimal("0.00")
    equity: List[BalanceSheetItem] = []
    retained_earnings: Decimal = Decimal("0.00")
    total_equity: Decimal = Decimal("0.00")
    total_liabilities_and_equity: Decimal = Decimal("0.00")
    is_balanced: bool = True


# =====================================================================
# 3. Profit & Loss Schemas
# =====================================================================

class ProfitLossItem(BaseModel):
    account_id: int
    code: str
    name: str
    amount: Decimal = Decimal("0.00")

    model_config = ConfigDict(from_attributes=True)


class ProfitLossReport(BaseModel):
    start_date: Optional[PyDate] = None
    end_date: Optional[PyDate] = None
    income: List[ProfitLossItem] = []
    total_income: Decimal = Decimal("0.00")
    expenses: List[ProfitLossItem] = []
    total_expenses: Decimal = Decimal("0.00")
    net_profit: Decimal = Decimal("0.00")
    net_profit_loss: Decimal = Decimal("0.00")


# =====================================================================
# 4. Budget Report Schemas
# =====================================================================

class BudgetReportItem(BaseModel):
    account_id: int
    code: Optional[str] = None
    name: str
    planned: Decimal = Decimal("0.00")
    actual: Decimal = Decimal("0.00")
    variance: Decimal = Decimal("0.00")

    model_config = ConfigDict(from_attributes=True)


class BudgetReport(BaseModel):
    start_date: Optional[PyDate] = None
    end_date: Optional[PyDate] = None
    budget_id: Optional[int] = None
    budget_name: Optional[str] = None
    items: List[BudgetReportItem] = []
    total_planned: Decimal = Decimal("0.00")
    total_actual: Decimal = Decimal("0.00")
    total_variance: Decimal = Decimal("0.00")
