module Api
  module V1
    class SystemConfigsController < ApplicationController
      def show
        config = SystemConfig.current
        authorize config
        render json: serialize(config)
      end

      def update
        config = SystemConfig.current
        authorize config
        if config.update(config_params)
          AuditLog.record!(user: current_user, action: :system_config_updated,
                           resource: config, request: request,
                           metadata: config.previous_changes.except("updated_at"))
          render json: serialize(config)
        else
          render json: { errors: config.errors }, status: :unprocessable_entity
        end
      end

      private

      def config_params
        params.require(:system_config).permit(:daily_brand_target)
      end

      def serialize(config)
        {
          daily_brand_target: config.daily_brand_target,
          updated_at:         config.updated_at,
        }
      end
    end
  end
end
