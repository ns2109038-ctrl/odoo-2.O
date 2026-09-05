from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.models.account import Account
from app.models.journal_entry import JournalItem
from app.models.journal import Journal
from app.models.product import Product
from app.schemas.account import AccountCreate, AccountUpdate, AccountTreeNode


def _detect_cycle(db: Session, account_id: int, target_parent_id: int) -> bool:
    """
    Returns True if setting account_id's parent to target_parent_id would cause a cycle.
    Traverses upwards from target_parent_id to check if account_id is an ancestor.
    """
    current_id: Optional[int] = target_parent_id
    visited = set()
    while current_id is not None:
        if current_id == account_id:
            return True
        if current_id in visited:
            break
        visited.add(current_id)
        parent_account = db.query(Account).filter(Account.id == current_id).first()
        if not parent_account:
            break
        current_id = parent_account.parent_id
    return False


def create_account(db: Session, account_data: AccountCreate) -> Account:
    # 1. Check for duplicate account code (case-insensitive)
    existing_code = (
        db.query(Account)
        .filter(func.lower(Account.code) == func.lower(account_data.code))
        .first()
    )
    if existing_code:
        raise ValueError(f"Account with code '{account_data.code}' already exists.")

    # 2. Validate parent_id if provided
    if account_data.parent_id is not None:
        parent = db.query(Account).filter(Account.id == account_data.parent_id).first()
        if not parent:
            raise ValueError(f"Parent account with id {account_data.parent_id} does not exist.")
        
        # In double-entry accounting, child accounts must belong to the same account type
        if parent.account_type.lower() != account_data.account_type.lower():
            raise ValueError(
                f"Parent account type '{parent.account_type}' does not match child account type '{account_data.account_type}'."
            )

    new_account = Account(
        code=account_data.code,
        name=account_data.name,
        account_name=account_data.name,  # legacy compatibility
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
    parent_id: Optional[int] = None,
    search: Optional[str] = None,
) -> List[Account]:
    query = db.query(Account)

    if is_active is not None:
        query = query.filter(Account.is_active == is_active)
    if account_type:
        query = query.filter(Account.account_type == account_type.lower())
    if parent_id is not None:
        query = query.filter(Account.parent_id == parent_id)
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Account.name.ilike(search_pattern),
                Account.code.ilike(search_pattern),
                Account.description.ilike(search_pattern),
            )
        )

    return query.order_by(Account.code.asc()).offset(skip).limit(limit).all()


def get_account_hierarchy_tree(
    db: Session,
    account_type: Optional[str] = None,
    is_active: Optional[bool] = None,
) -> List[AccountTreeNode]:
    """
    Builds and returns the full hierarchical account tree.
    """
    query = db.query(Account)
    if account_type:
        query = query.filter(Account.account_type == account_type.lower())
    if is_active is not None:
        query = query.filter(Account.is_active == is_active)

    all_accounts = query.order_by(Account.code.asc()).all()

    # Map accounts by id
    nodes_by_id: Dict[int, AccountTreeNode] = {}
    for acc in all_accounts:
        nodes_by_id[acc.id] = AccountTreeNode(
            id=acc.id,
            code=acc.code,
            name=acc.name,
            account_type=acc.account_type,
            parent_id=acc.parent_id,
            description=acc.description,
            is_active=acc.is_active,
            level=0,
            children=[],
        )

    tree: List[AccountTreeNode] = []

    def set_levels(node: AccountTreeNode, current_level: int):
        node.level = current_level
        for child in node.children:
            set_levels(child, current_level + 1)

    for acc in all_accounts:
        node = nodes_by_id[acc.id]
        if acc.parent_id and acc.parent_id in nodes_by_id:
            parent_node = nodes_by_id[acc.parent_id]
            parent_node.children.append(node)
        else:
            tree.append(node)

    for root_node in tree:
        set_levels(root_node, 0)

    return tree


def get_account(db: Session, account_id: int) -> Optional[Account]:
    return db.query(Account).filter(Account.id == account_id).first()


