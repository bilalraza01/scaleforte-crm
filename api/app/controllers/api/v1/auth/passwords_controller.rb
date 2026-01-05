module Api
  module V1
    module Auth
      class PasswordsController < Devise::PasswordsController
        include ActionController::Cookies

        respond_to :json
        skip_before_action :verify_authenticity_token, raise: false

        # POST /api/v1/auth/password — request reset email.
        def create
          self.resource = resource_class.send_reset_password_instructions(resource_params)
          if successfully_sent?(resource)
            head :accepted
          else
            render json: { errors: resource.errors }, status: :unprocessable_entity
          end
        end

        # PUT /api/v1/auth/password — submit new password with token.
        def update
          self.resource = resource_class.reset_password_by_token(resource_params)
          if resource.errors.empty?
            head :no_content
          else
            render json: { errors: resource.errors }, status: :unprocessable_entity
          end
        end

        private

        def resource_params
          params.require(:user).permit(:email, :password, :password_confirmation, :reset_password_token)
        end
      end
    end
  end
end
