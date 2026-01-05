# Wraps an Active Storage attachment so the React app gets a stable shape.

class AuditScreenshotResource
  include Alba::Resource

  attribute :id           do |a| a.id end
  attribute :filename     do |a| a.blob.filename.to_s end
  attribute :byte_size    do |a| a.blob.byte_size end
  attribute :content_type do |a| a.blob.content_type end
  attribute :url          do |a| Rails.application.routes.url_helpers.rails_blob_url(a, host: ENV.fetch("API_HOST", "http://localhost:3010")) end
  attribute :created_at   do |a| a.created_at end
end
