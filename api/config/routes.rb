Rails.application.routes.draw do
  # Liveness probe — UptimeRobot, Kamal Proxy.
  get "up" => "rails/health#show", as: :rails_health_check
  # Stub root route so devise_invitable's mailer view can resolve root_url
  # (the API has no canonical front page; the React app lives elsewhere).
  root to: "rails/health#show"

  # Devise mounted at the top level so the warden scope stays :user
  # (nesting devise_for inside namespace :api / :v1 prefixes the mapping
  # key to :api_v1_user and breaks devise's failure-app delegator).
  devise_for :users,
             path: "api/v1/auth",
             path_names: {
               sign_in:  "sign_in",
               sign_out: "sign_out"
             },
             controllers: {
               sessions:    "api/v1/auth/sessions",
               passwords:   "api/v1/auth/passwords",
               invitations: "api/v1/auth/invitations"
             },
             skip: [:registrations]

  namespace :api do
    namespace :v1 do
      get "me",       to: "me#show"
      get "me/today", to: "me#today"

      resource :system_config, only: [:show, :update]

      resources :users, only: [:index, :show, :update] do
        member { patch :deactivate }
        resources :category_assignments, only: [:index, :create, :destroy]
      end

      resources :categories, only: [:index, :show, :create, :update] do
        member { patch :archive }
        resources :subcategories, only: [:index, :create]
      end

      resources :campaigns, only: [:index, :show, :create, :update] do
        member { post :assign }
      end

      resources :brands, only: [:index, :show, :create, :update] do
        collection do
          get :export
          get :lookup
          post :bulk_reassign
        end
        member do
          post :mark_ready
          post :approve
          post :send_back
          post :skip
          post :reassign
        end

        resources :contacts,           only: [:create, :update, :destroy]
        resources :pain_points,        only: [:create, :update, :destroy]
        resources :audit_screenshots,  only: [:create, :destroy]
      end

      get "contacts/dedupe", to: "contacts#dedupe"

      # --- Phase 2: Smartlead integration ---
      resource :smartlead_config, only: [:show, :update] do
        post :test, on: :collection
      end

      resources :pushes, only: [:index, :show, :create]

      # Engagement events (Phase 2 Week 5/6).
      resources :replies, only: [:index] do
        member { patch :classify }
      end

      get "integration_health/smartlead", to: "integration_health#smartlead"

      # Phase 3 Week 7 dashboards (per-role).
      get "dashboards/sdr",     to: "dashboards#sdr"
      get "dashboards/manager", to: "dashboards#manager"
      get "dashboards/admin",   to: "dashboards#admin"

      # Phase 3 Week 8 audit log (Admin only).
      resources :audit_logs, only: [:index]
    end
  end

  # Public webhook receiver — no /api/v1 prefix per PRD §9.4.
  post "/webhooks/smartlead", to: "webhooks#smartlead"
end
