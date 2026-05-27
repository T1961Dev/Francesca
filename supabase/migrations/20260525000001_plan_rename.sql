-- Part 2: Rename plans.
-- Old "premium" (the investor-matching tier) becomes new "pro".
-- Old "pro" (the deck+financial-model tier) becomes new "starter".
-- This must run before Stripe is wired to new env-var price IDs.

update public.profiles
set plan = case plan
  when 'premium' then 'pro'
  when 'pro' then 'starter'
  else plan
end
where plan in ('pro', 'premium');
