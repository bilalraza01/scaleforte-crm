module Api
  module V1
    class PainPointsController < ApplicationController
      before_action :set_brand
      before_action :set_pain_point, only: [:update, :destroy]

      def create
        @pain_point = @brand.pain_points.build(pain_point_params)
        authorize_brand_edit
        if @pain_point.save
          render json: PainPointResource.new(@pain_point).serialize, status: :created
        else
          render json: { errors: @pain_point.errors }, status: :unprocessable_entity
        end
      end

      def update
        authorize_brand_edit
        if @pain_point.update(pain_point_params)
          render json: PainPointResource.new(@pain_point).serialize
        else
          render json: { errors: @pain_point.errors }, status: :unprocessable_entity
        end
      end

      def destroy
        authorize_brand_edit
        @pain_point.destroy
        head :no_content
      end

      private

      def set_brand
        @brand = Brand.find(params[:brand_id])
      end

      def set_pain_point
        @pain_point = @brand.pain_points.find(params[:id])
      end

      # Pain points are bound to a Brand — authorization piggybacks BrandPolicy.
      def authorize_brand_edit
        authorize @brand, :update?, policy_class: BrandPolicy
      end

      def pain_point_params
        params.require(:pain_point).permit(:category, :description, :display_order)
      end
    end
  end
end
