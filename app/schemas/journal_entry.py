from typing import Optional, List, Any
from datetime import date as PyDate, datetime
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict, model_validator, field_validator


class JournalAccountSummary(BaseModel):
    id: int
    code: Optional[str] = None
    name: Optional[str] = None
    account_name: Optional[str] = None
    account_type: str

    model_config = ConfigDict(from_attributes=True)


class AnalyticAccountSummary(BaseModel):
    id: int
    code: str
    name: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class JournalSummary(BaseModel):
    id: int
    journal_name: str
    journal_type: str

    model_config = ConfigDict(from_attributes=True)


class JournalEntryLineBase(BaseModel):
    account_id: int = Field(..., ge=1, description="Account ID from Chart of Accounts")
    analytic_account_id: Optional[int] = Field(None, ge=1, description="Optional Analytic Account ID")
    description: Optional[str] = Field(None, description="Line-specific description")
    debit: Decimal = Field(default=Decimal("0.00"), ge=0, description="Debit amount (>= 0)")
    credit: Decimal = Field(default=Decimal("0.00"), ge=0, description="Credit amount (>= 0)")

    @field_validator("debit", "credit", mode="before")
    @classmethod
    def convert_to_decimal(cls, v: Any) -> Decimal:
        if v is None:
            return Decimal("0.00")
        try:
            return Decimal(str(v))
        except Exception:
            raise ValueError("Amount must be a valid numeric value")


class JournalEntryLineCreate(JournalEntryLineBase):
    @model_validator(mode="after")
    def validate_line_amounts(self):
        if self.debit < 0 or self.credit < 0:
            raise ValueError("Debit and credit amounts must be greater than or equal to 0.")
        if self.debit > 0 and self.credit > 0:
            raise ValueError("Each line must have either debit OR credit, never both.")
        if self.debit == 0 and self.credit == 0:
            raise ValueError("Line amount cannot be zero; must specify either debit or credit.")
        return self


# Backwards compatibility alias
JournalItemCreate = JournalEntryLineCreate


class JournalEntryLineResponse(BaseModel):
    id: int
    journal_entry_id: int
    account_id: int
    analytic_account_id: Optional[int] = None
    description: Optional[str] = None
    debit: Decimal
    credit: Decimal
    account: Optional[JournalAccountSummary] = None
    analytic_account: Optional[AnalyticAccountSummary] = None

    model_config = ConfigDict(from_attributes=True)


# Backwards compatibility alias
JournalItemResponse = JournalEntryLineResponse


class JournalEntryCreate(BaseModel):
    journal_id: int = Field(..., ge=1, description="ID of the Journal")
    entry_date: Optional[PyDate] = Field(None, description="Date of the journal entry")
    date: Optional[PyDate] = Field(None, description="Legacy date field")
    reference: Optional[str] = Field(None, max_length=100, description="Reference or document number")
    description: Optional[str] = Field(None, description="Description of the entry")
    status: Optional[str] = Field(default="draft", description="Status: draft or posted")
    lines: Optional[List[JournalEntryLineCreate]] = Field(None, description="List of journal entry lines")
    items: Optional[List[JournalEntryLineCreate]] = Field(None, description="Legacy items alias for lines")

    @model_validator(mode="before")
    @classmethod
    def resolve_date_and_lines(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Resolve entry_date
            if not data.get("entry_date") and data.get("date"):
                data["entry_date"] = data["date"]
            elif data.get("entry_date") and not data.get("date"):
                data["date"] = data["entry_date"]

            # Resolve lines
            if data.get("lines") is None and data.get("items") is not None:
                data["lines"] = data["items"]
            elif data.get("lines") is not None and data.get("items") is None:
                data["items"] = data["lines"]
        return data

    @model_validator(mode="after")
    def validate_entry(self):
        if not self.entry_date:
            raise ValueError("entry_date is required")
        if not self.lines or len(self.lines) < 2:
            raise ValueError("At least 2 lines are required for a journal entry.")
        if self.status and self.status.lower() not in ["draft", "posted"]:
            raise ValueError("Initial status must be 'draft' or 'posted'.")
        return self


class JournalEntryUpdate(BaseModel):
    journal_id: Optional[int] = Field(None, ge=1)
    entry_date: Optional[PyDate] = None
    date: Optional[PyDate] = None
    reference: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    lines: Optional[List[JournalEntryLineCreate]] = None
    items: Optional[List[JournalEntryLineCreate]] = None

    @model_validator(mode="before")
    @classmethod
    def resolve_update_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("entry_date") and data.get("date"):
                data["entry_date"] = data["date"]
            elif data.get("entry_date") and not data.get("date"):
                data["date"] = data["entry_date"]

            if data.get("lines") is None and data.get("items") is not None:
                data["lines"] = data["items"]
            elif data.get("lines") is not None and data.get("items") is None:
                data["items"] = data["lines"]
        return data

    @model_validator(mode="after")
    def validate_update(self):
        if self.lines is not None and len(self.lines) < 2:
            raise ValueError("At least 2 lines are required for a journal entry.")
        return self


class JournalEntryResponse(BaseModel):
    id: int
    journal_id: int
    entry_date: PyDate
    date: PyDate
    reference: Optional[str] = None
    description: Optional[str] = None
    status: str
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    journal: Optional[JournalSummary] = None
    lines: List[JournalEntryLineResponse] = []
    items: List[JournalEntryLineResponse] = []
    total_debit: Decimal = Decimal("0.00")
    total_credit: Decimal = Decimal("0.00")

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def compute_totals_and_aliases(cls, data: Any) -> Any:
        # If ORM model
        if hasattr(data, "lines"):
            lines_list = data.lines
            total_d = sum(Decimal(str(l.debit)) for l in lines_list)
            total_c = sum(Decimal(str(l.credit)) for l in lines_list)
            # We can attach calculated attributes
            setattr(data, "total_debit", total_d)
            setattr(data, "total_credit", total_c)
            setattr(data, "items", lines_list)
            if hasattr(data, "entry_date") and not getattr(data, "date", None):
                setattr(data, "date", data.entry_date)
            elif hasattr(data, "date") and not getattr(data, "entry_date", None):
                setattr(data, "entry_date", data.date)
        elif isinstance(data, dict):
            lines = data.get("lines") or data.get("items") or []
            data["lines"] = lines
            data["items"] = lines
            data["total_debit"] = sum(Decimal(str(l.get("debit", 0))) for l in lines)
            data["total_credit"] = sum(Decimal(str(l.get("credit", 0))) for l in lines)
            if not data.get("date") and data.get("entry_date"):
                data["date"] = data["entry_date"]
            elif not data.get("entry_date") and data.get("date"):
                data["entry_date"] = data["date"]
        return data
