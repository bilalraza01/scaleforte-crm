# In dev/CI we read encryption keys from env vars (set in docker-compose.yml).
# In production, set these via Kamal secrets or your credentials.yml.enc.

if ENV["ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY"].present?
  Rails.application.config.active_record.encryption.primary_key            = ENV.fetch("ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY")
  Rails.application.config.active_record.encryption.deterministic_key      = ENV.fetch("ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY")
  Rails.application.config.active_record.encryption.key_derivation_salt    = ENV.fetch("ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT")
end
