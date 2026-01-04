# Devise sign-in / sign-out fire through Warden, so we hook those events at
# the Warden layer to land FR-1.8 audit-log entries without coupling each
# auth controller to AuditLog.

Warden::Manager.after_authentication do |user, auth, opts|
  next unless user.is_a?(User)

  request = ActionDispatch::Request.new(auth.env)
  AuditLog.record!(
    user:     user,
    action:   "sign_in",
    request:  request,
    metadata: { scope: opts[:scope] }
  )
end

Warden::Manager.before_logout do |user, auth, opts|
  next unless user.is_a?(User)

  request = ActionDispatch::Request.new(auth.env)
  AuditLog.record!(
    user:     user,
    action:   "sign_out",
    request:  request,
    metadata: { scope: opts[:scope] }
  )
end
