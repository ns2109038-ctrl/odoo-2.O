from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.models.analytic_account import AnalyticAccount
from app.schemas.analytic_account import (
    AnalyticAccountCreate,
    AnalyticAccountUpdate,
    AnalyticAccountStatusUpdate,
)


def create_analytic_account(db: Session, account_data: AnalyticAccountCreate) -> AnalyticAccount:
    code = account_data.code.strip()
    name = account_data.name.strip()

    existing = db.query(AnalyticAccount).filter(AnalyticAccount.code == code).first()
    if existing:
        raise ValueError(f"Analytic account with code '{code}' already exists.")

    try:
        new_account = AnalyticAccount(
            code=code,
            name=name,
            description=account_data.description.strip() if account_data.description else None,
            is_active=account_data.is_active,
        )
        db.add(new_account)
        db.commit()
        db.refresh(new_account)
        return new_account
    except Exception:
        db.rollback()
        raise


def get_analytic_account(db: Session, account_id: int) -> Optional[AnalyticAccount]:
    return db.query(AnalyticAccount).filter(AnalyticAccount.id == account_id).first()


def get_analytic_accounts(
    db: Session,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 50,
) -> Tuple[List[AnalyticAccount], int]:
    query = db.query(AnalyticAccount)

    if is_active is not None:
        query = query.filter(AnalyticAccount.is_active == is_active)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                AnalyticAccount.name.ilike(term),
                AnalyticAccount.code.ilike(term),
                AnalyticAccount.description.ilike(term),
            )
        )

    total = query.count()
    accounts = query.order_by(AnalyticAccount.code.asc()).offset(skip).limit(limit).all()
    return accounts, total


def update_analytic_account(
    db: Session,
    account_id: int,
    update_data: AnalyticAccountUpdate,
) -> AnalyticAccount:
    account = db.query(AnalyticAccount).filter(AnalyticAccount.id == account_id).first()
    if not account:
        raise ValueError(f"Analytic account with id {account_id} not found.")

    if update_data.code is not None:
        new_code = update_data.code.strip()
        if new_code != account.code:
            existing = db.query(AnalyticAccount).filter(AnalyticAccount.code == new_code).first()
            if existing:
                raise ValueError(f"Analytic account with code '{new_code}' already exists.")
            account.code = new_code

    if update_data.name is not None:
        account.name = update_data.name.strip()

    if update_data.description is not None:
        account.description = update_data.description.strip() if update_data.description else None

    if update_data.is_active is not None:
        account.is_active = update_data.is_active

    try:
        db.commit()
        db.refresh(account)
        return account
    except Exception:
        db.rollback()
        raise


def toggle_analytic_account_status(
    db: Session,
    account_id: int,
    status_data: Optional[AnalyticAccountStatusUpdate] = None,
) -> AnalyticAccount:
    account = db.query(AnalyticAccount).filter(AnalyticAccount.id == account_id).first()
    if not account:
        raise ValueError(f"Analytic account with id {account_id} not found.")

    if status_data is not None:
        account.is_active = status_data.is_active
    else:
        account.is_active = not account.is_active

    try:
        db.commit()
        db.refresh(account)
        return account
    except Exception:
        db.rollback()
        raise


def delete_analytic_account(db: Session, account_id: int) -> bool:
    account = db.query(AnalyticAccount).filter(AnalyticAccount.id == account_id).first()
    if not account:
        raise ValueError(f"Analytic account with id {account_id} not found.")

    try:
        db.delete(account)
        db.commit()
        return True
    except Exception:
        db.rollback()
        raise
