module Api
  module V1
    class UsersController < ApplicationController
      before_action :set_user, only: [:show, :update, :deactivate]

      def index
        authorize User
        users = policy_scope(User).order(:name).includes(:manager)
        render json: UserResource.new(users).serialize
      end

      def show
        authorize @user
        render json: UserResource.new(@user).serialize
      end

      def update
        authorize @user
        role_was = @user.role
        if @user.update(user_params)
          AuditLog.record!(
            user: current_user, action: :user_updated, resource: @user, request: request,
            metadata: { changes: @user.previous_changes.except("updated_at"), role_was: (@user.role == role_was ? nil : role_was) }.compact
          )
          render json: UserResource.new(@user).serialize
        else
          render json: { errors: @user.errors }, status: :unprocessable_entity
        end
      end

      def deactivate
        authorize @user, :deactivate?
        @user.update!(active: false)
        AuditLog.record!(user: current_user, action: :user_deactivated, resource: @user, request: request)
        render json: UserResource.new(@user).serialize
      end

      private

      def set_user
        @user = User.find(params[:id])
      end

      def user_params
        permitted = [:name, :active]
        permitted += [:role, :manager_id] if current_user.admin_role?
        params.require(:user).permit(permitted)
      end
    end
  end
end
