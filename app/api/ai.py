import os
import json
import re
import urllib.request
import urllib.error
from decimal import Decimal
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.models.user import User
from app.models.contact import Contact
from app.models.product import Product
from app.models.account import Account
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.journal_entry import JournalEntry
from app.services.dashboard_service import get_dashboard_summary

router = APIRouter(prefix="/ai", tags=["AI Copilot"])


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []
    active_page: Optional[str] = "Dashboard"


class ActionButton(BaseModel):
    label: str
    type: str  # "navigate" | "fill_prompt"
    target: str


class ChatResponse(BaseModel):
    reply: str
    actions: List[ActionButton] = []
    source: str  # "llm" | "erp_expert_engine"


def get_live_erp_context(db: Session) -> Dict[str, Any]:
    """Gathers real-time snapshot from DB to ground AI answers in actual numbers."""
    try:
        summary = get_dashboard_summary(db)
        
        # Also top 3 products
        products = db.query(Product).limit(5).all()
        prod_list = [
            f"{p.name} (Code: {p.code or 'N/A'}, Price: ₹{float(p.sales_price or 0):,.2f}, Stock: {p.stock_quantity if hasattr(p, 'stock_quantity') else 'In Stock'})"
            for p in products
        ]
        
        # Recent invoices count
        unpaid_invoices = db.query(Invoice).filter(
            Invoice.invoice_type == "customer_invoice",
            Invoice.status.in_(["draft", "posted"])
        ).count()
        
        return {
            "total_sales": float(summary.total_sales or 0),
            "total_purchases": float(summary.total_purchases or 0),
            "total_income": float(summary.total_income or 0),
            "total_expenses": float(summary.total_expenses or 0),
            "net_profit": float(summary.net_profit or 0),
            "cash_bank_balance": float(summary.cash_bank_balance or 0),
            "total_customers": summary.total_customers,
            "total_vendors": summary.total_vendors,
            "total_products": summary.total_products,
            "total_accounts": summary.total_accounts,
            "unpaid_invoices": unpaid_invoices,
            "sample_products": prod_list,
        }
    except Exception as e:
        return {"error": str(e)}


