from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.account import Account
from app.schemas.account import AccountCreate, AccountUpdate


def create_account(db: Session, account_data: AccountCreate) -> Account:
    normalized_name = account_data.account_name.strip()

    # Check for duplicate account name (case-insensitive)
    existing = (
        db.query(Account)
        .filter(func.lower(Account.account_name) == func.lower(normalized_name))
        .first()
    )
    if existing:
        raise ValueError(f"Account with name '{normalized_name}' already exists.")

    new_account = Account(
        account_name=normalized_name,
        account_type=account_data.account_type,
        description=account_data.description,
        is_active=account_data.is_active,
    )
    db.add(new_account)
    db.commit()
    db.refresh(new_account)
    return new_account


def get_accounts(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    account_type: Optional[str] = None,
) -> List[Account]:
    query = db.query(Account)
    if is_active is not None:
        query = query.filter(Account.is_active == is_active)
    if account_type:
        query = query.filter(Account.account_type == account_type)
    return query.order_by(Account.id.asc()).offset(skip).limit(limit).all()


def get_account(db: Session, account_id: int) -> Optional[Account]:
    return db.query(Account).filter(Account.id == account_id).first()


def update_account(
    db: Session, account_id: int, account_data: AccountUpdate
) -> Optional[Account]:
    account = get_account(db, account_id)
    if not account:
        return None

    update_dict = account_data.model_dump(exclude_unset=True)

    if "account_name" in update_dict and update_dict["account_name"]:
        new_name = update_dict["account_name"].strip()
        duplicate = (
            db.query(Account)
            .filter(
                func.lower(Account.account_name) == func.lower(new_name),
                Account.id != account_id,
            )
            .first()
        )
        if duplicate:
            raise ValueError(f"Account with name '{new_name}' already exists.")
        update_dict["account_name"] = new_name

    for field, value in update_dict.items():
        setattr(account, field, value)

    db.commit()
    db.refresh(account)
    return account


def archive_account(db: Session, account_id: int) -> Optional[Account]:
    account = get_account(db, account_id)
    if not account:
        return None

    # Soft delete: archive by marking is_active=False
    account.is_active = False
    db.commit()
    db.refresh(account)
    return account
