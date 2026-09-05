from typing import Optional, List, Tuple
from datetime import date as PyDate, datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.sales_order import SalesOrder, SalesOrderLine
from app.models.contact import Contact
from app.models.product import Product
from app.schemas.sales_order import SalesOrderCreate, SalesOrderUpdate


# ── Order number generation ──────────────────────────────────────────────────

def _generate_order_number(db: Session) -> str:
    """Generate a sequential order number like SO-0001, SO-0002, …"""
    count = db.query(SalesOrder).count()
    return f"SO-{count + 1:04d}"


# ── Totals calculation ───────────────────────────────────────────────────────

def _compute_line_total(quantity: Decimal, unit_price: Decimal, tax_rate: Decimal) -> Decimal:
    net = quantity * unit_price
    tax = net * (tax_rate / Decimal("100"))
    return (net + tax).quantize(Decimal("0.01"))


def _compute_order_totals(
    lines: List[SalesOrderLine],
) -> Tuple[Decimal, Decimal, Decimal]:
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

def _validate_customer(db: Session, customer_id: int) -> Contact:
    customer = db.query(Contact).filter(Contact.id == customer_id).first()
    if not customer:
        raise ValueError(f"Contact with id {customer_id} not found.")
    if customer.contact_type.lower() not in ("customer", "both"):
        raise ValueError(
            f"Contact '{customer.name}' is not a customer "
            f"(contact_type='{customer.contact_type}'). "
            "Only contacts with type 'customer' or 'both' are allowed."
        )
    if not customer.is_active:
        raise ValueError(f"Customer '{customer.name}' is inactive.")
    return customer


def _validate_product(db: Session, product_id: int) -> Product:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise ValueError(f"Product with id {product_id} not found.")
    if not product.is_active:
        raise ValueError(f"Product '{product.name}' is inactive.")
    return product


# ── CRUD operations ──────────────────────────────────────────────────────────

def create_sales_order(
    db: Session,
    data: SalesOrderCreate,
    user_id: Optional[int] = None,
) -> SalesOrder:
    """Create a new draft sales order with lines and computed totals."""
    # Validate customer
    _validate_customer(db, data.customer_id)

    # Validate all products first
    for line_data in data.lines:
        _validate_product(db, line_data.product_id)

    order_number = _generate_order_number(db)
    order_date = data.order_date or PyDate.today()

    try:
        order = SalesOrder(
            order_number=order_number,
            customer_id=data.customer_id,
            order_date=order_date,
            status="draft",
            subtotal=Decimal("0.00"),
            tax=Decimal("0.00"),
            total=Decimal("0.00"),
            created_by=user_id,
        )
        db.add(order)
        db.flush()  # get order.id

        line_objects: List[SalesOrderLine] = []
        for line_data in data.lines:
            product = _validate_product(db, line_data.product_id)
            # Use product's sale_price if unit_price not provided or is 0
            unit_price = line_data.unit_price
            if unit_price == Decimal("0.00"):
                unit_price = Decimal(str(product.sale_price))
            tax_rate = line_data.tax_rate

            line_total = _compute_line_total(
                Decimal(str(line_data.quantity)), unit_price, tax_rate
            )
            line_obj = SalesOrderLine(
                sales_order_id=order.id,
                product_id=line_data.product_id,
                quantity=Decimal(str(line_data.quantity)),
                unit_price=unit_price,
                tax_rate=tax_rate,
                line_total=line_total,
            )
            db.add(line_obj)
            line_objects.append(line_obj)

        db.flush()

        # Compute and store order totals
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


def get_sales_order(db: Session, order_id: int) -> Optional[SalesOrder]:
    return db.query(SalesOrder).filter(SalesOrder.id == order_id).first()


def get_sales_orders(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    status: Optional[str] = None,
    customer_id: Optional[int] = None,
) -> Tuple[List[SalesOrder], int]:
    """Returns (orders, total_count)."""
    query = db.query(SalesOrder)

    if search:
        term = f"%{search}%"
        query = query.filter(SalesOrder.order_number.ilike(term))

    if status:
        query = query.filter(SalesOrder.status == status.lower())

    if customer_id is not None:
        query = query.filter(SalesOrder.customer_id == customer_id)

    total = query.count()
    orders = (
        query.order_by(SalesOrder.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return orders, total


def update_sales_order(
    db: Session,
    order_id: int,
    data: SalesOrderUpdate,
    user_id: Optional[int] = None,
) -> SalesOrder:
    """Update a draft sales order. Posted/cancelled orders cannot be edited."""
    order = get_sales_order(db, order_id)
    if not order:
        raise ValueError(f"Sales order with id {order_id} not found.")

    if order.status != "draft":
        raise ValueError(
            f"Cannot edit a sales order with status '{order.status}'. "
            "Only draft orders can be modified."
        )

    if data.customer_id is not None:
        _validate_customer(db, data.customer_id)
        order.customer_id = data.customer_id

    if data.order_date is not None:
        order.order_date = data.order_date

    try:
        if data.lines is not None:
            # Validate all products first
            for line_data in data.lines:
                _validate_product(db, line_data.product_id)

            # Delete old lines and replace
            for old_line in list(order.lines):
                db.delete(old_line)
            db.flush()

            line_objects: List[SalesOrderLine] = []
            for line_data in data.lines:
                product = _validate_product(db, line_data.product_id)
                unit_price = line_data.unit_price
                if unit_price == Decimal("0.00"):
                    unit_price = Decimal(str(product.sale_price))
                tax_rate = line_data.tax_rate
                line_total = _compute_line_total(
                    Decimal(str(line_data.quantity)), unit_price, tax_rate
                )
                line_obj = SalesOrderLine(
                    sales_order_id=order.id,
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


def confirm_sales_order(
    db: Session,
    order_id: int,
    user_id: Optional[int] = None,
) -> SalesOrder:
    """Transition a draft order to confirmed status."""
    order = get_sales_order(db, order_id)
    if not order:
        raise ValueError(f"Sales order with id {order_id} not found.")

    if order.status != "draft":
        raise ValueError(
            f"Cannot confirm a sales order with status '{order.status}'. "
            "Only draft orders can be confirmed."
        )

    if not order.lines:
        raise ValueError("Cannot confirm an order with no lines.")

    try:
        order.status = "confirmed"
        order.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(order)
        return order
    except Exception:
        db.rollback()
        raise


def cancel_sales_order(
    db: Session,
    order_id: int,
    user_id: Optional[int] = None,
) -> SalesOrder:
    """Cancel a draft or confirmed order. Cancelled orders cannot be cancelled again."""
    order = get_sales_order(db, order_id)
    if not order:
        raise ValueError(f"Sales order with id {order_id} not found.")

    if order.status == "cancelled":
        raise ValueError(f"Sales order #{order_id} is already cancelled.")

    try:
        order.status = "cancelled"
        order.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(order)
        return order
    except Exception:
        db.rollback()
        raise
