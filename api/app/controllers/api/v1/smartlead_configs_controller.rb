module Api
  module V1
    class SmartleadConfigsController < ApplicationController
      before_action :set_config

      def show
        authorize @config, :show?, policy_class: SmartleadConfigPolicy
        render json: serialize_config
      end

      def update
        authorize @config, :update?, policy_class: SmartleadConfigPolicy
        if @config.update(config_params)
          AuditLog.record!(user: current_user, action: :smartlead_config_updated, resource: @config, request: request)
          render json: serialize_config
        else
          render json: { errors: @config.errors }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/smartlead_config/test
      def test
        authorize @config, :test?, policy_class: SmartleadConfigPolicy
        client = Smartlead::Client.new(api_key: @config.api_key)
        client.list_campaigns
        @config.update!(last_test_at: Time.current, last_test_success: true)
        render json: serialize_config.merge(message: "Connection OK")
      rescue Smartlead::Client::AuthFailed
        @config.update!(last_test_at: Time.current, last_test_success: false)
        render json: { error: "Smartlead rejected the API key" }, status: :unprocessable_entity
      rescue Smartlead::Client::Error => e
        @config.update!(last_test_at: Time.current, last_test_success: false)
        render json: { error: e.message }, status: :bad_gateway
      end

      private

      def set_config
        @config = SmartleadConfig.current
      end

      def config_params
        params.require(:smartlead_config).permit(:api_key, :webhook_secret)
      end

      def serialize_config
        {
          id: @config.id,
          masked_api_key: @config.masked_api_key,
          configured: @config.configured?,
          webhook_secret_set: @config.webhook_secret.present?,
          last_test_at: @config.last_test_at,
          last_test_success: @config.last_test_success
        }
      end
    end
  end
end
