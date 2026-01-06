# Wraps an Active Storage attachment so the React app gets a stable shape.

class AuditScreenshotResource
  include Alba::Resource

  attribute :id           do |a| a.id end
  attribute :filename     do |a| a.blob.filename.to_s end
  attribute :byte_size    do |a| a.blob.byte_size end
  attribute :content_type do |a| a.blob.content_type end
  attribute :url do |a|
    if a.blob.service.public?
      # R2 (or any public service): direct CDN URL, no Rails redirect.
      a.blob.url
    else
      # Local Disk in dev: redirect through Rails so the URL is stable
      # for the page lifetime and the API serves the bytes.
      api_host = URI.parse(ENV.fetch("API_HOST", "http://localhost:3010"))
      Rails.application.routes.url_helpers.rails_blob_url(
        a,
        protocol: api_host.scheme,
        host:     api_host.host,
        port:     api_host.port
      )
    end
  end
  attribute :created_at   do |a| a.created_at end
end
