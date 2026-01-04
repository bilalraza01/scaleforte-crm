# Rack::Attack rules — concrete throttles land in Phase 3 (PRD NFR 7.4).
# Keeping the middleware wired now so per-endpoint limits plug in later
# without a separate config change.

return if Rails.env.test?

Rails.application.config.middleware.use Rack::Attack

class Rack::Attack
  ### Phase 3: throttle /api/v1/auth/sign_in by IP + email,
  ### throttle /webhooks/smartlead by IP, etc.
end
