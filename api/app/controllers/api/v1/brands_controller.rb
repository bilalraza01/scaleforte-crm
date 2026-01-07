module Api
  module V1
    class BrandsController < ApplicationController
      before_action :set_brand, only: [:show, :update, :mark_ready, :approve, :send_back, :skip, :reassign]

      def index
        authorize Brand
        scope       = filtered_brands.includes(:contacts, :sdr, :subcategory).order(created_at: :desc, id: :desc)
        page        = [params[:page].to_i, 1].max
        per_page    = params[:per_page].to_i.clamp(1, 200)
        per_page    = 50 if per_page.zero?
        total_count = scope.count
        brands      = scope.offset((page - 1) * per_page).limit(per_page)

        render json: {
          data: BrandResource.new(brands).to_h,
          pagination: {
            page:        page,
            per_page:    per_page,
            total_count: total_count,
            total_pages: (total_count.to_f / per_page).ceil
          }
        }
      end

      # GET /api/v1/brands/lookup?amazon_seller_id=XYZ
      # Used by the New Brand modal to inline-warn that a seller_id is
      # already taken. Response is intentionally minimal — we only return
      # the brand id when the current user can edit it, so we don't leak
      # ownership of brands they're not authorised to see.
      def lookup
        authorize Brand, :lookup?
        sid = params[:amazon_seller_id].to_s.strip
        return render(json: { exists: false }) if sid.blank?

        brand = Brand.find_by(amazon_seller_id: sid)
        return render(json: { exists: false }) unless brand

        editable = BrandPolicy.new(current_user, brand).update?
        render json: {
          exists:          true,
          editable_by_me:  editable,
          brand_id:        editable ? brand.id : nil,
        }
      end

      # Admin-only CSV dump of contacts. Re-applies the same filter set as
      # #index (status, campaign_id, search, created_from, created_to) so
      # the CSV matches the user's current filter, but is NOT paginated —
      # admin gets every contact across the whole filtered result.
      def export
        authorize Brand, :export?
        csv = Exports::ContactsCsv.new(filtered_brands)
        AuditLog.record!(user: current_user, action: :brands_exported, resource: nil, request: request,
                         metadata: filter_params.to_unsafe_h)
        send_data csv.to_csv, type: "text/csv", filename: csv.filename
      end

      def show
        authorize @brand
        render json: BrandResource.new(@brand).serialize
      end

      def create
        authorize Brand
        attrs = brand_params.to_h
        # `category_id` is a transient input — Brand belongs to a Campaign,
        # not directly to a Category. We use it to resolve the current
        # month's active campaign for SDRs who shouldn't have to think
        # about the campaign concept.
        category_id = attrs.delete(:category_id)
        if attrs[:campaign_id].blank? && category_id.present?
          today = Date.current
          campaign = Campaign.where(
            category_id: category_id, year: today.year, month: today.month, status: :active
          ).first
          if campaign.nil?
            return render json: {
              error: "No active campaign for this category in #{today.strftime('%B %Y')}. Ask an admin to set one up."
            }, status: :unprocessable_entity
          end
          attrs[:campaign_id] = campaign.id
        end

        # SDRs are scoped to their assigned categories. Resolve the target
        # category (either passed directly or via the campaign) and reject
        # if the SDR isn't assigned. Admin/Manager bypass.
        if current_user.sdr_role?
          target_category_id = category_id
          target_category_id ||= Campaign.find_by(id: attrs[:campaign_id])&.category_id
          unless target_category_id.present? &&
                 current_user.assigned_categories.exists?(id: target_category_id)
            return render json: {
              error: "You're not assigned to this category. Ask an admin to grant access first."
            }, status: :forbidden
          end
        end

        brand = Brand.new(attrs)
        # SDRs always own the brands they create. Admin/Manager can pass an
        # explicit sdr_id (also permitted in brand_params) to assign on behalf.
        brand.sdr_id ||= current_user.id if current_user.sdr_role?
        if brand.save
          AuditLog.record!(user: current_user, action: :brand_created, resource: brand, request: request,
                           metadata: { sdr_id: brand.sdr_id, resolved_via_category: category_id.present? })
          render json: BrandResource.new(brand).serialize, status: :created
        else
          render json: { errors: brand.errors }, status: :unprocessable_entity
        end
      end

      def update
        authorize @brand
        if @brand.update(brand_params)
          render json: BrandResource.new(@brand).serialize
        else
          render json: { errors: @brand.errors }, status: :unprocessable_entity
        end
      end

      def mark_ready
        authorize @brand, :mark_ready?
        if @brand.may_mark_ready? && @brand.mark_ready!
          AuditLog.record!(user: current_user, action: :brand_marked_ready, resource: @brand, request: request)
          render json: BrandResource.new(@brand).serialize
        else
          render json: { error: "Brand is not ready to submit", missing_fields: @brand.missing_ready_fields }, status: :unprocessable_entity
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

      # POST /api/v1/brands/bulk_reassign
      # Body: { sdr_id: <target>, brand_ids: [<id>, ...] }
      # Used to bulk-move an SDR's brands when they leave / shift coverage.
      # Per-brand authorisation runs inside the loop so a manager acting over
      # a mixed selection reassigns the ones they manage and skips the rest
      # (returned in `skipped_unauthorized`) instead of failing the whole call.
      def bulk_reassign
        authorize Brand, :bulk_reassign?

        target_sdr_id = params.require(:sdr_id).to_i
        target_sdr    = User.find(target_sdr_id)
        unless target_sdr.sdr_role? && target_sdr.active?
          return render json: { error: "Target user must be an active SDR" }, status: :unprocessable_entity
        end

        ids = Array(params[:brand_ids]).map(&:to_i).reject(&:zero?).uniq
        return render(json: { error: "brand_ids required" }, status: :unprocessable_entity) if ids.empty?

        candidates = policy_scope(Brand).where(id: ids).to_a
        reassigned, skipped = [], []

        Brand.transaction do
          candidates.each do |brand|
            if BrandPolicy.new(current_user, brand).reassign?
              brand.update!(sdr_id: target_sdr_id)
              reassigned << brand.id
            else
              skipped << brand.id
            end
          end
        end

        AuditLog.record!(
          user: current_user, action: :brands_bulk_reassigned, resource: nil, request: request,
          metadata: { to_sdr_id: target_sdr_id, reassigned_ids: reassigned, skipped_ids: skipped }
        )

        render json: {
          reassigned_count:        reassigned.size,
          skipped_unauthorized:    skipped.size,
          target_sdr_id:           target_sdr_id,
          target_sdr_name:         target_sdr.display_name
        }
      end

      private

      def set_brand
        @brand = Brand.find(params[:id])
      end

      # Shared by #index and #export — filter params identical so the CSV
      # always matches the rows the user is currently viewing.
      def filtered_brands
        scope = policy_scope(Brand)
        scope = scope.where(campaign_id: filter_params[:campaign_id]) if filter_params[:campaign_id].present?
        if filter_params[:category_id].present?
          scope = scope.joins(:campaign).where(campaigns: { category_id: filter_params[:category_id] })
        end
        if filter_params[:subcategory_id].present?
          scope = scope.where(subcategory_id: filter_params[:subcategory_id])
        end
        if filter_params[:sdr_id].present?
          scope = scope.where(sdr_id: filter_params[:sdr_id])
        end
        if filter_params[:status].present? && filter_params[:status] != "all"
          scope = scope.where(status: filter_params[:status])
        end
        if filter_params[:search].present?
          q = "%#{ActiveRecord::Base.sanitize_sql_like(filter_params[:search])}%"
          scope = scope.left_joins(:sdr).where(
            "brands.brand_name ILIKE :q OR brands.amazon_seller_id ILIKE :q OR users.name ILIKE :q",
            q: q
          ).distinct
        end
        if filter_params[:created_from].present?
          scope = scope.where("brands.created_at >= ?", parse_date(filter_params[:created_from]).beginning_of_day)
        end
        if filter_params[:created_to].present?
          scope = scope.where("brands.created_at <= ?", parse_date(filter_params[:created_to]).end_of_day)
        end
        scope
      end

      def filter_params
        params.permit(:campaign_id, :category_id, :subcategory_id, :sdr_id, :status, :search, :created_from, :created_to)
      end

      def parse_date(value)
        Date.parse(value.to_s)
      rescue ArgumentError, TypeError
        # Bad input — drop silently rather than 400ing the worklist.
        Date.new(1970, 1, 1)
      end

      def brand_params
        permitted = [:campaign_id, :category_id, :subcategory_id, :amazon_seller_id,
                     :brand_name, :business_name,
                     :revenue, :country, :website, :asin, :amazon_link,
                     :facebook_url, :instagram_url, :company_linkedin_url]
        # Only Admin/Manager can hand a brand to a different SDR; SDR creations
        # are always self-owned (forced server-side in #create).
        permitted << :sdr_id if current_user.admin_role? || current_user.manager_role?
        params.require(:brand).permit(permitted)
      end
    end
  end
end
