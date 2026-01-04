class ApplicationController < ActionController::API
  include ActionController::Cookies
  include Pundit::Authorization
  include JwtCookie

  before_action :authenticate_user!
  after_action  :verify_pundit_used!, unless: :devise_controller?

  rescue_from Pundit::NotAuthorizedError, with: :forbidden!
  rescue_from ActiveRecord::RecordNotFound, with: :not_found!

  private

  # Predicate-based instead of only:/except: so Rails 7.1's
  # raise_on_missing_callback_actions doesn't trip on Devise controllers.
  def verify_pundit_used!
    if action_name == "index"
      verify_policy_scoped
    else
      verify_authorized
    end
  end

  def forbidden!
    render json: { error: "Forbidden" }, status: :forbidden
  end

  def not_found!
    render json: { error: "Not found" }, status: :not_found
  end
end
