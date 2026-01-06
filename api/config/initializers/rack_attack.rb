# PRD NFR 7.4 — defense-in-depth rate limits.

return if Rails.env.test?

Rails.application.config.middleware.use Rack::Attack

class Rack::Attack
  # Use the default Redis cache that Sidekiq is already pointed at.
  Rack::Attack.cache.store = Rails.cache

  ### Sign-in by IP (slows down credential-stuffing).
  throttle("auth/sign_in/ip", limit: 20, period: 1.minute) do |req|
    req.ip if req.path == "/api/v1/auth/sign_in" && req.post?
  end

  ### Sign-in by email (slows down targeted brute force).
  throttle("auth/sign_in/email", limit: 5, period: 20.seconds) do |req|
    if req.path == "/api/v1/auth/sign_in" && req.post?
      begin
        body = JSON.parse(req.body.read.to_s) rescue {}
        req.body.rewind
        body.dig("user", "email").to_s.downcase.presence
      rescue StandardError
        nil
      end
    end
  end

  ### Webhook receiver — Smartlead's expected event volume should be well
  ### under this. Anything spammier is almost certainly an attack.
  throttle("webhooks/smartlead", limit: 600, period: 1.minute) do |req|
    req.ip if req.path == "/webhooks/smartlead" && req.post?
  end

  self.throttled_responder = lambda do |req|
    [429, { "Content-Type" => "application/json" }, [{ error: "Too many requests" }.to_json]]
  end
end