def call_gemini_rest(api_key: str, prompt: str, system_instruction: str) -> Optional[str]:
    """Call Google Gemini 1.5 Flash via standard urllib without external heavy deps."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": f"System Context:\n{system_instruction}\n\nUser Question:\n{prompt}"}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 1000
        }
    }
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=12) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            candidates = res_data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    return parts[0].get("text", "")
    except Exception as err:
        print(f"[Gemini REST Warning] {err}")
    return None


def call_openai_rest(api_key: str, prompt: str, system_instruction: str) -> Optional[str]:
    """Call OpenAI gpt-4o-mini via standard urllib."""
    url = "https://api.openai.com/v1/chat/completions"
    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 1000
    }
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=12) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            choices = res_data.get("choices", [])
            if choices:
                return choices[0].get("message", {}).get("content", "")
    except Exception as err:
        print(f"[OpenAI REST Warning] {err}")
    return None


def erp_expert_rule_engine(query: str, erp_ctx: Dict[str, Any], active_page: str) -> (str, List[ActionButton]):
    """
    Intelligent ERP Assistant rule & knowledge engine.
    Covers domain accounting rules, Indian GST, double-entry, UPI QR payments,
    real-time database numbers, and situational guidance.
    """
    q = query.lower().strip()
    actions = []

    # 1. Real-time metrics / Revenue / Sales / Financial Health
    if any(k in q for k in ["revenue", "sales", "turnover", "income", "profit", "how much we earned", "total sales"]):
        sales = erp_ctx.get("total_sales", 0.0)
        profit = erp_ctx.get("net_profit", 0.0)
        income = erp_ctx.get("total_income", 0.0)
        expense = erp_ctx.get("total_expenses", 0.0)
        cash = erp_ctx.get("cash_bank_balance", 0.0)
        
        reply = (
            f"### 📊 Financial & Revenue Overview\n\n"
            f"Here is your live real-time financial snapshot from the Urban Furniture ledger:\n\n"
            f"- **Total Sales Invoiced:** ₹{sales:,.2f}\n"
            f"- **Operating Income:** ₹{income:,.2f}\n"
            f"- **Operating Expenses:** ₹{expense:,.2f}\n"
            f"- **Net Profit:** ₹{profit:,.2f} {'📈' if profit >= 0 else '⚠️'}\n"
            f"- **Cash & Bank Liquidity:** ₹{cash:,.2f}\n\n"
            f"> *Note: These figures reflect all posted accounting entries and validated transactions.*"
        )
        actions = [
            ActionButton(label="View Sales Orders", type="navigate", target="Sales"),
            ActionButton(label="View Financial Reports", type="navigate", target="Reports"),
            ActionButton(label="View Dashboard", type="navigate", target="Dashboard")
        ]
        return reply, actions

    # 2. UPI QR Code & Payment collection
    if any(k in q for k in ["upi", "qr code", "qr", "gpay", "phonepe", "paytm", "bhim"]):
        reply = (
            "### 📱 UPI & Instant QR Code Payments\n\n"
            "Urban Furniture ERP supports **NPCI-compliant dynamic UPI QR codes**:\n\n"
            "1. **Invoice UPI QR:** On the **Sales** page or **Payments** page, click the **'Pay via UPI'** or **'Show UPI QR'** button on any customer invoice.\n"
            "2. **Dynamic Generation:** A standardized UPI URI string (`upi://pay?pa=urbanfurniture@icici&pn=Urban+Furniture&am=...`) generates a scan-ready QR code.\n"
            "3. **Supported UPI Apps:** Google Pay, PhonePe, Paytm, BHIM, CRED, or any banking app.\n"
            "4. **UTR Recording:** After the customer scans & pays, enter the 12-digit **UTR / Bank Reference Number** to instantly reconcile and mark the invoice as **Paid**.\n"
            "5. **Over-The-Counter Instant QR:** Open the Payments module and click **'Instant UPI QR'** for fast on-the-spot customer retail collections."
        )
        actions = [
            ActionButton(label="Open Payments Module", type="navigate", target="Payments"),
            ActionButton(label="Go to Sales Invoices", type="navigate", target="Sales")
        ]
        return reply, actions

    # 3. Double Entry Accounting Rules & Journal Entries
    if any(k in q for k in ["double entry", "debit", "credit", "journal entry", "golden rule", "ledger"]):
        reply = (
            "### ⚖️ Double-Entry Bookkeeping Principles\n\n"
            "In Urban Furniture ERP, every financial transaction must satisfy:\n"
            "$$\\sum \\text{Debits} = \\sum \\text{Credits}$$\n\n"
            "#### Golden Rules of Accounting:\n"
            "1. **Real Accounts (Assets & Cash):** Debit what comes in, Credit what goes out.\n"
            "2. **Personal Accounts (Customers & Vendors):** Debit the receiver, Credit the giver.\n"
            "3. **Nominal Accounts (Expenses & Revenues):** Debit all expenses & losses, Credit all incomes & gains.\n\n"
            "#### Common Transaction Templates in this System:\n"
            "- **Cash Sale of Furniture:**\n"
            "  - `Debit` Cash / Bank Account\n"
            "  - `Credit` Sales Revenue Account\n"
            "  - `Credit` Output CGST / SGST (if applicable)\n"
            "- **Vendor Raw Material Purchase on Credit:**\n"
            "  - `Debit` Raw Material Inventory / Expense\n"
            "  - `Debit` Input GST Tax Credit\n"
            "  - `Credit` Accounts Payable (Vendor)"
        )
        actions = [
            ActionButton(label="Create Journal Entry", type="navigate", target="Journal Entries"),
            ActionButton(label="View Chart of Accounts", type="navigate", target="Accounts"),
            ActionButton(label="View Journals", type="navigate", target="Journals")
        ]
        return reply, actions

    # 4. GST & Taxes (Indian Goods & Services Tax)
    if any(k in q for k in ["gst", "tax", "cgst", "sgst", "igst", "hsn"]):
        reply = (
            "### 🏛️ GST Architecture & Furniture Industry Rates\n\n"
            "- **Intra-State Sales (Within same State):** Split equally into **CGST** (Central GST) and **SGST** (State GST).\n"
            "- **Inter-State Sales (Across State Borders):** Levied as **IGST** (Integrated GST).\n\n"
            "#### Standard GST Brackets for Urban Furniture:\n"
            "- **18% GST (HSN 9403):** Wooden, metal, and upholstered furniture (Office chairs, executive desks, dining sets).\n"
            "- **12% GST (HSN 9401):** Medical furniture, specialized ergonomic seating.\n"
            "- **28% GST (HSN 9404):** Luxury mattresses, premium spring bedding.\n\n"
            "**Input Tax Credit (ITC):** GST paid on raw timber, screws, and vendor bills can be claimed against your output GST liability when filing GSTR-3B."
        )
        actions = [
            ActionButton(label="Check Tax Accounts", type="navigate", target="Accounts"),
            ActionButton(label="Review Sales Invoices", type="navigate", target="Sales")
        ]
        return reply, actions

    # 5. Products & Inventory
    if any(k in q for k in ["product", "stock", "inventory", "furniture items", "item"]):
        total_p = erp_ctx.get("total_products", 0)
        sample_p = erp_ctx.get("sample_products", [])
        p_bullets = "\n".join([f"- {item}" for item in sample_p[:4]]) if sample_p else "- No items added yet"
        
        reply = (
            f"### 📦 Product Catalog & Stock Status\n\n"
            f"You currently have **{total_p} active products** configured in the system.\n\n"
            f"**Recent Inventory Highlights:**\n"
            f"{p_bullets}\n\n"
            f"You can create new products with custom SKU codes, sales prices, standard cost prices, and specify default income/expense accounts."
        )
        actions = [
            ActionButton(label="Open Products Catalog", type="navigate", target="Products"),
            ActionButton(label="Check Purchases & Vendor Bills", type="navigate", target="Purchases")
        ]
        return reply, actions

    # 6. Customers, Vendors & Contacts
    if any(k in q for k in ["contact", "customer", "vendor", "supplier", "client"]):
        cust = erp_ctx.get("total_customers", 0)
        vend = erp_ctx.get("total_vendors", 0)
        reply = (
            f"### 👥 Directory & Business Partners\n\n"
            f"Your CRM contact directory contains:\n"
            f"- **Active Customers:** {cust}\n"
            f"- **Suppliers & Vendors:** {vend}\n\n"
            f"Each contact profile maintains GSTIN, billing address, phone, payment terms, and tracks lifetime accounts receivable / accounts payable."
        )
        actions = [
            ActionButton(label="View Contacts Directory", type="navigate", target="Contacts"),
            ActionButton(label="Create Customer Invoice", type="navigate", target="Sales")
        ]
        return reply, actions

    # 7. Budgets & Analytic Accounts
    if any(k in q for k in ["budget", "analytic", "cost center", "variance"]):
        reply = (
            "### 📈 Budgeting & Cost Centers\n\n"
            "Urban Furniture ERP provides **Analytic Accounting** and **Budget Tracking**:\n"
            "1. **Analytic Accounts:** Tag transactions by project, department, or showroom location.\n"
            "2. **Budget Thresholds:** Set monthly or annual spending caps per expense account.\n"
            "3. **Variance Analysis:** The **Budget Report** automatically computes Planned vs. Actual spending and warns about budget overruns."
        )
        actions = [
            ActionButton(label="Manage Budgets", type="navigate", target="Budget"),
            ActionButton(label="View Budget Variance Report", type="navigate", target="Budget Report")
        ]
        return reply, actions

    # 8. Help, User Guide, or General Greetings
    if any(k in q for k in ["hi", "hello", "hey", "who are you", "what can you do", "help"]):
        reply = (
            "### 👋 Hello! I am your Urban Furniture ERP Copilot\n\n"
            "I am deeply integrated into your accounting system to assist you with:\n\n"
            "- 📊 **Live Ledger & Revenue Metrics:** Ask me about total sales, income, or liquidity.\n"
            "- 📱 **UPI Payments & Reconciliations:** Ask how to generate QR codes or record UTR numbers.\n"
            "- ⚖️ **Double-Entry Bookkeeping:** Ask how to debit/credit specific asset or expense transactions.\n"
            "- 🏛️ **GST & Taxation:** Inquire about 18%/12% furniture GST brackets or ITC claims.\n"
            "- 🚀 **Fast Navigation:** I can open any module for you with one click!\n\n"
            "**What would you like assistance with today?**"
        )
        actions = [
            ActionButton(label="Summarize Financials", type="fill_prompt", target="Summarize our financial health and revenue"),
            ActionButton(label="How does UPI QR work?", type="fill_prompt", target="How do I collect payment via UPI QR code?"),
            ActionButton(label="Explain Double Entry", type="fill_prompt", target="What is the double entry rule for cash sales?")
        ]
        return reply, actions

    # Default Contextual Reply
    reply = (
        f"### 💡 Accounting Assistant Response\n\n"
        f"Regarding your query: *\"{query}\"*\n\n"
        f"Urban Furniture ERP is equipped to handle this workflow. "
        f"Currently, your system is tracking **{erp_ctx.get('total_sales', 0):,.2f} INR in sales** across "
        f"**{erp_ctx.get('total_products', 0)} products** and **{erp_ctx.get('total_customers', 0)} customers**.\n\n"
        f"Here are recommended actions depending on your task:\n"
        f"- To create or post customer bills: head over to **Sales Invoices**.\n"
        f"- To record supplier purchases: open **Purchases**.\n"
        f"- To track ledger balances or manual journals: check **Journal Entries**.\n"
        f"- To reconcile bank/cash payments or trigger UPI QR: visit **Payments**."
    )
    actions = [
        ActionButton(label="Go to Sales", type="navigate", target="Sales"),
        ActionButton(label="Go to Payments", type="navigate", target="Payments"),
        ActionButton(label="Go to Reports", type="navigate", target="Reports")
    ]
    return reply, actions


@router.post("/chat", response_model=ChatResponse)
def chat_with_ai(
    req: ChatRequest,
    db: Session = Depends(get_db)
):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    erp_ctx = get_live_erp_context(db)
    active_page = req.active_page or "Dashboard"

    gemini_key = os.getenv("GEMINI_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    # If an external LLM API key is present, try invoking the LLM with live ERP telemetry
    if gemini_key or openai_key:
        system_instruction = (
            f"You are the intelligent ERP AI Assistant for 'Urban Furniture' accounting application. "
            f"User is currently viewing the '{active_page}' page. "
            f"Here is the live real-time ERP context from PostgreSQL:\n{json.dumps(erp_ctx, indent=2)}\n\n"
            f"Rules:\n"
            f"1. Be professional, concise, and helpful with accounting precision.\n"
            f"2. Use Indian Rupee (₹) for monetary amounts.\n"
            f"3. Explain double-entry (Debit/Credit) accurately when asked.\n"
            f"4. Format with markdown headers and clean bullet points."
        )

        llm_reply = None
        if gemini_key:
            llm_reply = call_gemini_rest(gemini_key, req.message, system_instruction)
        elif openai_key:
            llm_reply = call_openai_rest(openai_key, req.message, system_instruction)

        if llm_reply:
            actions = [
                ActionButton(label="View Sales", type="navigate", target="Sales"),
                ActionButton(label="View Payments", type="navigate", target="Payments")
            ]
            return ChatResponse(reply=llm_reply, actions=actions, source="llm")

    # Intelligent ERP Domain & Rule Engine
    reply, actions = erp_expert_rule_engine(req.message, erp_ctx, active_page)
    return ChatResponse(reply=reply, actions=actions, source="erp_expert_engine")
