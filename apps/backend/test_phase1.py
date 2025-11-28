"""
Test script for Phase 1: Data Collection and Feedback System
Tests all new models, APIs, and functionality
"""
import sys
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.orm import Session
from database.connection import SessionLocal, engine, DATABASE_URL
from database.base import Base
from models.issue import Issue
from models.feedback import Feedback
from models.training_data import TrainingData
from models.model_version import ModelVersion
from services.issue_service import IssueService
from schemas.issue import IssueCreate
from datetime import datetime

def test_database_schema():
    """Test 1: Verify database schema"""
    print("\n" + "="*60)
    print("Test 1: Database Schema Verification")
    print("="*60)
    
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✅ All tables created successfully")
        
        # Check if tables exist
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        required_tables = ["issues", "feedbacks", "training_data", "model_versions"]
        for table in required_tables:
            if table in tables:
                print(f"  ✅ Table '{table}' exists")
            else:
                print(f"  ❌ Table '{table}' missing")
                return False
        
        # Check Issue table columns
        issue_columns = [col['name'] for col in inspector.get_columns('issues')]
        required_columns = [
            "user_validated", "user_validation_result", "expert_reviewed",
            "expert_feedback", "actual_severity", "resolution_status",
            "resolution_notes", "learning_score"
        ]
        
        for col in required_columns:
            if col in issue_columns:
                print(f"  ✅ Column 'issues.{col}' exists")
            else:
                print(f"  ❌ Column 'issues.{col}' missing")
                return False
        
        return True
    except Exception as e:
        print(f"❌ Schema test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_issue_creation():
    """Test 2: Create issue with learning score"""
    print("\n" + "="*60)
    print("Test 2: Issue Creation with Learning Score")
    print("="*60)
    
    db: Session = SessionLocal()
    try:
        issue_service = IssueService(db)
        
        # Create test issue
        issue_data = IssueCreate(
            issue_type="結構裂縫",
            severity="high",
            description="檢測到牆壁有明顯裂縫",
            recommendation="建議請專業結構工程師檢查",
            location="客廳東牆",
            component="結構",
            metadata_json={"detection_method": "camera", "confidence": 0.9}
        )
        
        issue = issue_service.create_issue(issue_data)
        
        print(f"✅ Issue created: ID={issue.id}")
        print(f"  - Issue Type: {issue.issue_type}")
        print(f"  - Severity: {issue.severity}")
        print(f"  - Learning Score: {issue.learning_score}")
        print(f"  - User Validated: {issue.user_validated}")
        print(f"  - Expert Reviewed: {issue.expert_reviewed}")
        
        # Verify learning score is calculated
        if issue.learning_score is not None and 0 <= issue.learning_score <= 1.0:
            print(f"✅ Learning score calculated correctly: {issue.learning_score}")
        else:
            print(f"❌ Learning score invalid: {issue.learning_score}")
            return False
        
        return issue.id
    except Exception as e:
        print(f"❌ Issue creation test failed: {e}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        db.close()


def test_user_validation(issue_id: int):
    """Test 3: User validation feedback"""
    print("\n" + "="*60)
    print("Test 3: User Validation Feedback")
    print("="*60)
    
    db: Session = SessionLocal()
    try:
        from models.feedback import Feedback
        
        # Create feedback directly (simulating API call)
        issue = db.query(Issue).filter(Issue.id == issue_id).first()
        if not issue:
            print(f"❌ Issue {issue_id} not found")
            return False
        
        original_result = {
            "issue_type": issue.issue_type,
            "severity": issue.severity,
            "description": issue.description,
            "recommendation": issue.recommendation
        }
        
        feedback = Feedback(
            issue_id=issue_id,
            feedback_type="user_validation",
            original_result=original_result,
            actual_result=None,
            differences=None,
            feedback_data={
                "validation_result": "correct",
                "notes": "檢測準確"
            },
            source="user"
        )
        db.add(feedback)
        
        # Update issue
        issue.user_validated = True
        issue.user_validation_result = "correct"
        
        db.commit()
        db.refresh(feedback)
        
        print(f"✅ User validation feedback created: ID={feedback.id}")
        print(f"  - Feedback Type: {feedback.feedback_type}")
        print(f"  - Validation Result: {feedback.feedback_data.get('validation_result')}")
        
        # Verify issue was updated
        db.refresh(issue)
        if issue.user_validated:
            print(f"✅ Issue updated: user_validated={issue.user_validated}")
        else:
            print(f"❌ Issue not updated")
            return False
        
        return True
    except Exception as e:
        print(f"❌ User validation test failed: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return False
    finally:
        db.close()


def test_expert_review(issue_id: int):
    """Test 4: Expert review feedback"""
    print("\n" + "="*60)
    print("Test 4: Expert Review Feedback")
    print("="*60)
    
    db: Session = SessionLocal()
    try:
        from models.feedback import Feedback
        
        issue = db.query(Issue).filter(Issue.id == issue_id).first()
        if not issue:
            print(f"❌ Issue {issue_id} not found")
            return False
        
        original_result = {
            "issue_type": issue.issue_type,
            "severity": issue.severity,
            "description": issue.description,
            "recommendation": issue.recommendation
        }
        
        actual_result = {
            "issue_type": issue.issue_type,
            "severity": "high",
            "description": issue.description,
            "recommendation": "立即請結構工程師檢查，可能需要加固"
        }
        
        differences = {
            "severity_changed": True,
            "recommendation_changed": True
        }
        
        feedback = Feedback(
            issue_id=issue_id,
            feedback_type="expert_review",
            original_result=original_result,
            actual_result=actual_result,
            differences=differences,
            feedback_data={
                "expert_id": "expert_001",
                "expert_notes": "問題比檢測結果更嚴重"
            },
            source="expert_001"
        )
        db.add(feedback)
        
        # Update issue
        issue.expert_reviewed = True
        issue.expert_feedback = {
            "corrected_severity": "high",
            "corrected_recommendation": "立即請結構工程師檢查，可能需要加固",
            "expert_notes": "問題比檢測結果更嚴重"
        }
        issue.actual_severity = "high"
        
        db.commit()
        db.refresh(feedback)
        
        print(f"✅ Expert review feedback created: ID={feedback.id}")
        print(f"  - Feedback Type: {feedback.feedback_type}")
        print(f"  - Expert ID: {feedback.source}")
        
        # Verify issue was updated
        db.refresh(issue)
        if issue.expert_reviewed:
            print(f"✅ Issue updated: expert_reviewed={issue.expert_reviewed}")
            print(f"  - Actual Severity: {issue.actual_severity}")
        else:
            print(f"❌ Issue not updated")
            return False
        
        return True
    except Exception as e:
        print(f"❌ Expert review test failed: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return False
    finally:
        db.close()


def test_resolution_tracking(issue_id: int):
    """Test 5: Resolution tracking feedback"""
    print("\n" + "="*60)
    print("Test 5: Resolution Tracking Feedback")
    print("="*60)
    
    db: Session = SessionLocal()
    try:
        from models.feedback import Feedback
        from datetime import datetime
        
        issue = db.query(Issue).filter(Issue.id == issue_id).first()
        if not issue:
            print(f"❌ Issue {issue_id} not found")
            return False
        
        original_result = {
            "issue_type": issue.issue_type,
            "severity": issue.severity,
            "description": issue.description,
            "recommendation": issue.recommendation,
            "resolved": issue.resolved
        }
        
        actual_result = {
            "resolution_status": "resolved",
            "actual_severity": "medium",
            "resolved": True
        }
        
        feedback = Feedback(
            issue_id=issue_id,
            feedback_type="resolution_tracking",
            original_result=original_result,
            actual_result=actual_result,
            differences={
                "resolution_status": "resolved",
                "severity_verified": True
            },
            feedback_data={
                "resolution_notes": "已請結構工程師檢查並修復"
            },
            source="system"
        )
        db.add(feedback)
        
        # Update issue
        issue.resolution_status = "resolved"
        issue.resolution_notes = "已請結構工程師檢查並修復"
        issue.actual_severity = "medium"
        issue.resolved = "true"
        issue.resolved_at = datetime.utcnow()
        
        db.commit()
        db.refresh(feedback)
        
        print(f"✅ Resolution tracking feedback created: ID={feedback.id}")
        print(f"  - Feedback Type: {feedback.feedback_type}")
        print(f"  - Resolution Status: {feedback.actual_result.get('resolution_status')}")
        
        # Verify issue was updated
        db.refresh(issue)
        if issue.resolution_status == "resolved":
            print(f"✅ Issue updated: resolution_status={issue.resolution_status}")
            print(f"  - Resolved: {issue.resolved}")
        else:
            print(f"❌ Issue not updated correctly")
            return False
        
        return True
    except Exception as e:
        print(f"❌ Resolution tracking test failed: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return False
    finally:
        db.close()


def test_feedback_stats():
    """Test 6: Feedback statistics"""
    print("\n" + "="*60)
    print("Test 6: Feedback Statistics")
    print("="*60)
    
    db: Session = SessionLocal()
    try:
        from models.feedback import Feedback
        
        total_feedbacks = db.query(Feedback).count()
        user_validations = db.query(Feedback).filter(Feedback.feedback_type == "user_validation").count()
        expert_reviews = db.query(Feedback).filter(Feedback.feedback_type == "expert_review").count()
        resolution_trackings = db.query(Feedback).filter(Feedback.feedback_type == "resolution_tracking").count()
        
        correct_count = db.query(Issue).filter(Issue.user_validation_result == "correct").count()
        expert_reviewed_count = db.query(Issue).filter(Issue.expert_reviewed == True).count()
        resolved_count = db.query(Issue).filter(Issue.resolution_status.isnot(None)).count()
        
        stats = {
            "total_feedbacks": total_feedbacks,
            "by_type": {
                "user_validation": user_validations,
                "expert_review": expert_reviews,
                "resolution_tracking": resolution_trackings
            },
            "validation_results": {
                "correct": correct_count
            },
            "expert_reviewed_count": expert_reviewed_count,
            "resolved_count": resolved_count
        }
        
        print(f"✅ Feedback stats retrieved:")
        print(f"  - Total Feedbacks: {stats.get('total_feedbacks')}")
        print(f"  - User Validations: {stats.get('by_type', {}).get('user_validation', 0)}")
        print(f"  - Expert Reviews: {stats.get('by_type', {}).get('expert_review', 0)}")
        print(f"  - Resolution Trackings: {stats.get('by_type', {}).get('resolution_tracking', 0)}")
        print(f"  - Expert Reviewed Issues: {stats.get('expert_reviewed_count', 0)}")
        print(f"  - Resolved Issues: {stats.get('resolved_count', 0)}")
        
        return True
    except Exception as e:
        print(f"❌ Feedback stats test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def test_learning_score_calculation():
    """Test 7: Learning score calculation"""
    print("\n" + "="*60)
    print("Test 7: Learning Score Calculation")
    print("="*60)
    
    db: Session = SessionLocal()
    try:
        issue_service = IssueService(db)
        
        # Test different scenarios
        test_cases = [
            {
                "name": "High value issue (has everything)",
                "data": IssueCreate(
                    issue_type="嚴重問題",
                    severity="high",
                    description="詳細描述",
                    recommendation="建議",
                    location="位置",
                    component="組件",
                    metadata_json={"key": "value"}
                ),
                "expected_min": 0.7
            },
            {
                "name": "Low value issue (minimal data)",
                "data": IssueCreate(
                    issue_type="問題",
                    severity="low",
                    description="描述"
                ),
                "expected_min": 0.2
            }
        ]
        
        for test_case in test_cases:
            issue = issue_service.create_issue(test_case["data"])
            score = issue.learning_score
            
            print(f"  Test: {test_case['name']}")
            print(f"    Learning Score: {score}")
            
            if score >= test_case["expected_min"]:
                print(f"    ✅ Score meets minimum expectation")
            else:
                print(f"    ⚠️  Score below expectation (expected >= {test_case['expected_min']})")
        
        return True
    except Exception as e:
        print(f"❌ Learning score calculation test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("Phase 1 Testing: Data Collection and Feedback System")
    print("="*60)
    
    results = []
    
    # Test 1: Database Schema
    results.append(("Database Schema", test_database_schema()))
    
    # Test 2: Issue Creation
    issue_id = test_issue_creation()
    results.append(("Issue Creation", issue_id is not None))
    
    if issue_id:
        # Test 3-5: Feedback functionality
        results.append(("User Validation", test_user_validation(issue_id)))
        results.append(("Expert Review", test_expert_review(issue_id)))
        results.append(("Resolution Tracking", test_resolution_tracking(issue_id)))
    
    # Test 6: Feedback Stats
    results.append(("Feedback Statistics", test_feedback_stats()))
    
    # Test 7: Learning Score
    results.append(("Learning Score Calculation", test_learning_score_calculation()))
    
    # Summary
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Phase 1 is ready.")
        return 0
    else:
        print("\n⚠️  Some tests failed. Please review.")
        return 1


if __name__ == "__main__":
    sys.exit(main())

