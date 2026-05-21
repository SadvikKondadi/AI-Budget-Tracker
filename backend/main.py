from fastapi import FastAPI, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from passlib.context import CryptContext

import pandas as pd
import pdfplumber
import io
import uuid
import random
import smtplib
import os
from email.mime.text import MIMEText

from database import engine, SessionLocal
from models import Base, User, Transaction as TransactionModel, Budget
from ml_model import predict_category

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://ai-budget-tracker-sigma.vercel.app",
        "https://ai-budget-tracker-backend.onrender.com",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
otp_store = {}


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class SendOTPRequest(BaseModel):
    email: str


class VerifyOTPRequest(BaseModel):
    email: str
    otp: str
    new_password: str


class Transaction(BaseModel):
    title: str
    amount: float
    category: str
    type: str
    date: str
    user_id: int


class CategoryRequest(BaseModel):
    title: str


class ChatRequest(BaseModel):
    message: str
    user_id: int


class BudgetRequest(BaseModel):
    monthly_limit: float


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/")
def home():
    return {"message": "AI Budget Tracker Backend is running"}


@app.post("/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == request.email).first()

    if existing_user:
        return {"message": "Email already registered"}

    hashed_password = pwd_context.hash(request.password)

    new_user = User(
        name=request.name,
        email=request.email,
        password=hashed_password,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User registered successfully"}


@app.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        return {"message": "Invalid email or password"}

    if not pwd_context.verify(request.password, user.password):
        return {"message": "Invalid email or password"}

    return {
        "message": "Login successful",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
        },
    }


@app.post("/send-otp")
def send_otp(request: SendOTPRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        return {"message": "Email not found"}

    otp = str(random.randint(100000, 999999))
    otp_store[request.email] = otp

    sender_email = os.getenv("EMAIL_USER")
    sender_password = os.getenv("EMAIL_PASS")

    if not sender_email or not sender_password:
        return {"message": "Email service not configured"}

    msg = MIMEText(f"Your AI Budget Tracker password reset OTP is: {otp}")
    msg["Subject"] = "AI Budget Tracker Password Reset OTP"
    msg["From"] = sender_email
    msg["To"] = request.email

    try:
        server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, request.email, msg.as_string())
        server.quit()

        return {"message": "OTP sent successfully"}

    except Exception as e:
        return {"message": f"Failed to send OTP: {str(e)}"}


@app.post("/verify-otp-reset-password")
def verify_otp_reset_password(
    request: VerifyOTPRequest,
    db: Session = Depends(get_db),
):
    stored_otp = otp_store.get(request.email)

    if not stored_otp:
        return {"message": "OTP expired or not found"}

    if stored_otp != request.otp:
        return {"message": "Invalid OTP"}

    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        return {"message": "Email not found"}

    user.password = pwd_context.hash(request.new_password)
    db.commit()

    del otp_store[request.email]

    return {"message": "Password reset successful"}


@app.post("/transactions")
def add_transaction(transaction: Transaction, db: Session = Depends(get_db)):
    new_transaction = TransactionModel(
        title=transaction.title,
        amount=transaction.amount,
        category=transaction.category,
        type=transaction.type,
        date=transaction.date,
        user_id=transaction.user_id,
        upload_id=None,
    )

    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)

    return {
        "message": "Transaction saved successfully",
        "data": new_transaction,
    }


@app.get("/transactions/{user_id}")
def get_transactions(user_id: int, db: Session = Depends(get_db)):
    return (
        db.query(TransactionModel)
        .filter(TransactionModel.user_id == user_id)
        .all()
    )


@app.put("/transactions/{transaction_id}")
def update_transaction(
    transaction_id: int,
    transaction: Transaction,
    db: Session = Depends(get_db),
):
    existing_transaction = (
        db.query(TransactionModel)
        .filter(TransactionModel.id == transaction_id)
        .first()
    )

    if not existing_transaction:
        return {"message": "Transaction not found"}

    existing_transaction.title = transaction.title
    existing_transaction.amount = transaction.amount
    existing_transaction.category = transaction.category
    existing_transaction.type = transaction.type
    existing_transaction.date = transaction.date
    existing_transaction.user_id = transaction.user_id

    db.commit()
    db.refresh(existing_transaction)

    return {
        "message": "Transaction updated successfully",
        "data": existing_transaction,
    }


@app.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    transaction = (
        db.query(TransactionModel)
        .filter(TransactionModel.id == transaction_id)
        .first()
    )

    if transaction:
        db.delete(transaction)
        db.commit()
        return {"message": "Transaction deleted successfully"}

    return {"message": "Transaction not found"}


@app.post("/predict-category")
def predict_expense_category(request: CategoryRequest):
    category = predict_category(request.title)

    return {
        "title": request.title,
        "predicted_category": category,
    }


@app.get("/predict-spending/{user_id}")
def predict_spending(user_id: int, db: Session = Depends(get_db)):
    transactions = (
        db.query(TransactionModel)
        .filter(TransactionModel.user_id == user_id)
        .all()
    )

    expenses = [
        t.amount for t in transactions
        if t.type.lower() == "expense"
    ]

    if len(expenses) == 0:
        return {
            "predicted_spending": 0,
            "message": "No expense data available for prediction.",
        }

    predicted_spending = sum(expenses)

    return {
        "predicted_spending": round(predicted_spending, 2),
        "message": f"Based on current spending, your estimated monthly expense is ${round(predicted_spending, 2)}.",
    }


