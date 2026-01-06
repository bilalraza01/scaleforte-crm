module Api
  module V1
    class RepliesController < ApplicationController
      before_action :set_reply, only: [:classify]

      def index
        authorize EngagementEvent
        replies = policy_scope(EngagementEvent).replies.includes(contact: { brand: [:sdr, { campaign: :category }] }).order(occurred_at: :desc).limit(200)
        replies = replies.where(contact_id: filtered_contact_ids) if filters_present?
        render json: EngagementEventResource.new(replies).serialize
      end

      # PATCH /api/v1/replies/:id/classify
      def classify
        authorize @reply, :classify?, policy_class: EngagementEventPolicy
        ces = ContactEngagementSummary.find_or_initialize_by(contact_id: @reply.contact_id)
        ces.reply_classification = params.require(:classification)
        if ces.save
          AuditLog.record!(user: current_user, action: :reply_classified, resource: @reply, request: request,
                           metadata: { classification: ces.reply_classification })
          render json: { ok: true, classification: ces.reply_classification }
        else
          render json: { errors: ces.errors }, status: :unprocessable_entity
        end
      end

      private

      def set_reply
        @reply = EngagementEvent.replies.find(params[:id])
      end

      def filters_present?
        params[:sdr_id].present? || params[:category_id].present?
      end

      def filtered_contact_ids
        scope = Contact.joins(brand: { campaign: :category })
        scope = scope.where(brands: { sdr_id: params[:sdr_id] }) if params[:sdr_id].present?
        scope = scope.where(categories: { id: params[:category_id] }) if params[:category_id].present?
        scope.select(:id)
      end
    end
  end
end
