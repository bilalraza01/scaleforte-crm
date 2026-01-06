module Api
  module V1
    class IntegrationHealthController < ApplicationController
      def smartlead
        authorize :integration_health, :show?
        last_24h = EngagementEvent.where("received_at >= ?", 24.hours.ago)

        render json: {
          events_received_24h:    last_24h.count,
          events_processed_24h:   last_24h.where.not(processed_at: nil).count,
          events_unmatched_total: EngagementEvent.unmatched_events.count,
          last_event_at:          EngagementEvent.maximum(:received_at),
          last_processed_at:      EngagementEvent.maximum(:processed_at),
          smartlead_config: {
            configured: SmartleadConfig.current.configured?,
            webhook_secret_set: SmartleadConfig.current.webhook_secret.present?,
            last_test_at: SmartleadConfig.current.last_test_at,
            last_test_success: SmartleadConfig.current.last_test_success
          }
        }
      end
    end
  end
end
