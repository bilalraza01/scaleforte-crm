module Api
  module V1
    class UsersController < ApplicationController
      before_action :set_user, only: [:show, :update, :deactivate, :reset_password]

      def index
        authorize User
        users = policy_scope(User).order(:name).includes(:manager)
        render json: UserResource.new(users).serialize
      end

      def show
        authorize @user
        render json: UserResource.new(@user).serialize
      end

      # POST /api/v1/users
      # Admin/Manager creates a user with an initial password. Replaces the
      # email-invite-link flow — the new user can sign in immediately with
      # whatever password the admin typed.
      def create
        authorize User
        attrs = create_params

        # Managers can only create SDRs assigned to their own team —
        # force these regardless of what the FE sent.
        if current_user.manager_role?
          attrs[:role]       = "sdr"
          attrs[:manager_id] = current_user.id
        end
        attrs[:role] ||= "sdr"

        target_workspaces = Array(attrs.delete(:workspace_access)).presence ||
                            WorkspaceDefaults.for(attrs[:role])

        user = User.new(attrs)
        user.workspace_access = target_workspaces
        user.password_confirmation = attrs[:password] if attrs[:password]

        if user.save
          AuditLog.record!(user: current_user, action: :user_created, resource: user, request: request,
                           metadata: { role: user.role, workspace_access: user.workspace_access })
          render json: UserResource.new(user).serialize, status: :created
        else
          render json: { errors: user.errors }, status: :unprocessable_entity
        end
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

      # POST /api/v1/users/:id/reset_password
      # Admin / managing-manager force-sets a new password for someone else
      # (or the user themselves — UserPolicy#reset_password? permits it).
      def reset_password
        authorize @user, :reset_password?
        new_password = params.require(:password)
        if @user.update(password: new_password, password_confirmation: new_password)
          AuditLog.record!(user: current_user, action: :user_password_reset, resource: @user, request: request)
          head :no_content
        else
          render json: { errors: @user.errors }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/users/change_password
      # Self-service: current user provides their current password + a new
      # one. We verify the current password via Devise#valid_password? so a
      # stolen JWT alone can't change the password.
      def change_password
        authorize current_user, :update?
        unless current_user.valid_password?(params[:current_password].to_s)
          return render json: { errors: { current_password: ["is incorrect"] } }, status: :unprocessable_entity
        end

        new_password = params.require(:new_password)
        if current_user.update(password: new_password, password_confirmation: new_password)
          AuditLog.record!(user: current_user, action: :user_password_changed, resource: current_user, request: request)
          head :no_content
        else
          render json: { errors: current_user.errors }, status: :unprocessable_entity
        end
      end

      private

      def set_user
        @user = User.find(params[:id])
      end

      def create_params
        # Manager can only set name + email + password — role/manager_id
        # are forced to {sdr, self} in #create. Admin sets everything.
        permitted = [:name, :email, :password, { workspace_access: [] }]
        permitted += [:role, :manager_id] if current_user.admin_role?
        params.require(:user).permit(permitted)
      end

      def user_params
        permitted = [:name, :active]
        permitted += [:role, :manager_id, { workspace_access: [] }] if current_user.admin_role?
        params.require(:user).permit(permitted)
      end
    end
  end
end
