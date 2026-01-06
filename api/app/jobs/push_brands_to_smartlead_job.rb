class PushBrandsToSmartleadJob < ApplicationJob
  queue_as :default

  # Smartlead's documented rate limit: 10 req / 2 sec (PRD §9.2).
  # Conservatively serialize to ~5 req/sec.
  THROTTLE_DELAY = 0.21

  def perform(push_receipt_id)
    receipt = PushReceipt.find(push_receipt_id)
    receipt.update!(status: :running, started_at: Time.current)
    client = Smartlead::Client.new

    brand_ids = receipt.details.fetch("brand_ids", [])

    brand_ids.each do |brand_id|
      brand = Brand.find_by(id: brand_id)
      unless brand
        receipt.add_failure!(brand_id, error: "brand not found")
        next
      end

      begin
        payload = Smartlead::PayloadBuilder.new(brand).to_lead
        response = client.add_leads(receipt.smartlead_campaign_id, [payload])
        smartlead_lead_id = extract_lead_id(response, payload[:email])

        Brand.transaction do
          if smartlead_lead_id
            brand.primary_contact.update!(smartlead_lead_id: smartlead_lead_id)
          end
          brand.update!(smartlead_pushed_campaign_id: receipt.smartlead_campaign_id)
          brand.push! if brand.may_push?
        end

        receipt.add_success!(brand.id, smartlead_lead_id: smartlead_lead_id)
      rescue Smartlead::Client::RateLimit
        sleep 2
        retry
      rescue StandardError => e
        receipt.add_failure!(brand.id, error: "#{e.class}: #{e.message}")
      end

      sleep THROTTLE_DELAY
    end

    receipt.update!(status: :succeeded, finished_at: Time.current)
  rescue StandardError => e
    receipt.update!(status: :failed, finished_at: Time.current,
                    details: receipt.details.merge("fatal_error" => e.message))
    raise
  end

  private

  # Smartlead returns a list of created leads (shape varies by version).
  # Best-effort extraction — fall back to nil and let reconciliation reconnect.
  def extract_lead_id(response, email)
    return nil unless response.is_a?(Hash) || response.is_a?(Array)
    list = response.is_a?(Array) ? response : (response["lead_list"] || response["leads"] || [])
    match = list.find { |l| l["email"]&.casecmp?(email) }
    match&.dig("lead_id") || match&.dig("id")
  end
end
