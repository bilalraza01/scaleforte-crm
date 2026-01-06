# aws-sdk-s3 1.180+ sends both an MD5 and a CRC32 integrity checksum by default,
# which R2 rejects with "You can only specify one non-default checksum at a time."
# Switch to `when_required` so checksums are only sent for operations that
# strictly need them — matches R2's S3-compatibility surface.
require "aws-sdk-core"
Aws.config.update(
  request_checksum_calculation:  "when_required",
  response_checksum_validation:  "when_required"
)

# R2 public buckets serve content from a different hostname than the S3 API
# endpoint (`pub-<id>.r2.dev` or a custom domain), so the default
# S3Service#public_url — which points at the API endpoint — returns a URL that
# 401s for anonymous fetchers (Smartlead recipients, ourselves over plain HTTP).
#
# When R2_PUBLIC_URL_HOST is set we rewrite `public_url` to use it.
# Active Storage loads its service classes lazily, so we require S3Service
# explicitly here before redefining the method.
if ENV["R2_PUBLIC_URL_HOST"].present?
  require "active_storage/service/s3_service"

  ActiveStorage::Service::S3Service.class_eval do
    define_method(:public_url) do |key, **|
      "#{ENV["R2_PUBLIC_URL_HOST"].chomp("/")}/#{key}"
    end
  end
end
