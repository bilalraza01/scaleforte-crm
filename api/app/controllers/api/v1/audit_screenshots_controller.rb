module Api
  module V1
    class AuditScreenshotsController < ApplicationController
      MAX_BYTES = 5 * 1024 * 1024
      ACCEPTED_TYPES = %w[image/jpeg image/png image/webp].freeze

      before_action :set_brand

      # POST /api/v1/brands/:brand_id/audit_screenshots
      # Multipart form field 'file' — small enough (5 MB cap) that round-tripping
      # through Rails is fine in dev. Production uses Active Storage direct
      # uploads to S3 (configured in storage.yml + initializer).
      def create
        authorize @brand, :update?, policy_class: BrandPolicy

        file = params.require(:file)
        if file.size > MAX_BYTES
          return render json: { error: "File exceeds 5 MB" }, status: :unprocessable_entity
        end
        unless ACCEPTED_TYPES.include?(file.content_type)
          return render json: { error: "Only JPG, PNG, WebP allowed" }, status: :unprocessable_entity
        end

        attachment = @brand.audit_screenshots.attach(file).last
        AuditLog.record!(
          user: current_user, action: :audit_screenshot_attached,
          resource: @brand, request: request,
          metadata: { filename: attachment.blob.filename.to_s, byte_size: attachment.blob.byte_size }
        )
        render json: AuditScreenshotResource.new(attachment).serialize, status: :created
      end

      # DELETE /api/v1/brands/:brand_id/audit_screenshots/:id
      def destroy
        authorize @brand, :update?, policy_class: BrandPolicy
        attachment = @brand.audit_screenshots.attachments.find(params[:id])
        attachment.purge
        head :no_content
      end

      private

      def set_brand
        @brand = Brand.find(params[:brand_id])
      end
    end
  end
end
