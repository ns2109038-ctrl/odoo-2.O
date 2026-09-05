from typing import Optional, List, Tuple
from datetime import date as PyDate, datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.purchase_order import PurchaseOrder, PurchaseOrderLine
from app.models.contact import Contact
from app.models.product import Product
from app.schemas.purchase_order import PurchaseOrderCreate, PurchaseOrderUpdate


# ── Order number generation ──────────────────────────────────────────────────

def _generate_order_number(db: Session) -> str:
    """Generate a sequential purchase order number like PO-0001, PO-0002, ..."""
    count = db.query(PurchaseOrder).count()
    return f"PO-{count + 1:04d}"


# ── Totals calculation ───────────────────────────────────────────────────────

def _compute_line_total(quantity: Decimal, unit_price: Decimal, tax_rate: Decimal) -> Decimal:
    net = quantity * unit_price
    tax = net * (tax_rate / Decimal("100"))
    return (net + tax).quantize(Decimal("0.01"))


def _compute_order_totals(lines: List[PurchaseOrderLine]) -> Tuple[Decimal, Decimal, Decimal]:
    """Returns (subtotal, tax, total)."""
    subtotal = Decimal("0.00")
    tax_total = Decimal("0.00")
    for line in lines:
        net = Decimal(str(line.quantity)) * Decimal(str(line.unit_price))
        tax = net * (Decimal(str(line.tax_rate)) / Decimal("100"))
        subtotal += net
        tax_total += tax
    subtotal = subtotal.quantize(Decimal("0.01"))
    tax_total = tax_total.quantize(Decimal("0.01"))
    total = (subtotal + tax_total).quantize(Decimal("0.01"))
    return subtotal, tax_total, total


# ── Validation helpers ───────────────────────────────────────────────────────

def _validate_vendor(db: Session, vendor_id: int) -> Contact:
    vendor = db.query(Contact).filter(Contact.id == vendor_id).first()
    if not vendor:
        raise ValueError(f"Contact with id {vendor_id} not found.")
    if vendor.contact_type.lower() not in ("vendor", "supplier", "both"):
        raise ValueError(
            f"Contact '{vendor.name}' is not a vendor "
            f"(contact_type='{vendor.contact_type}'). "
            "Only contacts with type 'vendor', 'supplier', or 'both' are allowed."
        )
    if not vendor.is_active:
        raise ValueError(f"Vendor '{vendor.name}' is inactive.")
    return vendor


def _validate_product(db: Session, product_id: int) -> Product:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise ValueError(f"Product with id {product_id} not found.")
    if not product.is_active:
        raise ValueError(f"Product '{product.name}' is inactive.")
    return product


# ── CRUD operations ──────────────────────────────────────────────────────────

def create_purchase_order(
    db: Session,
    data: PurchaseOrderCreate,
    user_id: Optional[int] = None,
) -> PurchaseOrder:
    """Create a new draft purchase order with lines and backend-computed totals."""
    _validate_vendor(db, data.vendor_id)

    for line_data in data.lines:
        _validate_product(db, line_data.product_id)

    order_number = _generate_order_number(db)
    order_date = data.order_date or PyDate.today()

    try:
        order = PurchaseOrder(
            order_number=order_number,
            vendor_id=data.vendor_id,
            order_date=order_date,
            status="draft",
            subtotal=Decimal("0.00"),
            tax=Decimal("0.00"),
            total=Decimal("0.00"),
            created_by=user_id,
        )
        db.add(order)
        db.flush()  # get order.id

        line_objects: List[PurchaseOrderLine] = []
        for line_data in data.lines:
            product = _validate_product(db, line_data.product_id)
            # Use product's purchase_price if unit_price not provided or is 0
            unit_price = line_data.unit_price
            if unit_price == Decimal("0.00"):
                unit_price = Decimal(str(product.purchase_price))
            tax_rate = line_data.tax_rate

            line_total = _compute_line_total(
                Decimal(str(line_data.quantity)), unit_price, tax_rate
            )
            line_obj = PurchaseOrderLine(
                purchase_order_id=order.id,
                product_id=line_data.product_id,
                quantity=Decimal(str(line_data.quantity)),
                unit_price=unit_price,
                tax_rate=tax_rate,
                line_total=line_total,
            )
            db.add(line_obj)
            line_objects.append(line_obj)

        db.flush()

        subtotal, tax_total, total = _compute_order_totals(line_objects)
        order.subtotal = subtotal
        order.tax = tax_total
        order.total = total

        db.commit()
        db.refresh(order)
        return order

    except Exception:
        db.rollback()
        raise


