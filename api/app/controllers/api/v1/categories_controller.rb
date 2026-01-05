module Api
  module V1
    class CategoriesController < ApplicationController
      before_action :set_category, only: [:show, :update, :archive]

      def index
        authorize Category
        cats = policy_scope(Category).order(:name)
        render json: CategoryResource.new(cats).serialize
      end

      def show
        authorize @category
        render json: CategoryResource.new(@category).serialize
      end

      def create
        authorize Category
        category = Category.new(category_params)
        if category.save
          AuditLog.record!(user: current_user, action: :category_created, resource: category, request: request)
          render json: CategoryResource.new(category).serialize, status: :created
        else
          render json: { errors: category.errors }, status: :unprocessable_entity
        end
      end

      def update
        authorize @category
        if @category.update(category_params)
          render json: CategoryResource.new(@category).serialize
        else
          render json: { errors: @category.errors }, status: :unprocessable_entity
        end
      end

      def archive
        authorize @category, :archive?
        @category.archive!
        AuditLog.record!(user: current_user, action: :category_archived, resource: @category, request: request)
        render json: CategoryResource.new(@category).serialize
      end

      private

      def set_category
        @category = Category.find(params[:id])
      end

      def category_params
        params.require(:category).permit(:name, :amazon_url_pattern, :active, :default_smartlead_campaign_id)
      end
    end
  end
end
