-- Just check Stripe events to see what webhooks were received
SELECT 
    stripe_event_id,
    event_type,
    processing_status,
    error_message,
    created_at,
    webhook_data->>'type' as webhook_type
FROM stripe_events 
ORDER BY created_at DESC 
LIMIT 30;