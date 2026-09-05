from typing import Optional, List, Any
from datetime import date as PyDate, datetime
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict, model_validator, field_validator


class BudgetAccountSummary(BaseModel):
    id: int
    code: Optional[str] = None
    name: Optional[str] = None
    account_name: Optional[str] = None
    account_type: str

    model_config = ConfigDict(from_attributes=True)


class BudgetAnalyticAccountSummary(BaseModel):
    id: int
    code: str
    name: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class BudgetLineBase(BaseModel):
    account_id: int = Field(..., ge=1, description="Account ID from Chart of Accounts")
    planned_amount: Decimal = Field(default=Decimal("0.00"), ge=0, description="Planned budget amount (>= 0)")
    period: Optional[str] = Field(None, max_length=50, description="Period (e.g. Monthly, Q1, Annual)")

    @field_validator("planned_amount", mode="before")
    @classmethod
    def convert_amount(cls, v: Any) -> Decimal:
        if v is None:
            return Decimal("0.00")
        try:
            return Decimal(str(v))
        except Exception:
            raise ValueError("planned_amount must be a valid numeric value")


class BudgetLineCreate(BudgetLineBase):
    pass


class BudgetLineResponse(BaseModel):
    id: int
    budget_id: int
    account_id: int
    planned_amount: Decimal
    period: Optional[str] = None
    account: Optional[BudgetAccountSummary] = None
    planned: Decimal = Decimal("0.00")
    actual: Decimal = Decimal("0.00")
    variance: Decimal = Decimal("0.00")

    model_config = ConfigDict(from_attributes=True)


class BudgetCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Budget Name")
    analytic_account_id: Optional[int] = Field(None, ge=1, description="Optional Analytic Account ID")
    start_date: PyDate = Field(..., description="Budget start date")
    end_date: PyDate = Field(..., description="Budget end date")
    lines: Optional[List[BudgetLineCreate]] = Field(default_factory=list, description="Budget lines")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Budget name cannot be blank.")
        return v.strip()

    @model_validator(mode="after")
    def validate_dates(self):
        if self.start_date > self.end_date:
            raise ValueError(f"start_date ({self.start_date}) must be less than or equal to end_date ({self.end_date}).")
        return self


class BudgetUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    analytic_account_id: Optional[int] = Field(None, ge=1)
    start_date: Optional[PyDate] = None
    end_date: Optional[PyDate] = None
    lines: Optional[List[BudgetLineCreate]] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not v.strip():
                raise ValueError("Budget name cannot be blank.")
            return v.strip()
        return v

    @model_validator(mode="after")
    def validate_dates(self):
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValueError(f"start_date ({self.start_date}) must be less than or equal to end_date ({self.end_date}).")
        return self


class BudgetResponse(BaseModel):
    id: int
    name: str
    analytic_account_id: Optional[int] = None
    start_date: PyDate
    end_date: PyDate
    status: str
    total_amount: Decimal
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    analytic_account: Optional[BudgetAnalyticAccountSummary] = None
    lines: List[BudgetLineResponse] = []
    planned: Decimal = Decimal("0.00")
    actual: Decimal = Decimal("0.00")
    variance: Decimal = Decimal("0.00")

    model_config = ConfigDict(from_attributes=True)