def get_purchase_order(db: Session, order_id: int) -> Optional[PurchaseOrder]:
    return db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id).first()


def get_purchase_orders(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    status: Optional[str] = None,
    vendor_id: Optional[int] = None,
) -> Tuple[List[PurchaseOrder], int]:
    """Returns (orders, total_count)."""
    query = db.query(PurchaseOrder)

    if search:
        term = f"%{search}%"
        query = query.filter(PurchaseOrder.order_number.ilike(term))

    if status:
        query = query.filter(PurchaseOrder.status == status.lower())

    if vendor_id is not None:
        query = query.filter(PurchaseOrder.vendor_id == vendor_id)

    total = query.count()
    orders = (
        query.order_by(PurchaseOrder.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return orders, total


def update_purchase_order(
    db: Session,
    order_id: int,
    data: PurchaseOrderUpdate,
    user_id: Optional[int] = None,
) -> PurchaseOrder:
    """Update a draft purchase order. Non-draft orders cannot be edited."""
    order = get_purchase_order(db, order_id)
    if not order:
        raise ValueError(f"Purchase order with id {order_id} not found.")

    if order.status != "draft":
        raise ValueError(
            f"Cannot edit a purchase order with status '{order.status}'. "
            "Only draft orders can be modified."
        )

    if data.vendor_id is not None:
        _validate_vendor(db, data.vendor_id)
        order.vendor_id = data.vendor_id

    if data.order_date is not None:
        order.order_date = data.order_date

    try:
        if data.lines is not None:
            for line_data in data.lines:
                _validate_product(db, line_data.product_id)

            for old_line in list(order.lines):
                db.delete(old_line)
            db.flush()

            line_objects: List[PurchaseOrderLine] = []
            for line_data in data.lines:
                product = _validate_product(db, line_data.product_id)
                unit_price = line_data.unit_price
                if unit_price == Decimal("0.00"):
                    unit_price = Decimal(str(product.purchase_price))
                tax_rate = line_data.tax_rate
                line_total = _compute_line_total(
                    Decimal(str(line_data.quantity)), unit_price, tax_rate
                )
                line_obj = PurchaseOrderLine(
                    purchase_order_id=order.id,
                    product_id=line_data.product_id,
                    quantity=Decimal(str(line_data.quantity)),
                    unit_price=unit_price,
                    tax_rate=tax_rate,
                    line_total=line_total,
                )
                db.add(line_obj)
                line_objects.append(line_obj)

            db.flush()
            subtotal, tax_total, total = _compute_order_totals(line_objects)
            order.subtotal = subtotal
            order.tax = tax_total
            order.total = total

        order.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(order)
        return order

    except Exception:
        db.rollback()
        raise


def confirm_purchase_order(
    db: Session,
    order_id: int,
    user_id: Optional[int] = None,
) -> PurchaseOrder:
    """Transition a draft purchase order to confirmed."""
    order = get_purchase_order(db, order_id)
    if not order:
        raise ValueError(f"Purchase order with id {order_id} not found.")

    if order.status != "draft":
        raise ValueError(
            f"Cannot confirm a purchase order with status '{order.status}'. "
            "Only draft orders can be confirmed."
        )

    if not order.lines:
        raise ValueError("Cannot confirm a purchase order with no lines.")

    try:
        order.status = "confirmed"
        order.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(order)
        return order
    except Exception:
        db.rollback()
        raise


def cancel_purchase_order(
    db: Session,
    order_id: int,
    user_id: Optional[int] = None,
) -> PurchaseOrder:
    """Cancel a draft or confirmed purchase order."""
    order = get_purchase_order(db, order_id)
    if not order:
        raise ValueError(f"Purchase order with id {order_id} not found.")

    if order.status == "cancelled":
        raise ValueError(f"Purchase order #{order_id} is already cancelled.")

    try:
        order.status = "cancelled"
        order.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(order)
        return order
    except Exception:
        db.rollback()
        raise
