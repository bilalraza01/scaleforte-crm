module Api
  module V1
    module Auth
      class SessionsController < Devise::SessionsController
        include ActionController::Cookies
        include JwtCookie

        respond_to :json
        skip_before_action :verify_authenticity_token, raise: false
        # Don't short-circuit destroy when Warden didn't auto-authenticate.
        # We decode the cookie's JWT manually before denylisting it.
        skip_before_action :verify_signed_out_user, only: :destroy

        # POST /api/v1/auth/sign_in
        def create
          self.resource = warden.authenticate!(auth_options)
          sign_in(resource_name, resource)
          set_jwt_cookie!(resource)
          render json: UserResource.new(resource).serialize, status: :ok
        end

        # DELETE /api/v1/auth/sign_out
        def destroy
          revoke_current_jwt!
          sign_out(resource_name) if user_signed_in?
          cookies.delete(JwtCookie::COOKIE_NAME, path: "/", same_site: :lax)
          render json: { ok: true }, status: :ok
        end

        private

        def respond_to_on_destroy
          head :no_content
        end

        def set_jwt_cookie!(user)
          token, _payload = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
          cookies.encrypted[JwtCookie::COOKIE_NAME] = {
            value:     token,
            httponly:  true,
            secure:    Rails.env.production?,
            same_site: Rails.env.production? ? :strict : :lax,
            expires:   JwtCookie::COOKIE_TTL.from_now,
            path:      "/"
          }
        end

        def revoke_current_jwt!
          token = cookies.encrypted[JwtCookie::COOKIE_NAME]
          return if token.blank?

          payload = Warden::JWTAuth::TokenDecoder.new.call(token)
          JwtDenylist.find_or_create_by!(jti: payload["jti"]) do |row|
            row.exp = Time.at(payload["exp"])
          end
        rescue JWT::DecodeError, ActiveRecord::RecordInvalid => e
          Rails.logger.warn("JWT revoke failed: #{e.class}: #{e.message}")
        end
      end
    end
  end
end
