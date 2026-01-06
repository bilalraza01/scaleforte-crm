module Api
  module V1
    class PushesController < ApplicationController
      before_action :set_receipt, only: [:show]

      def index
        authorize PushReceipt
        receipts = policy_scope(PushReceipt).recent.limit(50).includes(:user)
        render json: PushReceiptResource.new(receipts).serialize
      end

      def show
        authorize @receipt
        render json: PushReceiptResource.new(@receipt).serialize
      end

      # POST /api/v1/pushes
      # body: { brand_ids: [..], smartlead_campaign_id: 4521 }
      def create
        authorize PushReceipt
        brand_ids = Array(params[:brand_ids]).map(&:to_i)
        smartlead_campaign_id = params.require(:smartlead_campaign_id).to_i

        if brand_ids.empty?
          return render json: { error: "brand_ids is required" }, status: :unprocessable_entity
        end

        # Only push Approved brands. Filter to authorized + correct state.
        approved = policy_scope(Brand).where(id: brand_ids, status: :approved).pluck(:id)

        receipt = PushReceipt.create!(
          user: current_user,
          smartlead_campaign_id: smartlead_campaign_id,
          total_count: approved.size,
          details: { brand_ids: approved, requested_brand_ids: brand_ids }
        )

        AuditLog.record!(user: current_user, action: :push_enqueued, resource: receipt, request: request,
                         metadata: { count: approved.size, smartlead_campaign_id: smartlead_campaign_id })
        PushBrandsToSmartleadJob.perform_later(receipt.id)

        render json: PushReceiptResource.new(receipt).serialize, status: :accepted
      end

      private

      def set_receipt
        @receipt = PushReceipt.find(params[:id])
      end
    end
  end
end
