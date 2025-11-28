"""
Database migration script to add self-learning system fields
Run this script to update the database schema for self-learning functionality
"""
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import create_engine, text, inspect
from database.connection import DATABASE_URL, engine
from database.base import Base
from models.issue import Issue
from models.feedback import Feedback
from models.training_data import TrainingData
from models.model_version import ModelVersion


def run_migration():
    """
    Run database migration to add self-learning system tables and fields
    """
    print("🔄 Starting database migration for self-learning system...")
    
    try:
        # Create all new tables (Feedback, TrainingData, ModelVersion)
        # Note: Issue table will be updated with new columns automatically
        print("📊 Creating new tables...")
        Base.metadata.create_all(bind=engine, tables=[
            Feedback.__table__,
            TrainingData.__table__,
            ModelVersion.__table__
        ])
        print("✅ New tables created")
        
        # Add new columns to existing Issue table
        print("📝 Adding new columns to Issue table...")
        with engine.connect() as conn:
            # Check if columns already exist before adding
            inspector = inspect(engine)
            existing_columns = [col['name'] for col in inspector.get_columns('issues')]
            
            new_columns = [
                ("user_validated", "BOOLEAN DEFAULT FALSE NOT NULL"),
                ("user_validation_result", "VARCHAR(20)"),
                ("expert_reviewed", "BOOLEAN DEFAULT FALSE NOT NULL"),
                ("expert_feedback", "JSON"),
                ("actual_severity", "VARCHAR(10)"),
                ("resolution_status", "VARCHAR(20)"),
                ("resolution_notes", "TEXT"),
                ("learning_score", "FLOAT")
            ]
            
            for col_name, col_def in new_columns:
                if col_name not in existing_columns:
                    if DATABASE_URL.startswith("sqlite"):
                        # SQLite doesn't support ALTER TABLE ADD COLUMN with DEFAULT easily
                        # We'll use a simpler approach
                        try:
                            conn.execute(text(f"ALTER TABLE issues ADD COLUMN {col_name} {col_def}"))
                            print(f"  ✅ Added column: {col_name}")
                        except Exception as e:
                            print(f"  ⚠️  Column {col_name} might already exist: {e}")
                    else:
                        # PostgreSQL/MySQL
                        try:
                            conn.execute(text(f"ALTER TABLE issues ADD COLUMN {col_name} {col_def}"))
                            print(f"  ✅ Added column: {col_name}")
                        except Exception as e:
                            print(f"  ⚠️  Column {col_name} might already exist: {e}")
                else:
                    print(f"  ℹ️  Column {col_name} already exists, skipping")
            
            # Create indexes for new columns
            print("📇 Creating indexes...")
            indexes_to_create = [
                ("idx_issues_user_validated", "issues", "user_validated"),
                ("idx_issues_expert_reviewed", "issues", "expert_reviewed"),
                ("idx_issues_learning_score", "issues", "learning_score"),
                ("idx_issues_resolution_status", "issues", "resolution_status"),
            ]
            
            for idx_name, table_name, col_name in indexes_to_create:
                try:
                    # Check if index exists
                    existing_indexes = [idx['name'] for idx in inspector.get_indexes(table_name)]
                    if idx_name not in existing_indexes:
                        conn.execute(text(f"CREATE INDEX {idx_name} ON {table_name}({col_name})"))
                        print(f"  ✅ Created index: {idx_name}")
                    else:
                        print(f"  ℹ️  Index {idx_name} already exists, skipping")
                except Exception as e:
                    print(f"  ⚠️  Could not create index {idx_name}: {e}")
            
            conn.commit()
        
        print("✅ Database migration completed successfully!")
        print("\n📋 Summary:")
        print("  - Created Feedback table")
        print("  - Created TrainingData table")
        print("  - Created ModelVersion table")
        print("  - Added learning fields to Issue table")
        print("  - Created indexes for performance")
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    run_migration()

