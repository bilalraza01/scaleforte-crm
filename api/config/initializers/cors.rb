# Allow the React web app to call the API with credentials (HttpOnly JWT cookie).

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins ENV.fetch("WEB_ORIGIN", "http://localhost:5173")

    resource "*",
      headers: :any,
      methods: %i[get post put patch delete options head],
      credentials: true,
      expose: %w[X-CSRF-Token Authorization]
  end
end
