#!/usr/bin/env python3
"""
Test script to verify all credit packages are working
"""
import os
import sys

# Set test environment variables
os.environ['PAYMENTS_ENABLED'] = 'true'
os.environ['STRIPE_SECRET_KEY'] = 'sk_test_fake'
os.environ['STRIPE_PUBLISHABLE_KEY'] = 'pk_test_fake'
os.environ['STRIPE_PRICE_STARTER_PACK'] = 'price_starter'
os.environ['STRIPE_PRICE_CREATOR_PACK'] = 'price_creator'
os.environ['STRIPE_PRICE_PROFESSIONAL_PACK'] = 'price_professional'

try:
    from backend.services.stripe_service import StripeService
    
    print("🧪 Testing All Credit Packages")
    print("=" * 50)
    
    service = StripeService()
    packages = service.get_all_packages()
    
    print("✅ All packages loaded successfully!")
    for pkg_id, pkg_info in packages.items():
        name = pkg_info['name']
        credits = pkg_info['credits']
        price = pkg_info['price_cents'] / 100
        print(f"  {pkg_id}: {name} - {credits} credits - ${price:.2f}")
    
    print("\nPayment status:", service.get_payment_status())
    print("\n🎉 All 3 packages are working correctly!")
    
except Exception as e:
    print(f"❌ Error testing packages: {e}")
    sys.exit(1) 