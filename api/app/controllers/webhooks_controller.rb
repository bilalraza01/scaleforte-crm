# Public-facing webhook receiver. No JWT auth, no Pundit — Smartlead
# authenticates via HMAC. Designed to respond <200ms (PRD NFR 7.1):
# verify, persist raw, enqueue async processor, ack.

class WebhooksController < ActionController::API
  rescue_from ActionController::ParameterMissing, with: -> { head :bad_request }

  def smartlead
    payload = request.raw_post
    return head :unauthorized unless valid_signature?(payload)

    parsed = JSON.parse(payload)
    smartlead_event_id = parsed["event_id"] || parsed["id"]
    return head :ok if smartlead_event_id.blank?

    # Idempotent: dedupe by smartlead_event_id (FR-7.4).
    event = EngagementEvent.find_by(smartlead_event_id: smartlead_event_id)
    if event
      return head :ok
    end

    event = EngagementEvent.create!(
      smartlead_event_id:    smartlead_event_id,
      smartlead_lead_id:     parsed["lead_id"],
      smartlead_campaign_id: parsed["campaign_id"],
      event_type:            map_event_type(parsed["event_type"]),
      occurred_at:           safe_time(parsed["occurred_at"]),
      received_at:           Time.current,
      reply_subject:         parsed["reply_subject"],
      reply_body:            parsed["reply_body"],
      raw_payload:           parsed,
      unmatched:             true
    )

    ProcessEngagementEventJob.perform_later(event.id)
    head :ok
  rescue JSON::ParserError, ActiveRecord::RecordInvalid
    head :bad_request
  end

  private

  def valid_signature?(body)
    secret = SmartleadConfig.current.webhook_secret.to_s
    return false if secret.blank?

    signature = request.headers["X-Smartlead-Signature"].to_s
    expected  = OpenSSL::HMAC.hexdigest("SHA256", secret, body)
    ActiveSupport::SecurityUtils.secure_compare(signature, expected)
  rescue StandardError
    false
  end

  def map_event_type(t)
    case t
    when "email_sent"          then :sent
    when "email_opened"        then :opened
    when "email_replied"       then :replied
    when "email_bounced"       then :bounced
    when "lead_unsubscribed"   then :unsubscribed
    when "link_clicked"        then :clicked
    else
      raise JSON::ParserError, "unknown event_type: #{t.inspect}"
    end
  end

  def safe_time(value)
    return nil if value.blank?
    Time.iso8601(value.to_s)
  rescue ArgumentError
    nil
  end
end
