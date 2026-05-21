from sqlalchemy import Column, Integer, String, Float
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String)

    email = Column(String, unique=True, index=True)

    password = Column(String)


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String)

    amount = Column(Float)

    category = Column(String)

    type = Column(String)

    date = Column(String)

    upload_id = Column(String, nullable=True)

    user_id = Column(Integer)


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)

    monthly_limit = Column(Float)


class SavingsGoal(Base):
    __tablename__ = "savings_goals"

    id = Column(Integer, primary_key=True, index=True)

    goal_name = Column(String)

    target_amount = Column(Float)

    saved_amount = Column(Float, default=0)

    user_id = Column(Integer)