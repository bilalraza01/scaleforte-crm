module Api
  module V1
    module Auth
      class InvitationsController < Devise::InvitationsController
        include ActionController::Cookies
        include Pundit::Authorization

        respond_to :json
        skip_before_action :verify_authenticity_token, raise: false

        # The :create action requires a signed-in inviter (Admin/Manager).
        # The :update / :show actions are public — the invitee uses an emailed token.
        before_action :authenticate_user!, only: [:create]
        before_action :verify_invite_authorized, only: [:create]

        rescue_from Pundit::NotAuthorizedError do
          render json: { error: "Forbidden" }, status: :forbidden
        end

        # POST /api/v1/auth/invitations
        def create
          inviter = current_inviter
          self.resource = User.invite!(invite_params, inviter)
          if resource.errors.empty?
            AuditLog.record!(
              user: inviter, action: :user_invited, resource: resource, request: request,
              metadata: { role: resource.role, manager_id: resource.manager_id }
            )
            render json: UserResource.new(resource).serialize, status: :created
          else
            render json: { errors: resource.errors }, status: :unprocessable_entity
          end
        end

        # GET /api/v1/auth/invitations/:token
        # Lets the React accept-invitation page show the invitee's email/name
        # before they pick a password.
        def show
          self.resource = User.find_by_invitation_token(params[:token], true)
          if resource && !resource.invitation_accepted?
            render json: UserResource.new(resource).serialize
          else
            render json: { error: "Invitation invalid or expired" }, status: :not_found
          end
        end

        # PUT /api/v1/auth/invitations
        # Invitee submits {invitation_token, password, password_confirmation, name?}.
        def update
          self.resource = User.accept_invitation!(accept_params)
          if resource.errors.empty?
            sign_in(resource)
            render json: UserResource.new(resource).serialize
          else
            render json: { errors: resource.errors }, status: :unprocessable_entity
          end
        end

        private

        def verify_invite_authorized
          # Construct a draft so a Manager can't sneak in an Admin invite.
          draft = User.new(invite_params.slice(:role, :manager_id))
          authorize draft, :create?, policy_class: UserPolicy
        end

        def invite_params
          params.require(:user).permit(:email, :name, :role, :manager_id)
        end

        def accept_params
          params.require(:user).permit(:invitation_token, :password, :password_confirmation, :name)
        end

        def current_inviter
          current_user
        end
      end
    end
  end
end
