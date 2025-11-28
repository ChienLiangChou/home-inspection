"""
Cleaning Scheduler for automated data cleaning tasks
"""
import schedule
import time
from datetime import datetime
from sqlalchemy.orm import Session
from database.connection import SessionLocal
from services.data_cleaning_service import DataCleaningService


def run_daily_cleaning():
    """Run daily cleaning of new data"""
    print(f"[{datetime.now()}] Starting daily cleaning...")
    db: Session = SessionLocal()
    try:
        cleaning_service = DataCleaningService(db)
        result = cleaning_service.clean_issues(batch_size=500, force_reclean=False)
        
        print(f"[{datetime.now()}] Daily cleaning completed:")
        print(f"  - Processed: {result.get('processed', 0)}")
        print(f"  - Cleaned: {result.get('cleaned', 0)}")
        print(f"  - Failed: {result.get('failed', 0)}")
        print(f"  - Duplicates: {result.get('duplicates_found', 0)}")
        print(f"  - Outliers: {result.get('outliers_found', 0)}")
        
    except Exception as e:
        print(f"[{datetime.now()}] Daily cleaning failed: {str(e)}")
    finally:
        db.close()


def run_weekly_deep_cleaning():
    """Run weekly deep cleaning of all data"""
    print(f"[{datetime.now()}] Starting weekly deep cleaning...")
    db: Session = SessionLocal()
    try:
        cleaning_service = DataCleaningService(db)
        result = cleaning_service.clean_issues(batch_size=1000, force_reclean=True)
        
        print(f"[{datetime.now()}] Weekly deep cleaning completed:")
        print(f"  - Processed: {result.get('processed', 0)}")
        print(f"  - Cleaned: {result.get('cleaned', 0)}")
        print(f"  - Failed: {result.get('failed', 0)}")
        print(f"  - Duplicates: {result.get('duplicates_found', 0)}")
        print(f"  - Outliers: {result.get('outliers_found', 0)}")
        
    except Exception as e:
        print(f"[{datetime.now()}] Weekly deep cleaning failed: {str(e)}")
    finally:
        db.close()


def setup_scheduler():
    """Setup scheduled cleaning tasks"""
    # Daily cleaning at 2 AM
    schedule.every().day.at("02:00").do(run_daily_cleaning)
    
    # Weekly deep cleaning on Sunday at 3 AM
    schedule.every().sunday.at("03:00").do(run_weekly_deep_cleaning)
    
    print("✅ Cleaning scheduler configured:")
    print("  - Daily cleaning: 02:00")
    print("  - Weekly deep cleaning: Sunday 03:00")


def run_scheduler():
    """Run the scheduler (blocking)"""
    setup_scheduler()
    print("🔄 Cleaning scheduler started. Press Ctrl+C to stop.")
    
    try:
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    except KeyboardInterrupt:
        print("\n🛑 Cleaning scheduler stopped.")


if __name__ == "__main__":
    # For testing, run immediately
    print("Running test cleaning...")
    run_daily_cleaning()
    
    # Uncomment to run scheduler
    # run_scheduler()



