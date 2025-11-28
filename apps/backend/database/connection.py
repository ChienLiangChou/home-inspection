import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from typing import Generator

# Get database URL from environment
DATABASE_URL = os.getenv("DB_URL", "sqlite:///./data/home_inspection.db")

# Ensure data directory exists for SQLite
if DATABASE_URL.startswith("sqlite"):
    # Extract path from SQLite URL (e.g., "sqlite:///./data/home_inspection.db" -> "./data/home_inspection.db")
    db_path = DATABASE_URL.replace("sqlite:///", "")
    if not db_path.startswith("/"):  # Relative path
        db_file = Path(db_path)
        db_file.parent.mkdir(parents=True, exist_ok=True)

# Create engine with appropriate configuration
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    engine = create_engine(DATABASE_URL)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator:
    """
    Dependency to get database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