def update_account(
    db: Session, account_id: int, account_data: AccountUpdate
) -> Optional[Account]:
    account = get_account(db, account_id)
    if not account:
        return None

    update_dict = account_data.model_dump(exclude_unset=True)

    # 1. Validate code uniqueness if updating code
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

    target_type = update_dict.get("account_type", account.account_type)

    # 2. Validate parent_id if updated
    if "parent_id" in update_dict:
        new_parent_id = update_dict["parent_id"]
        if new_parent_id is not None:
            if new_parent_id == account_id:
                raise ValueError("An account cannot be its own parent.")
            
            parent = db.query(Account).filter(Account.id == new_parent_id).first()
            if not parent:
                raise ValueError(f"Parent account with id {new_parent_id} does not exist.")

            # Detect circular hierarchy
            if _detect_cycle(db, account_id, new_parent_id):
                raise ValueError("Invalid parent relationship: circular dependency detected.")

            # Validate type compatibility
            if parent.account_type.lower() != target_type.lower():
                raise ValueError(
                    f"Parent account type '{parent.account_type}' does not match child account type '{target_type}'."
                )

    # If updating account_type, ensure it matches existing parent (if any) and all children
    if "account_type" in update_dict and update_dict["account_type"]:
        new_type = update_dict["account_type"]
        current_parent_id = update_dict.get("parent_id", account.parent_id)
        if current_parent_id:
            parent = db.query(Account).filter(Account.id == current_parent_id).first()
            if parent and parent.account_type.lower() != new_type.lower():
                raise ValueError(
                    f"Account type '{new_type}' does not match parent account type '{parent.account_type}'."
                )
        # Check existing children
        child_count = (
            db.query(Account)
            .filter(Account.parent_id == account_id, func.lower(Account.account_type) != new_type.lower())
            .count()
        )
        if child_count > 0:
            raise ValueError(
                f"Cannot change account type to '{new_type}' because it has child accounts with different types."
            )

    for field, value in update_dict.items():
        setattr(account, field, value)

    # Keep legacy column in sync
    if "name" in update_dict:
        account.account_name = update_dict["name"]

    db.commit()
    db.refresh(account)
    return account


def update_account_status(db: Session, account_id: int, is_active: bool) -> Optional[Account]:
    account = get_account(db, account_id)
    if not account:
        return None
    account.is_active = is_active
    db.commit()
    db.refresh(account)
    return account


def delete_account(db: Session, account_id: int) -> bool:
    account = get_account(db, account_id)
    if not account:
        return False

    # 1. Prevent deleting an account used by accounting transactions (journal_items)
    used_in_transactions = (
        db.query(JournalItem)
        .filter(JournalItem.account_id == account_id)
        .first()
    )
    if used_in_transactions:
        raise ValueError(
            "Cannot delete account: it is already used by accounting transactions."
        )

    # 2. Prevent deleting an account that has child accounts
    has_children = (
        db.query(Account)
        .filter(Account.parent_id == account_id)
        .first()
    )
    if has_children:
        raise ValueError(
            "Cannot delete account: it has child accounts. Please reassign or delete child accounts first."
        )

    # 3. Prevent deleting an account linked to journals
    used_in_journals = (
        db.query(Journal)
        .filter(
            or_(
                Journal.default_debit_account_id == account_id,
                Journal.default_credit_account_id == account_id,
            )
        )
        .first()
    )
    if used_in_journals:
        raise ValueError(
            "Cannot delete account: it is linked as a default account in journals."
        )

    # 4. Prevent deleting an account linked to products
    used_in_products = (
        db.query(Product)
        .filter(
            or_(
                Product.income_account_id == account_id,
                Product.expense_account_id == account_id,
                Product.inventory_account_id == account_id,
            )
        )
        .first()
    )
    if used_in_products:
        raise ValueError(
            "Cannot delete account: it is linked to products."
        )

    db.delete(account)
    db.commit()
    return True
