module Api
  module V1
    class MeController < ApplicationController
      def show
        authorize current_user, :show?
        render json: UserResource.new(current_user).serialize
      end

      # GET /api/v1/me/today
      # SDR-focused daily progress: how many brands did the current user
      # mark Ready today, and what's the org-wide target. Open to all
      # authenticated users (managers/admins get a 0 count + the target
      # they set, which is fine — the FE only renders the banner for SDRs).
      def today
        authorize current_user, :show?
        target = SystemConfig.current.daily_brand_target
        marked = Brand.where(sdr_id: current_user.id, marked_ready_at: Time.current.all_day).count
        render json: {
          marked_ready_today: marked,
          daily_brand_target: target,
          remaining:          [target - marked, 0].max,
        }
      end
    end
  end
end
