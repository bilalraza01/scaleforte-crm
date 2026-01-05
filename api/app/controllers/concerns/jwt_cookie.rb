# Moves JWTs between the HttpOnly cookie (where browsers store them) and the
# Authorization header (where devise-jwt expects them). This is the single
# integration point between devise-jwt and the SPA.

module JwtCookie
  extend ActiveSupport::Concern

  COOKIE_NAME = :scaleforte_jwt
  COOKIE_TTL  = 7.days

  included do
    # prepend_ so the JWT lifts from cookie -> header BEFORE Devise's
    # parent-class authenticate_inviter! / authenticate_user! callbacks run.
    prepend_before_action :hoist_jwt_cookie_to_authorization_header
  end

  private

  # Pre-action: pull JWT out of the HttpOnly cookie into the Authorization
  # header so devise-jwt's authentication strategy can validate it.
  def hoist_jwt_cookie_to_authorization_header
    return if request.headers["Authorization"].present?
    token = cookies.encrypted[COOKIE_NAME]
    request.headers["Authorization"] = "Bearer #{token}" if token.present?
  end

  # Post-sign-in helper: copy the JWT from the response Authorization header
  # into an HttpOnly cookie, then clear the header so the token is never
  # readable by JavaScript.
  def stash_jwt_in_cookie!
    auth = response.headers["Authorization"]
    return if auth.blank?

    token = auth.sub(/^Bearer\s+/, "")
    cookies.encrypted[COOKIE_NAME] = {
      value:     token,
      httponly:  true,
      secure:    Rails.env.production?,
      same_site: Rails.env.production? ? :strict : :lax,
      expires:   COOKIE_TTL.from_now,
      path:      "/"
    }
    response.headers.delete("Authorization")
  end

  def clear_jwt_cookie!
    cookies.delete(COOKIE_NAME, path: "/")
  end
end
