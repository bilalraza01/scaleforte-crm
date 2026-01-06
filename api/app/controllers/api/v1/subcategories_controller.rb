module Api
  module V1
    class SubcategoriesController < ApplicationController
      before_action :set_category

      # GET /api/v1/categories/:category_id/subcategories
      def index
        list = policy_scope(@category.subcategories).ordered
        render json: SubcategoryResource.new(list).serialize
      end

      # POST /api/v1/categories/:category_id/subcategories
      def create
        sub = @category.subcategories.build(name: params.require(:subcategory).require(:name).to_s.strip)
        sub.created_by_user = current_user
        authorize sub
        if sub.save
          AuditLog.record!(user: current_user, action: :subcategory_created, resource: sub, request: request,
                           metadata: { category_id: @category.id, name: sub.name })
          render json: SubcategoryResource.new(sub).serialize, status: :created
        else
          render json: { errors: sub.errors }, status: :unprocessable_entity
        end
      end

      private

      def set_category
        @category = Category.find(params[:category_id])
      end
    end
  end
end
