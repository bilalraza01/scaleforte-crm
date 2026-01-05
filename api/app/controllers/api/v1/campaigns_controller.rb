module Api
  module V1
    class CampaignsController < ApplicationController
      before_action :set_campaign, only: [:show, :update, :assign]

      def index
        authorize Campaign
        campaigns = policy_scope(Campaign).recent.includes(:category)
        render json: CampaignResource.new(campaigns).serialize
      end

      def show
        authorize @campaign
        render json: CampaignResource.new(@campaign).serialize
      end

      def create
        authorize Campaign
        campaign = Campaign.new(campaign_params)
        if campaign.save
          AuditLog.record!(user: current_user, action: :campaign_created, resource: campaign, request: request)
          render json: CampaignResource.new(campaign).serialize, status: :created
        else
          render json: { errors: campaign.errors }, status: :unprocessable_entity
        end
      end

      def update
        authorize @campaign
        if @campaign.update(campaign_params)
          render json: CampaignResource.new(@campaign).serialize
        else
          render json: { errors: @campaign.errors }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/campaigns/:id/assign — Admin attaches an SDR to this campaign with a target.
      def assign
        authorize @campaign, :assign?
        ca = @campaign.campaign_assignments.find_or_initialize_by(sdr_id: params.require(:sdr_id))
        ca.target_count = params.fetch(:target_count, 0)
        if ca.save
          AuditLog.record!(user: current_user, action: :campaign_assignment_created, resource: ca, request: request)
          render json: { ok: true, assignment: { sdr_id: ca.sdr_id, target_count: ca.target_count } }
        else
          render json: { errors: ca.errors }, status: :unprocessable_entity
        end
      end

      private

      def set_campaign
        @campaign = Campaign.find(params[:id])
      end

      def campaign_params
        params.require(:campaign).permit(:category_id, :month, :year, :status, :smartlead_campaign_id)
      end
    end
  end
end
