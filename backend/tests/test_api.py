import unittest
import sys
import os
import json

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app

class TestAgriSenseAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Set up a test client before running the tests."""
        cls.app = create_app()
        cls.app.config['TESTING'] = True
        cls.client = cls.app.test_client()

    def test_health_check(self):
        """Test the health check endpoint"""
        response = self.client.get('/api/health')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'ok')
        self.assertIn('mongodb', data)

    def test_dashboard_stats(self):
        """Test the dashboard stats endpoint"""
        response = self.client.get('/api/dashboard')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('total_records', data)
        self.assertIn('crop_count', data)

    def test_crop_distribution(self):
        """Test the crop distribution endpoint"""
        response = self.client.get('/api/analytics/crop-distribution')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('data', data)
        self.assertTrue(isinstance(data['data'], list))

    def test_crop_names(self):
        """Test the crop names endpoint"""
        response = self.client.get('/api/crops/names')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('data', data)
        self.assertTrue(len(data['data']) > 0)

    def test_list_crops(self):
        """Test the paginated crop listing"""
        response = self.client.get('/api/crops?page=1&page_size=5')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data['data']), 5)
        self.assertIn('total', data)

    def test_recommendation_engine_missing_fields(self):
        """Test the recommendation engine with missing fields to verify validation"""
        payload = {
            "nitrogen": 90,
            "phosphorus": 42
            # Missing other fields
        }
        response = self.client.post(
            '/api/recommend',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)

    def test_recommendation_engine_valid(self):
        """Test the recommendation engine with valid simulated data"""
        payload = {
            "nitrogen": 90,
            "phosphorus": 42,
            "potassium": 43,
            "temperature": 21.0,
            "humidity": 80.0,
            "ph": 6.5,
            "rainfall": 200.0
        }
        response = self.client.post(
            '/api/recommend',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('top_crop', data)
        self.assertIn('recommendations', data)
        self.assertTrue(len(data['recommendations']) > 0)

if __name__ == '__main__':
    unittest.main()
