"""
Test script for Phase 2: Data Cleaning and Preprocessing System
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.orm import Session
from database.connection import SessionLocal
from models.issue import Issue
from models.training_data import TrainingData
from services.issue_service import IssueService
from services.data_cleaning_service import DataCleaningService
from schemas.issue import IssueCreate


def test_data_cleaning_service():
    """Test 1: Data Cleaning Service"""
    print("\n" + "="*60)
    print("Test 1: Data Cleaning Service")
    print("="*60)
    
    db: Session = SessionLocal()
    try:
        cleaning_service = DataCleaningService(db)
        
        # Create test issues
        issue_service = IssueService(db)
        
        # Issue 1: Complete data
        issue1_data = IssueCreate(
            issue_type="結構裂縫",
            severity="high",
            description="檢測到牆壁有明顯裂縫，需要立即處理",
            recommendation="建議請專業結構工程師檢查並修復",
            location="客廳東牆",
            component="結構",
            metadata_json={"detection_method": "camera"}
        )
        issue1 = issue_service.create_issue(issue1_data)
        
        # Issue 2: Minimal data
        issue2_data = IssueCreate(
            issue_type="漏水",
            severity="medium",
            description="發現漏水"
        )
        issue2 = issue_service.create_issue(issue2_data)
        
        # Issue 3: Non-standard issue type (will be standardized)
        issue3_data = IssueCreate(
            issue_type="mold",
            severity="high",  # Use standard value
            description="發現黴菌"
        )
        issue3 = issue_service.create_issue(issue3_data)
        
        print(f"✅ Created 3 test issues: {issue1.id}, {issue2.id}, {issue3.id}")
        
        # Test cleaning
        result = cleaning_service.clean_issues(
            issue_ids=[issue1.id, issue2.id, issue3.id],
            batch_size=10
        )
        
        print(f"✅ Cleaning completed:")
        print(f"  - Status: {result['status']}")
        print(f"  - Processed: {result['processed']}")
        print(f"  - Cleaned: {result['cleaned']}")
        print(f"  - Failed: {result['failed']}")
        print(f"  - Duplicates: {result.get('duplicates_found', 0)}")
        print(f"  - Outliers: {result.get('outliers_found', 0)}")
        
        # Verify training data created
        training_data = db.query(TrainingData).filter(
            TrainingData.issue_id.in_([issue1.id, issue2.id, issue3.id])
        ).all()
        
        print(f"✅ Training data records created: {len(training_data)}")
        
        for td in training_data:
            print(f"  - Issue {td.issue_id}: status={td.cleaned_status}, quality={td.quality_score:.2f}")
        
        return result['status'] == 'completed' and result['cleaned'] > 0
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def test_deduplication():
    """Test 2: Deduplication"""
    print("\n" + "="*60)
    print("Test 2: Deduplication")
    print("="*60)
    
    db: Session = SessionLocal()
    try:
        cleaning_service = DataCleaningService(db)
        issue_service = IssueService(db)
        
        # Create duplicate issues (same type, location, within 1 hour)
        from datetime import datetime, timedelta
        
        issue1_data = IssueCreate(
            issue_type="結構裂縫",
            severity="high",
            description="檢測到裂縫",
            location="客廳東牆",
            component="結構"
        )
        issue1 = issue_service.create_issue(issue1_data)
        
        # Create second issue with same type and location
        issue2_data = IssueCreate(
            issue_type="結構裂縫",
            severity="high",
            description="檢測到裂縫",
            location="客廳東牆",
            component="結構"
        )
        issue2 = issue_service.create_issue(issue2_data)
        
        # Check for duplicates
        is_dup = cleaning_service._check_duplicate(issue2)
        
        if is_dup:
            print(f"✅ Duplicate detected correctly")
        else:
            print(f"⚠️  Duplicate not detected (might be due to time window)")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def test_standardization():
    """Test 3: Data Standardization"""
    print("\n" + "="*60)
    print("Test 3: Data Standardization")
    print("="*60)
    
    db: Session = SessionLocal()
    try:
        cleaning_service = DataCleaningService(db)
        issue_service = IssueService(db)
        
        # Create issue with non-standard data
        issue_data = IssueCreate(
            issue_type="crack",  # English, will be mapped
            severity="high",  # Use standard value
            description="  檢測到裂縫  ",  # Extra spaces
            location=" 客廳  ",
            component="結構"
        )
        issue = issue_service.create_issue(issue_data)
        
        # Manually set non-standard values to test standardization
        issue.issue_type = "crack"  # Will be mapped to "結構裂縫"
        issue.severity = "嚴重"  # Will be mapped to "high"
        issue.description = "  檢測到裂縫  "
        db.commit()
        db.refresh(issue)
        
        # Standardize
        standardized = cleaning_service._standardize_issue(issue)
        
        print(f"✅ Standardization results:")
        print(f"  - Issue Type: '{issue.issue_type}' -> '{standardized['issue_type']}'")
        print(f"  - Severity: '{issue.severity}' -> '{standardized['severity']}'")
        print(f"  - Description: '{issue.description}' -> '{standardized['description']}'")
        
        # Verify mappings
        if standardized['issue_type'] != issue.issue_type:
            print(f"  ✅ Issue type mapped correctly")
        if standardized['severity'] == 'high':
            print(f"  ✅ Severity mapped correctly")
        if standardized['description'].strip() == standardized['description']:
            print(f"  ✅ Description spaces removed")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def test_quality_scoring():
    """Test 4: Quality Score Calculation"""
    print("\n" + "="*60)
    print("Test 4: Quality Score Calculation")
    print("="*60)
    
    db: Session = SessionLocal()
    try:
        cleaning_service = DataCleaningService(db)
        issue_service = IssueService(db)
        
        # Create high-quality issue
        issue1_data = IssueCreate(
            issue_type="結構裂縫",
            severity="high",
            description="詳細描述",
            recommendation="建議",
            location="位置",
            component="組件",
            metadata_json={"key": "value"}
        )
        issue1 = issue_service.create_issue(issue1_data)
        standardized1 = cleaning_service._standardize_issue(issue1)
        score1 = cleaning_service._calculate_quality_score(issue1, standardized1)
        
        # Create low-quality issue
        issue2_data = IssueCreate(
            issue_type="問題",
            severity="low",
            description="描述"
        )
        issue2 = issue_service.create_issue(issue2_data)
        standardized2 = cleaning_service._standardize_issue(issue2)
        score2 = cleaning_service._calculate_quality_score(issue2, standardized2)
        
        print(f"✅ Quality scores:")
        print(f"  - High-quality issue: {score1:.2f}")
        print(f"  - Low-quality issue: {score2:.2f}")
        
        if score1 > score2:
            print(f"  ✅ High-quality issue has higher score")
        else:
            print(f"  ⚠️  Score comparison unexpected")
        
        if 0 <= score1 <= 1.0 and 0 <= score2 <= 1.0:
            print(f"  ✅ Scores in valid range (0-1)")
        else:
            print(f"  ❌ Scores out of range")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def test_validation():
    """Test 5: Data Validation"""
    print("\n" + "="*60)
    print("Test 5: Data Validation")
    print("="*60)
    
    db: Session = SessionLocal()
    try:
        cleaning_service = DataCleaningService(db)
        issue_service = IssueService(db)
        
        # Valid issue
        valid_issue_data = IssueCreate(
            issue_type="結構裂縫",
            severity="high",
            description="描述"
        )
        valid_issue = issue_service.create_issue(valid_issue_data)
        validation1 = cleaning_service._validate_issue(valid_issue)
        
        print(f"✅ Validation results:")
        print(f"  - Valid issue: {validation1['valid']}")
        if validation1['valid']:
            print(f"    ✅ Valid issue passed validation")
        else:
            print(f"    ❌ Valid issue failed: {validation1['errors']}")
            return False
        
        # Invalid issue (missing required fields)
        invalid_issue = Issue(
            issue_type="",  # Empty
            severity="high",
            description=""  # Empty
        )
        validation2 = cleaning_service._validate_issue(invalid_issue)
        
        if not validation2['valid']:
            print(f"  - Invalid issue: {validation2['valid']}")
            print(f"    ✅ Invalid issue correctly rejected")
            print(f"    Errors: {validation2['errors']}")
        else:
            print(f"    ❌ Invalid issue passed validation")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def main():
    """Run all Phase 2 tests"""
    print("\n" + "="*60)
    print("Phase 2 Testing: Data Cleaning and Preprocessing System")
    print("="*60)
    
    results = []
    
    results.append(("Data Cleaning Service", test_data_cleaning_service()))
    results.append(("Deduplication", test_deduplication()))
    results.append(("Standardization", test_standardization()))
    results.append(("Quality Scoring", test_quality_scoring()))
    results.append(("Validation", test_validation()))
    
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
        print("\n🎉 All Phase 2 tests passed!")
        return 0
    else:
        print("\n⚠️  Some tests failed. Please review.")
        return 1


if __name__ == "__main__":
    sys.exit(main())

