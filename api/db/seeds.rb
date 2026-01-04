# Idempotent seeds for local development.
# Production seeding follows the runbook (User Journey 5.4).

if Rails.env.development?
  admin = User.find_or_initialize_by(email: "admin@scaleforte.local")
  if admin.new_record?
    admin.assign_attributes(
      name: "Local Admin",
      role: :admin,
      password: "Password123!",
      password_confirmation: "Password123!",
      active: true
    )
    admin.skip_invitation = true
    admin.save!
    puts "→ created admin: admin@scaleforte.local / Password123!"
  else
    puts "→ admin already exists: #{admin.email}"
  end
end
