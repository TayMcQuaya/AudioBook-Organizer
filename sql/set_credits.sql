-- Add credits to existing user (use this for adding credits to current balance)
UPDATE user_credits 
SET credits = credits + 100, last_updated = NOW() 
WHERE user_id = 'your_user_id';

-- Alternative: Set credits to specific value (overwrites current balance)
-- INSERT INTO user_credits (user_id, credits, last_updated) 
-- VALUES ('your_user_id', 100, NOW())
-- ON CONFLICT (user_id) 
-- DO UPDATE SET credits = EXCLUDED.credits, last_updated = NOW();

-- Alternative: Create new user with initial credits (only for new users)
-- INSERT INTO user_credits (user_id, credits, last_updated) 
-- VALUES ('your_user_id', 100, NOW());