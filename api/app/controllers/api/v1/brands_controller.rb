module Api
  module V1
    class BrandsController < ApplicationController
      before_action :set_brand, only: [:show, :update, :mark_ready, :approve, :send_back, :skip, :reassign]

      def index
        authorize Brand
        brands = policy_scope(Brand)
        brands = brands.where(campaign_id: params[:campaign_id]) if params[:campaign_id].present?
        brands = brands.where(status: params[:status]) if params[:status].present?
        render json: BrandResource.new(brands.includes(:contacts).order(:id)).serialize
      end

      def show
        authorize @brand
        render json: BrandResource.new(@brand).serialize
      end

      def create
        authorize Brand
        brand = Brand.new(brand_params)
        if brand.save
          AuditLog.record!(user: current_user, action: :brand_created, resource: brand, request: request)
          render json: BrandResource.new(brand).serialize, status: :created
        else
          render json: { errors: brand.errors }, status: :unprocessable_entity
        end
      end

      def update
        authorize @brand
        # Auto-transition Draft -> In Progress on first save with content.
        @brand.start! if @brand.draft_status? && brand_params.values.any?(&:present?)

        if @brand.update(brand_params)
          render json: BrandResource.new(@brand).serialize
        else
          render json: { errors: @brand.errors }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/brands/claim_next — atomically claim the next unclaimed brand
      # for the current SDR within a campaign they're assigned to (FR-3.3).
      def claim_next
        authorize Brand, :claim_next?

        result = Brand.transaction do
          campaign_id = params[:campaign_id] || current_user.campaign_assignments.pick(:campaign_id)
          next nil unless campaign_id

          brand = Brand.unclaimed.where(campaign_id: campaign_id).order(:id).lock("FOR UPDATE SKIP LOCKED").first
          if brand
            brand.update!(sdr_id: current_user.id)
            brand
          end
        end

        if result
          AuditLog.record!(user: current_user, action: :brand_claimed, resource: result, request: request)
          render json: BrandResource.new(result).serialize
        else
          render json: { error: "No unclaimed brands available" }, status: :not_found
        end
      end

      def mark_ready
        authorize @brand, :mark_ready?
        if @brand.may_mark_ready? && @brand.mark_ready!
          AuditLog.record!(user: current_user, action: :brand_marked_ready, resource: @brand, request: request)
          render json: BrandResource.new(@brand).serialize
        else
          render json: { error: "Brand is not ready to submit", missing_fields: missing_ready_fields }, status: :unprocessable_entity
        end
      end

      def approve
        authorize @brand, :approve?
        @brand.approve!
        AuditLog.record!(user: current_user, action: :brand_approved, resource: @brand, request: request)
        render json: BrandResource.new(@brand).serialize
      end

      def send_back
        authorize @brand, :send_back?
        @brand.send_back!
        AuditLog.record!(
          user: current_user, action: :brand_sent_back, resource: @brand, request: request,
          metadata: { comment: params[:comment] }
        )
        render json: BrandResource.new(@brand).serialize
      end

      def skip
        authorize @brand, :skip?
        @brand.skip_reason = params.require(:reason)
        if @brand.skip!
          AuditLog.record!(user: current_user, action: :brand_skipped, resource: @brand, request: request, metadata: { reason: params[:reason] })
          render json: BrandResource.new(@brand).serialize
        else
          render json: { errors: @brand.errors }, status: :unprocessable_entity
        end
      end

      def reassign
        authorize @brand, :reassign?
        @brand.update!(sdr_id: params.require(:sdr_id))
        AuditLog.record!(user: current_user, action: :brand_reassigned, resource: @brand, request: request, metadata: { to_sdr_id: @brand.sdr_id })
        render json: BrandResource.new(@brand).serialize
      end

      private

      def set_brand
        @brand = Brand.find(params[:id])
      end

      def brand_params
        params.require(:brand).permit(:campaign_id, :amazon_seller_id, :brand_name, :business_name,
                                      :revenue, :country, :website, :asin, :amazon_link,
                                      :facebook_url, :instagram_url, :company_linkedin_url)
      end

      def missing_ready_fields
        missing = []
        missing << "brand_name" if @brand.brand_name.blank?
        missing << "website"    if @brand.website.blank?
        missing << "contacts"   if @brand.contacts.none? { |c| c.email.present? }
        missing
      end
    end
  end
end
