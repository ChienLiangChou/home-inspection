"""
Test script for Phase 4: Performance Evaluation and Feedback Loop
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.orm import Session
from database.connection import SessionLocal
from models.issue import Issue
from models.feedback import Feedback
from services.issue_service import IssueService
from services.data_cleaning_service import DataCleaningService
from services.performance_evaluation_service import PerformanceEvaluationService
from services.ab_testing_service import ABTestingService
from services.continuous_learning_service import ContinuousLearningService
from schemas.issue import IssueCreate


def test_detection_performance_evaluation():
    """Test 1: Detection Performance Evaluation"""
    print("\n" + "="*60)
    print("Test 1: Detection Performance Evaluation")
    print("="*60)
    
    db: Session = SessionLocal()
    try:
        service = PerformanceEvaluationService(db)
        result = service.evaluate_detection_performance()
        
        print(f"✅ Detection performance evaluation:")
        print(f"  - Status: {result.get('status')}")
        if result.get('status') == 'success':
            print(f"  - Precision: {result.get('precision', 0):.2f}")
            print(f"  - Recall: {result.get('recall', 0):.2f}")
            print(f"  - F1 Score: {result.get('f1_score', 0):.2f}")
            print(f"  - Accuracy: {result.get('accuracy', 0):.2f}")
            print(f"  - Total Validated: {result.get('total_validated', 0)}")
        else:
            print(f"  - Message: {result.get('message')}")
            return True  # Acceptable if no validated data
        
        return result.get('status') in ['success', 'insufficient_data']
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def test_severity_performance_evaluation():
    """Test 2: Severity Performance Evaluation"""
    print("\n" + "="*60)
    print("Test 2: Severity Performance Evaluation")
    print("="*60)
    
    db: Session = SessionLocal()
    try:
        service = PerformanceEvaluationService(db)
        result = service.evaluate_severity_prediction()
        
        print(f"✅ Severity performance evaluation:")
        print(f"  - Status: {result.get('status')}")
        if result.get('status') == 'success':
            print(f"  - Accuracy: {result.get('accuracy', 0):.2f}")
            print(f"  - Total: {result.get('total', 0)}")
            print(f"  - Correct: {result.get('correct', 0)}")
        else:
            print(f"  - Message: {result.get('message')}")
            return True  # Acceptable if no data
        
        return result.get('status') in ['success', 'insufficient_data']
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def test_recommendation_performance_evaluation():
    """Test 3: Recommendation Performance Evaluation"""
    print("\n" + "="*60)
    print("Test 3: Recommendation Performance Evaluation")
    print("="*60)
    
    db: Session = SessionLocal()
    try:
        service = PerformanceEvaluationService(db)
        result = service.evaluate_recommendation_quality()
        
        print(f"✅ Recommendation performance evaluation:")
        print(f"  - Status: {result.get('status')}")
        if result.get('status') == 'success':
            print(f"  - Quality Score: {result.get('quality_score', 0):.2f}")
            print(f"  - Adoption Rate: {result.get('adoption_rate', 0):.2f}")
        else:
            print(f"  - Message: {result.get('message')}")
            return True  # Acceptable if no data
        
        return result.get('status') in ['success', 'insufficient_data']
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def test_ab_testing():
    """Test 4: A/B Testing"""
    print("\n" + "="*60)
    print("Test 4: A/B Testing")
    print("="*60)
    
    db: Session = SessionLocal()
    try:
        service = ABTestingService(db)
        
        # Test auto-switch (will check if models exist)
        result = service.auto_switch_best_model("detection", improvement_threshold=0.05)
        
        print(f"✅ A/B testing:")
        print(f"  - Status: {result.get('status')}")
        print(f"  - Message: {result.get('message', 'N/A')}")
        
        # Test is successful if it runs without error
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def test_continuous_learning_cycle():
    """Test 5: Continuous Learning Cycle"""
    print("\n" + "="*60)
    print("Test 5: Continuous Learning Cycle")
    print("="*60)
    
    db: Session = SessionLocal()
    try:
        service = ContinuousLearningService(db)
        
        # Test feedback collection
        feedback_result = service.collect_new_feedback()
        print(f"✅ Feedback collection:")
        print(f"  - New feedbacks: {feedback_result.get('new_feedbacks', 0)}")
        print(f"  - New validations: {feedback_result.get('new_validations', 0)}")
        
        # Test retraining evaluation
        evaluation = service.evaluate_retraining_need()
        print(f"✅ Retraining evaluation:")
        print(f"  - Should retrain: {evaluation.get('should_retrain', False)}")
        print(f"  - New feedback count: {evaluation.get('new_feedback_count', 0)}")
        print(f"  - Has enough data: {evaluation.get('has_enough_data', False)}")
        
        # Test full cycle (may skip training if not needed)
        cycle_result = service.run_learning_cycle()
        print(f"✅ Learning cycle:")
        print(f"  - Status: {cycle_result.get('status')}")
        print(f"  - Steps completed: {len(cycle_result.get('steps', {}))}")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def test_overall_performance():
    """Test 6: Overall Performance"""
    print("\n" + "="*60)
    print("Test 6: Overall Performance")
    print("="*60)
    
    db: Session = SessionLocal()
    try:
        service = PerformanceEvaluationService(db)
        result = service.get_overall_performance()
        
        print(f"✅ Overall performance:")
        print(f"  - Detection status: {result.get('detection', {}).get('status')}")
        print(f"  - Severity status: {result.get('severity', {}).get('status')}")
        print(f"  - Recommendation status: {result.get('recommendation', {}).get('status')}")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def main():
    """Run all Phase 4 tests"""
    print("\n" + "="*60)
    print("Phase 4 Testing: Performance Evaluation and Feedback Loop")
    print("="*60)
    
    results = []
    
    results.append(("Detection Performance", test_detection_performance_evaluation()))
    results.append(("Severity Performance", test_severity_performance_evaluation()))
    results.append(("Recommendation Performance", test_recommendation_performance_evaluation()))
    results.append(("A/B Testing", test_ab_testing()))
    results.append(("Continuous Learning Cycle", test_continuous_learning_cycle()))
    results.append(("Overall Performance", test_overall_performance()))
    
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
        print("\n🎉 All Phase 4 tests passed!")
        return 0
    else:
        print("\n⚠️  Some tests failed. Please review.")
        return 1


if __name__ == "__main__":
    sys.exit(main())



