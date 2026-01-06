require "faraday"
require "faraday/retry"

module Smartlead
  class Client
    BASE_URL = "https://server.smartlead.ai/api/v1/".freeze

    class Error      < StandardError; end
    class RateLimit  < Error; end
    class AuthFailed < Error; end

    def initialize(api_key: SmartleadConfig.current.api_key, base_url: BASE_URL)
      @api_key  = api_key
      @base_url = base_url
    end

    def list_campaigns
      response = connection.get("campaigns") do |req|
        req.params["api_key"] = @api_key
      end
      raise_for_error!(response)
      response.body
    end

    def add_leads(smartlead_campaign_id, lead_list)
      response = connection.post("campaigns/#{smartlead_campaign_id}/leads") do |req|
        req.params["api_key"] = @api_key
        req.headers["Content-Type"] = "application/json"
        req.body = JSON.generate(lead_list: lead_list)
      end
      raise_for_error!(response)
      response.body
    end

    def campaign_statistics(smartlead_campaign_id)
      response = connection.get("campaigns/#{smartlead_campaign_id}/statistics") do |req|
        req.params["api_key"] = @api_key
      end
      raise_for_error!(response)
      response.body
    end

    def unsubscribe_lead(lead_id)
      response = connection.post("leads/#{lead_id}/unsubscribe") do |req|
        req.params["api_key"] = @api_key
      end
      raise_for_error!(response)
      response.body
    end

    private

    def connection
      @connection ||= Faraday.new(@base_url) do |f|
        f.request :retry, max: 3, interval: 2,
                  retry_statuses: [429, 502, 503, 504],
                  exceptions: [Faraday::ConnectionFailed, Faraday::TimeoutError]
        f.response :json, content_type: /\bjson$/
        f.adapter Faraday.default_adapter
      end
    end

    def raise_for_error!(response)
      return if response.success?

      case response.status
      when 429 then raise RateLimit, "rate limited"
      when 401, 403 then raise AuthFailed, "auth failed"
      else raise Error, "Smartlead error #{response.status}: #{response.body.inspect}"
      end
    end
  end
end
