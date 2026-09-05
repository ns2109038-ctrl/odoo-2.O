from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.models.product import Product
from app.models.account import Account
from app.schemas.product import ProductCreate, ProductUpdate


def _validate_account(db: Session, account_id: Optional[int], account_role: str) -> None:
    if account_id is not None:
        account = db.query(Account).filter(Account.id == account_id).first()
        if not account:
            raise ValueError(f"{account_role.capitalize()} account with id {account_id} does not exist.")
        if not account.is_active:
            raise ValueError(f"{account_role.capitalize()} account '{account.account_name}' is inactive/archived.")


def create_product(db: Session, product_data: ProductCreate) -> Product:
    sku_clean = product_data.sku.strip().upper()
    name_clean = product_data.name.strip()

    # 1. Check SKU uniqueness (case-insensitive)
    existing_sku = (
        db.query(Product)
        .filter(func.lower(Product.sku) == func.lower(sku_clean))
        .first()
    )
    if existing_sku:
        raise ValueError(f"Product with SKU '{sku_clean}' already exists.")

    # 2. Validate optional account references
    _validate_account(db, product_data.inventory_account_id, "inventory")
    _validate_account(db, product_data.income_account_id, "income")
    _validate_account(db, product_data.expense_account_id, "expense")

    new_product = Product(
        name=name_clean,
        sku=sku_clean,
        description=product_data.description.strip() if product_data.description else None,
        category=product_data.category.strip() if product_data.category else None,
        unit=product_data.unit.strip() if product_data.unit else "Unit",
        type=product_data.type if product_data.type else "Goods",
        image_url=product_data.image_url if product_data.image_url else None,
        sale_price=product_data.sale_price,
        sales_price=product_data.sale_price,  # legacy compatibility
        purchase_price=product_data.purchase_price,
        tax_rate=product_data.tax_rate,
        inventory_account_id=product_data.inventory_account_id,
        income_account_id=product_data.income_account_id,
        expense_account_id=product_data.expense_account_id,
        is_active=product_data.is_active,
    )

    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product


def get_products(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
) -> List[Product]:
    query = db.query(Product)

    if is_active is not None:
        query = query.filter(Product.is_active == is_active)

    if category:
        query = query.filter(func.lower(Product.category) == category.strip().lower())

    if search:
        search_pattern = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(Product.name).ilike(search_pattern),
                func.lower(Product.sku).ilike(search_pattern),
                func.lower(Product.category).ilike(search_pattern),
                func.lower(Product.description).ilike(search_pattern),
            )
        )

    return query.order_by(Product.id.desc()).offset(skip).limit(limit).all()


def get_product_by_id(db: Session, product_id: int) -> Optional[Product]:
    return db.query(Product).filter(Product.id == product_id).first()


def update_product(
    db: Session,
    product_id: int,
    product_data: ProductUpdate,
) -> Optional[Product]:
    product = get_product_by_id(db, product_id)
    if not product:
        return None

    update_dict = product_data.model_dump(exclude_unset=True)

    # Check SKU uniqueness if SKU is modified
    if "sku" in update_dict and update_dict["sku"]:
        new_sku = update_dict["sku"].strip().upper()
        existing = (
            db.query(Product)
            .filter(
                func.lower(Product.sku) == func.lower(new_sku),
                Product.id != product_id,
            )
            .first()
        )
        if existing:
            raise ValueError(f"Product with SKU '{new_sku}' already exists.")
        product.sku = new_sku

    if "inventory_account_id" in update_dict:
        _validate_account(db, update_dict["inventory_account_id"], "inventory")
        product.inventory_account_id = update_dict["inventory_account_id"]

    if "income_account_id" in update_dict:
        _validate_account(db, update_dict["income_account_id"], "income")
        product.income_account_id = update_dict["income_account_id"]

    if "expense_account_id" in update_dict:
        _validate_account(db, update_dict["expense_account_id"], "expense")
        product.expense_account_id = update_dict["expense_account_id"]

    if "name" in update_dict and update_dict["name"] is not None:
        product.name = update_dict["name"].strip()

    if "description" in update_dict:
        product.description = update_dict["description"].strip() if update_dict["description"] else None

    if "category" in update_dict:
        product.category = update_dict["category"].strip() if update_dict["category"] else None

    if "unit" in update_dict and update_dict["unit"]:
        product.unit = update_dict["unit"].strip()

    if "type" in update_dict and update_dict["type"]:
        product.type = update_dict["type"].strip()

    if "image_url" in update_dict:
        product.image_url = update_dict["image_url"]

    if "sale_price" in update_dict and update_dict["sale_price"] is not None:
        product.sale_price = update_dict["sale_price"]
        product.sales_price = update_dict["sale_price"]

    if "purchase_price" in update_dict and update_dict["purchase_price"] is not None:
        product.purchase_price = update_dict["purchase_price"]

    if "tax_rate" in update_dict and update_dict["tax_rate"] is not None:
        product.tax_rate = update_dict["tax_rate"]

    if "is_active" in update_dict and update_dict["is_active"] is not None:
        product.is_active = update_dict["is_active"]

    db.commit()
    db.refresh(product)
    return product


def update_product_status(
    db: Session,
    product_id: int,
    is_active: bool,
) -> Optional[Product]:
    product = get_product_by_id(db, product_id)
    if not product:
        return None

    product.is_active = is_active
    db.commit()
    db.refresh(product)
    return product


def delete_product(db: Session, product_id: int) -> bool:
    product = get_product_by_id(db, product_id)
    if not product:
        return False

    db.delete(product)
    db.commit()
    return True
