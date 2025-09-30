#!/bin/bash
# Test runner script for Home Inspection System
# Runs all tests in sequence and provides comprehensive results

set -e  # Exit on any error

echo "🧪 Home Inspection System - Test Runner"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "main.py" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    echo "   cd apps/backend && ./test_runner.sh"
    exit 1
fi

# Check Python version
echo "🐍 Checking Python version..."
python3 --version

# Install dependencies if needed
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Make scripts executable
chmod +x seed_data.py
chmod +x test_e2e.py
chmod +x test_rag_integration.py
chmod +x run_tests.py
chmod +x generate_test_data.py

# Run comprehensive tests
echo "🚀 Running comprehensive test suite..."
python3 run_tests.py

# Check results
if [ -f "comprehensive_test_results.json" ]; then
    echo "📊 Test Results Summary:"
    python3 -c "
import json
with open('comprehensive_test_results.json', 'r') as f:
    results = json.load(f)
    print(f'Overall Success: {results.get(\"overall_success\", False)}')
    if 'tests' in results:
        for test_type, test_results in results['tests'].items():
            if isinstance(test_results, dict):
                success_rate = test_results.get('success_rate', 0)
                passed = test_results.get('passed_tests', 0)
                total = test_results.get('total_tests', 0)
                print(f'{test_type}: {passed}/{total} ({success_rate:.1f}%)')
"
else
    echo "❌ No test results found"
    exit 1
fi

echo "✅ Test runner completed!"
echo "📄 Check comprehensive_test_results.json for detailed results"