@app.post("/chatbot")
def chatbot(request: ChatRequest, db: Session = Depends(get_db)):
    message = request.message.lower().strip()

    transactions = (
        db.query(TransactionModel)
        .filter(TransactionModel.user_id == request.user_id)
        .all()
    )

    total_income = sum(
        t.amount for t in transactions
        if t.type.lower() == "income"
    )

    total_expense = sum(
        t.amount for t in transactions
        if t.type.lower() == "expense"
    )

    balance = total_income - total_expense

    category_totals = {}

    for t in transactions:
        if t.type.lower() == "expense":
            category_totals[t.category] = category_totals.get(t.category, 0) + t.amount

    highest_category = "None"
    highest_amount = 0

    if category_totals:
        highest_category = max(category_totals, key=category_totals.get)
        highest_amount = category_totals[highest_category]

    manage_phrases = [
        "how should i manage",
        "manage my expenses",
        "manage expenses",
        "control my expenses",
        "control expenses",
        "spending advice",
        "expense advice",
        "financial advice",
        "how to manage",
    ]

    save_phrases = [
        "save more",
        "save money",
        "how can i save",
        "reduce spending",
        "reduce expenses",
        "cut expenses",
    ]

    if any(phrase in message for phrase in manage_phrases):
        if total_expense == 0:
            return {
                "reply": "You do not have expense data yet. Add expenses first so I can give better management advice."
            }

        return {
            "reply": f"To manage your expenses, review your spending weekly and set limits by category. Your current total expenses are ${total_expense}. Your highest spending category is {highest_category} with ${highest_amount}. Start by reducing unnecessary spending in {highest_category}, set a monthly budget, and avoid impulse purchases."
        }

    if any(phrase in message for phrase in save_phrases):
        if total_expense == 0:
            return {
                "reply": "You do not have expenses yet. Add expenses first so I can suggest saving opportunities."
            }

        return {
            "reply": f"To save more money, reduce your biggest category first: {highest_category} (${highest_amount}). Try cutting it by 10–20%, avoid non-essential purchases, and keep your balance positive. Your current balance is ${balance}."
        }

    if "balance" in message:
        return {"reply": f"Your current balance is ${balance}."}

    if "income" in message:
        return {"reply": f"Your total income is ${total_income}."}

    if "expense" in message or "expenses" in message or "spending" in message:
        return {"reply": f"Your total expenses are ${total_expense}."}

    return {
        "reply": "I can help you with income, expenses, balance, savings advice, and expense management."
    }


@app.post("/budget")
def save_budget(request: BudgetRequest, db: Session = Depends(get_db)):
    existing_budget = db.query(Budget).first()

    if existing_budget:
        existing_budget.monthly_limit = request.monthly_limit
    else:
        new_budget = Budget(monthly_limit=request.monthly_limit)
        db.add(new_budget)

    db.commit()

    return {"message": "Budget saved successfully"}


@app.get("/budget")
def get_budget(db: Session = Depends(get_db)):
    budget = db.query(Budget).first()

    if budget:
        return {"monthly_limit": budget.monthly_limit}

    return {"monthly_limit": 0}


@app.post("/upload-statement/{user_id}")
async def upload_statement(
    user_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    filename = file.filename.lower()
    transactions_added = 0
    upload_id = str(uuid.uuid4())

    if filename.endswith(".csv"):
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))

        for _, row in df.iterrows():
            title = str(row.get("title", "Unknown"))
            amount = float(row.get("amount", 0))
            category = str(row.get("category", "Other"))
            transaction_type = str(row.get("type", "Expense"))
            date = str(row.get("date", ""))

            transaction = TransactionModel(
                title=title,
                amount=amount,
                category=category,
                type=transaction_type,
                date=date,
                user_id=user_id,
                upload_id=upload_id,
            )

            db.add(transaction)
            transactions_added += 1

    elif filename.endswith(".xlsx"):
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))

        for _, row in df.iterrows():
            title = str(row.get("title", "Unknown"))
            amount = float(row.get("amount", 0))
            category = str(row.get("category", "Other"))
            transaction_type = str(row.get("type", "Expense"))
            date = str(row.get("date", ""))

            transaction = TransactionModel(
                title=title,
                amount=amount,
                category=category,
                type=transaction_type,
                date=date,
                user_id=user_id,
                upload_id=upload_id,
            )

            db.add(transaction)
            transactions_added += 1

    elif filename.endswith(".pdf"):
        contents = await file.read()

        with pdfplumber.open(io.BytesIO(contents)) as pdf:
            for page in pdf.pages:
                text = page.extract_text()

                if not text:
                    continue

                lines = text.split("\n")

                for line in lines:
                    parts = line.split()

                    if len(parts) < 3:
                        continue

                    try:
                        date = parts[0]
                        amount = float(
                            parts[-1]
                            .replace(",", "")
                            .replace("$", "")
                        )

                        title = " ".join(parts[1:-1])
                        category = predict_category(title)

                        transaction = TransactionModel(
                            title=title,
                            amount=amount,
                            category=category,
                            type="Expense",
                            date=date,
                            user_id=user_id,
                            upload_id=upload_id,
                        )

                        db.add(transaction)
                        transactions_added += 1

                    except:
                        pass

    else:
        return {"message": "Unsupported file format"}

    db.commit()

    return {
        "message": f"{transactions_added} transactions imported successfully",
        "upload_id": upload_id,
    }


@app.delete("/upload-statement/{upload_id}")
def delete_uploaded_statement(upload_id: str, db: Session = Depends(get_db)):
    transactions = (
        db.query(TransactionModel)
        .filter(TransactionModel.upload_id == upload_id)
        .all()
    )

    if not transactions:
        return {"message": "No uploaded transactions found"}

    count = len(transactions)

    for transaction in transactions:
        db.delete(transaction)

    db.commit()

    return {
        "message": f"Deleted {count} transactions from uploaded statement"
    }