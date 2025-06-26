"""
Stripe Service
Handles all Stripe API interactions for the AudioBook Organizer
"""

import os
import logging
import stripe
from typing import Dict, Any, Optional, Tuple
from datetime import datetime
import json

from ..services.supabase_service import get_supabase_service

# Configure logging
logger = logging.getLogger(__name__)

class StripeService:
    """Service for handling Stripe payment operations"""
    
    def __init__(self):
        """Initialize Stripe service with API keys"""
        self.stripe_secret_key = os.environ.get('STRIPE_SECRET_KEY')
        self.stripe_publishable_key = os.environ.get('STRIPE_PUBLISHABLE_KEY')
        self.webhook_secret = os.environ.get('STRIPE_WEBHOOK_SECRET')
        
        # Payment toggle setting (defaults to True for backwards compatibility)
        self.payments_enabled = os.environ.get('PAYMENTS_ENABLED', 'true').lower() == 'true'
        
        # Stripe price IDs for credit packages
        self.starter_pack_price_id = os.environ.get('STRIPE_PRICE_STARTER_PACK')
        self.creator_pack_price_id = os.environ.get('STRIPE_PRICE_CREATOR_PACK')
        self.professional_pack_price_id = os.environ.get('STRIPE_PRICE_PROFESSIONAL_PACK')
        
        # Set Stripe API key
        stripe.api_key = self.stripe_secret_key
        
        # Credit package configurations
        self.credit_packages = {
            'starter': {
                'name': 'Starter Pack',
                'credits': 500,
                'price_cents': 499,  # $4.99
                'price_id': self.starter_pack_price_id,
                'description': '500 credits for processing documents and audio files'
            },
            'creator': {
                'name': 'Creator Pack', 
                'credits': 1500,
                'price_cents': 1499,  # $14.99
                'price_id': self.creator_pack_price_id,
                'description': '1,500 credits for power users and content creators'
            },
            'professional': {
                'name': 'Professional Pack',
                'credits': 3500,
                'price_cents': 2999,  # $29.99
                'price_id': self.professional_pack_price_id,
                'description': '3,500 credits for professional users and publishers'
            }
        }
        
        logger.info("Stripe service initialized successfully")
    
    def are_payments_enabled(self) -> bool:
        """Check if payments are currently enabled"""
        return self.payments_enabled
    
    def get_payment_status(self) -> Dict[str, Any]:
        """Get current payment system status"""
        return {
            'enabled': self.payments_enabled,
            'stripe_configured': bool(self.stripe_secret_key and self.stripe_publishable_key),
            'packages_configured': bool(self.starter_pack_price_id and self.creator_pack_price_id and self.professional_pack_price_id)
        }
    
    def get_package_info(self, package_type: str) -> Optional[Dict[str, Any]]:
        """Get information about a credit package"""
        return self.credit_packages.get(package_type)
    
    def get_all_packages(self) -> Dict[str, Dict[str, Any]]:
        """Get all available credit packages"""
        return self.credit_packages
    
    def create_checkout_session(
        self, 
        user_id: str, 
        package_type: str,
        success_url: str,
        cancel_url: str
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Create a Stripe Checkout session for credit purchase
        
        Returns:
            Tuple[bool, Optional[str], Optional[str]]: (success, session_id, error_message)
        """
        try:
            # Validate package type
            package_info = self.get_package_info(package_type)
            if not package_info:
                return False, None, f"Invalid package type: {package_type}"
            
            # Create checkout session
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price': package_info['price_id'],
                    'quantity': 1,
                }],
                mode='payment',
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={
                    'user_id': user_id,
                    'package_type': package_type,
                    'credits': package_info['credits'],
                    'app_name': 'AudioBook Organizer'
                }
            )
            
            logger.info(f"Checkout session created: {session.id} for user {user_id}")
            return True, session.id, None
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating checkout session: {e}")
            return False, None, str(e)
        except Exception as e:
            logger.error(f"Unexpected error creating checkout session: {e}")
            return False, None, "An unexpected error occurred"
    
    def get_checkout_session(self, session_id: str) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """
        Retrieve a Stripe Checkout session
        
        Returns:
            Tuple[bool, Optional[Dict], Optional[str]]: (success, session_data, error_message)
        """
        try:
            session = stripe.checkout.Session.retrieve(session_id)
            return True, {
                'id': session.id,
                'payment_status': session.payment_status,
                'amount_total': session.amount_total,
                'currency': session.currency,
                'metadata': session.metadata,
                'customer_email': session.customer_details.email if session.customer_details else None
            }, None
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error retrieving checkout session: {e}")
            return False, None, str(e)
        except Exception as e:
            logger.error(f"Unexpected error retrieving checkout session: {e}")
            return False, None, "An unexpected error occurred"
    
    def verify_webhook_signature(self, payload: bytes, signature: str) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """
        Verify Stripe webhook signature and return event data
        
        Returns:
            Tuple[bool, Optional[Dict], Optional[str]]: (success, event_data, error_message)
        """
        try:
            event = stripe.Webhook.construct_event(
                payload, signature, self.webhook_secret
            )
            logger.info(f"Webhook signature verified for event: {event['type']}")
            return True, event, None
            
        except ValueError as e:
            logger.error(f"Invalid payload: {e}")
            return False, None, "Invalid payload"
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid signature: {e}")
            return False, None, "Invalid signature"
        except Exception as e:
            logger.error(f"Unexpected error verifying webhook: {e}")
            return False, None, "An unexpected error occurred"
    
    def process_payment_success(self, event_data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """
        Process successful payment and add credits to user account
        
        Returns:
            Tuple[bool, Optional[str]]: (success, error_message)
        """
        try:
            # Extract session data from event
            session = event_data['data']['object']
            session_id = session['id']
            user_id = session['metadata'].get('user_id')
            package_type = session['metadata'].get('package_type')
            credits_to_add = int(session['metadata'].get('credits', 0))
            
            if not user_id or not package_type or not credits_to_add:
                return False, "Missing required metadata in payment session"
            
            # Get package info for validation
            package_info = self.get_package_info(package_type)
            if not package_info:
                return False, f"Invalid package type: {package_type}"
            
            # Check if this event has already been processed
            supabase_service = get_supabase_service()
            supabase = supabase_service.client
            
            # Try to check for duplicate events, but don't fail if the table doesn't exist
            try:
                existing_event = supabase.table('stripe_events').select('*').eq('stripe_event_id', event_data['id']).execute()
                if existing_event.data:
                    logger.info(f"Event {event_data['id']} already processed, skipping")
                    return True, None
            except Exception as e:
                logger.warning(f"Could not check for duplicate events: {e}, proceeding with payment")
                # Continue processing - better to potentially double-process than to fail
            
            # Start transaction-like operations
            try:
                # Record the event as being processed (use service role to bypass RLS)
                event_record = {
                    'stripe_event_id': event_data['id'],
                    'event_type': event_data['type'],
                    'webhook_data': event_data,
                    'processing_status': 'processed'
                }
                # Use service role client to bypass RLS for webhook events
                service_supabase = supabase_service.get_service_client()
                if service_supabase:
                    try:
                        service_supabase.table('stripe_events').insert(event_record).execute()
                        logger.info(f"Event {event_data['id']} recorded successfully")
                    except Exception as e:
                        logger.warning(f"Could not record event to stripe_events table: {e}")
                        # Continue with payment processing even if event logging fails
                else:
                    logger.warning("Service client not available, skipping event logging")
                
                # Add credits to user account
                success, error = self._add_credits_to_user(user_id, credits_to_add)
                if not success:
                    # Update event status to failed
                    service_supabase.table('stripe_events').update({
                        'processing_status': 'failed',
                        'error_message': error
                    }).eq('stripe_event_id', event_data['id']).execute()
                    return False, error
                
                # Record the transaction
                transaction_record = {
                    'user_id': user_id,
                    'transaction_type': 'purchase',
                    'credits_amount': credits_to_add,
                    'payment_method': 'stripe',
                    'payment_id': session.get('payment_intent'),
                    'stripe_session_id': session_id,
                    'stripe_payment_intent_id': session.get('payment_intent'),
                    'stripe_event_id': event_data['id'],
                    'status': 'completed',
                    'metadata': {
                        'package_type': package_type,
                        'amount_cents': session.get('amount_total'),
                        'currency': session.get('currency'),
                        'stripe_session_id': session_id
                    }
                }
                
                supabase.table('credit_transactions').insert(transaction_record).execute()
                
                # IMPORTANT: Also log the purchase in usage_logs so it appears in profile modal history
                supabase_service.log_usage(
                    user_id=user_id,
                    action='credit_purchase',
                    credits_used=credits_to_add,  # Positive value for purchases
                    metadata={
                        'package_type': package_type,
                        'amount_cents': session.get('amount_total'),
                        'currency': session.get('currency', 'USD'),
                        'stripe_session_id': session_id,
                        'stripe_payment_intent_id': session.get('payment_intent'),
                        'transaction_type': 'purchase'
                    }
                )
                
                logger.info(f"Successfully processed payment: {credits_to_add} credits added to user {user_id}")
                return True, None
                
            except Exception as e:
                # Update event status to failed (if service client is available)
                try:
                    if service_supabase:
                        service_supabase.table('stripe_events').update({
                            'processing_status': 'failed',
                            'error_message': str(e)
                        }).eq('stripe_event_id', event_data['id']).execute()
                except Exception as update_error:
                    logger.warning(f"Could not update event status: {update_error}")
                    pass  # Don't fail if we can't update the event status
                raise e
                
        except Exception as e:
            logger.error(f"Error processing payment success: {e}")
            return False, str(e)
    
    def _add_credits_to_user(self, user_id: str, credits: int) -> Tuple[bool, Optional[str]]:
        """
        Add credits to user account in Supabase
        
        Returns:
            Tuple[bool, Optional[str]]: (success, error_message)
        """
        try:
            supabase_service = get_supabase_service()
            supabase = supabase_service.client
            
            # Get current user credits
            result = supabase.table('user_credits').select('*').eq('user_id', user_id).execute()
            
            if result.data:
                # User exists, update credits
                current_credits = result.data[0]['credits']
                new_credits = current_credits + credits
                
                update_result = supabase.table('user_credits').update({
                    'credits': new_credits,
                    'last_updated': datetime.utcnow().isoformat()
                }).eq('user_id', user_id).execute()
                
                if update_result.data:
                    logger.info(f"Credits updated for user {user_id}: {current_credits} -> {new_credits}")
                    return True, None
                else:
                    return False, "Failed to update user credits"
            else:
                # User doesn't exist in credits table, create entry
                insert_result = supabase.table('user_credits').insert({
                    'user_id': user_id,
                    'credits': credits
                }).execute()
                
                if insert_result.data:
                    logger.info(f"Credits created for user {user_id}: {credits}")
                    return True, None
                else:
                    return False, "Failed to create user credits record"
                    
        except Exception as e:
            logger.error(f"Error adding credits to user {user_id}: {e}")
            return False, str(e)
    
    def get_user_transactions(self, user_id: str) -> Tuple[bool, Optional[list], Optional[str]]:
        """
        Get transaction history for a user
        
        Returns:
            Tuple[bool, Optional[list], Optional[str]]: (success, transactions, error_message)
        """
        try:
            supabase_service = get_supabase_service()
            supabase = supabase_service.client
            result = supabase.table('credit_transactions').select('*').eq('user_id', user_id).eq('transaction_type', 'purchase').order('created_at', desc=True).execute()
            
            if result.data:
                return True, result.data, None
            else:
                return True, [], None
                
        except Exception as e:
            logger.error(f"Error getting user transactions: {e}")
            return False, None, str(e)

# Global instance
stripe_service = StripeService() 