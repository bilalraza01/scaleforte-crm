module Api
  module V1
    class AuditLogsController < ApplicationController
      def index
        authorize AuditLog
        logs = policy_scope(AuditLog).recent.limit(200).includes(:user)
        render json: logs.map { |l|
          {
            id: l.id,
            action: l.action,
            user_id: l.user_id,
            user_name: l.user&.display_name,
            resource_type: l.resource_type,
            resource_id:   l.resource_id,
            ip_address: l.ip_address,
            metadata: l.metadata,
            created_at: l.created_at
          }
        }
      end
    end
  end
end
