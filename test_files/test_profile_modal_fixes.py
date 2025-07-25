#!/usr/bin/env python3
"""
Test Profile Modal Fixes
Tests that credit purchases appear in both current balance and usage history
"""

import requests
import json
import os
import sys

class ProfileModalTester:
    def __init__(self):
        self.base_url = "http://localhost:5000"
        self.test_user_token = None
        
    def log(self, message, level="INFO"):
        """Log a message with timestamp"""
        print(f"[{level}] {message}")
        
    def test_auth_and_profile(self):
        """Test authentication and profile modal data"""
        self.log("Testing profile modal data retrieval...")
        
        try:
            # Test auth status
            response = requests.get(f"{self.base_url}/api/auth/status")
            if response.status_code == 200:
                data = response.json()
                if data.get('authenticated'):
                    self.log("✅ User is authenticated", "SUCCESS")
                    user_id = data['user']['id']
                    credits = data.get('credits', 0)
                    self.log(f"Current credits: {credits}", "INFO")
                    
                    # Test profile endpoint
                    self.test_profile_endpoint()
                    
                    # Test usage history
                    self.test_usage_history()
                    
                    # Test credits endpoint
                    self.test_credits_endpoint()
                    
                else:
                    self.log("❌ User not authenticated - please login first", "ERROR")
            else:
                self.log(f"❌ Auth status check failed: {response.status_code}", "ERROR")
                
        except Exception as e:
            self.log(f"❌ Error testing auth: {e}", "ERROR")
    
    def test_profile_endpoint(self):
        """Test the profile endpoint"""
        try:
            response = requests.get(f"{self.base_url}/api/auth/profile")
            if response.status_code == 200:
                data = response.json()
                self.log("✅ Profile endpoint working", "SUCCESS")
                self.log(f"Profile data: {json.dumps(data, indent=2)}", "DEBUG")
            else:
                self.log(f"❌ Profile endpoint failed: {response.status_code}", "ERROR")
        except Exception as e:
            self.log(f"❌ Error testing profile: {e}", "ERROR")
    
    def test_usage_history(self):
        """Test the usage history endpoint"""
        try:
            response = requests.get(f"{self.base_url}/api/auth/usage-history?page=1&per_page=20")
            if response.status_code == 200:
                data = response.json()
                self.log("✅ Usage history endpoint working", "SUCCESS")
                
                history_data = data.get('data', [])
                self.log(f"Found {len(history_data)} usage history entries", "INFO")
                
                # Check for credit purchases
                purchases = [entry for entry in history_data if entry.get('action') == 'credit_purchase']
                if purchases:
                    self.log(f"✅ Found {len(purchases)} credit purchases in history!", "SUCCESS")
                    for purchase in purchases:
                        credits = purchase.get('credits_used', 0)
                        date = purchase.get('created_at', '')
                        self.log(f"  • Purchase: +{credits} credits on {date}", "INFO")
                else:
                    self.log("⚠️ No credit purchases found in usage history", "WARNING")
                    self.log("This could be normal if no purchases have been made", "INFO")
                
                # Show all entries for debugging
                self.log("All usage history entries:", "DEBUG")
                for entry in history_data:
                    action = entry.get('action', 'unknown')
                    credits = entry.get('credits_used', 0)
                    date = entry.get('created_at', '')
                    self.log(f"  • {action}: {credits} credits on {date}", "DEBUG")
                    
            else:
                self.log(f"❌ Usage history endpoint failed: {response.status_code}", "ERROR")
        except Exception as e:
            self.log(f"❌ Error testing usage history: {e}", "ERROR")
    
    def test_credits_endpoint(self):
        """Test the credits endpoint"""
        try:
            response = requests.get(f"{self.base_url}/api/auth/credits")
            if response.status_code == 200:
                data = response.json()
                credits = data.get('credits', 0)
                self.log(f"✅ Credits endpoint working - Current balance: {credits}", "SUCCESS")
            else:
                self.log(f"❌ Credits endpoint failed: {response.status_code}", "ERROR")
        except Exception as e:
            self.log(f"❌ Error testing credits: {e}", "ERROR")
    
    def test_stripe_transactions(self):
        """Test Stripe transaction history if available"""
        try:
            response = requests.get(f"{self.base_url}/api/stripe/transactions")
            if response.status_code == 200:
                data = response.json()
                transactions = data.get('transactions', [])
                self.log(f"✅ Found {len(transactions)} Stripe transactions", "SUCCESS")
                
                for transaction in transactions:
                    credits = transaction.get('credits_amount', 0)
                    status = transaction.get('status', 'unknown')
                    date = transaction.get('created_at', '')
                    self.log(f"  • Transaction: +{credits} credits ({status}) on {date}", "INFO")
                    
            elif response.status_code == 401:
                self.log("⚠️ Not authenticated for Stripe transactions", "WARNING")
            else:
                self.log(f"❌ Stripe transactions failed: {response.status_code}", "ERROR")
        except Exception as e:
            self.log(f"❌ Error testing Stripe transactions: {e}", "ERROR")
    
    def run_all_tests(self):
        """Run all tests"""
        self.log("Starting Profile Modal Fixes Tests...")
        self.log("=" * 50)
        
        # Test backend APIs
        self.test_auth_and_profile()
        
        # Test Stripe if available
        self.test_stripe_transactions()
        
        self.log("=" * 50)
        self.log("Tests completed!")
        
        self.log("\n📋 How to test the frontend fixes:")
        self.log("1. Open your browser and go to your app")
        self.log("2. Login to your account")
        self.log("3. Click the Profile button to open the modal")
        self.log("4. Check the 'Credit History' tab")
        self.log("5. Look for credit purchases with green '+' values")
        self.log("6. Check that the modal respects your theme setting")
        self.log("\n🐛 If credit purchases don't appear:")
        self.log("- Make sure you've made a purchase through Stripe")
        self.log("- Check browser console for debug messages")
        self.log("- Verify the backend changes were applied")

if __name__ == "__main__":
    tester = ProfileModalTester()
    tester.run_all_tests() 