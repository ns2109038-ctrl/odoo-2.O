from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.account import Account
from app.schemas.account import AccountCreate, AccountUpdate


def create_account(db: Session, account_data: AccountCreate) -> Account:
    # Check for duplicate account code (case-insensitive)
    existing_code = (
        db.query(Account)
        .filter(func.lower(Account.code) == func.lower(account_data.code))
        .first()
    )
    if existing_code:
        raise ValueError(f"Account with code '{account_data.code}' already exists.")

    # Validate parent_id exists (if provided)
    if account_data.parent_id is not None:
        parent = db.query(Account).filter(Account.id == account_data.parent_id).first()
        if not parent:
            raise ValueError(f"Parent account with id {account_data.parent_id} does not exist.")

    new_account = Account(
        code=account_data.code,
        name=account_data.name,
        account_name=account_data.name,  # keep legacy column in sync
        account_type=account_data.account_type,
        parent_id=account_data.parent_id,
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
    search: Optional[str] = None,
) -> List[Account]:
    query = db.query(Account)
    if is_active is not None:
        query = query.filter(Account.is_active == is_active)
    if account_type:
        query = query.filter(Account.account_type == account_type.lower())
    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            Account.name.ilike(pattern) | Account.code.ilike(pattern)
        )
    return query.order_by(Account.code.asc()).offset(skip).limit(limit).all()


def get_account(db: Session, account_id: int) -> Optional[Account]:
    return db.query(Account).filter(Account.id == account_id).first()


def update_account(
    db: Session, account_id: int, account_data: AccountUpdate
) -> Optional[Account]:
    account = get_account(db, account_id)
    if not account:
        return None

    update_dict = account_data.model_dump(exclude_unset=True)

    # Validate code uniqueness if changing
    if "code" in update_dict and update_dict["code"]:
        new_code = update_dict["code"]
        duplicate = (
            db.query(Account)
            .filter(
                func.lower(Account.code) == func.lower(new_code),
                Account.id != account_id,
            )
            .first()
        )
        if duplicate:
            raise ValueError(f"Account with code '{new_code}' already exists.")

    # Validate parent_id if provided
    if "parent_id" in update_dict and update_dict["parent_id"] is not None:
        if update_dict["parent_id"] == account_id:
            raise ValueError("An account cannot be its own parent.")
        parent = db.query(Account).filter(Account.id == update_dict["parent_id"]).first()
        if not parent:
            raise ValueError(f"Parent account with id {update_dict['parent_id']} does not exist.")

    for field, value in update_dict.items():
        setattr(account, field, value)

    # Keep legacy column in sync
    if "name" in update_dict:
        account.account_name = update_dict["name"]

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
