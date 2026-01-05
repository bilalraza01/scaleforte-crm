class BrandResource
  include Alba::Resource

  attributes :id, :amazon_seller_id, :brand_name, :business_name,
             :country, :website, :asin, :amazon_link,
             :facebook_url, :instagram_url, :company_linkedin_url,
             :status, :skip_reason, :pushed_at

  attribute :revenue do |b|
    b.revenue&.to_s
  end

  attribute :campaign_id  do |b| b.campaign_id  end
  attribute :sdr_id       do |b| b.sdr_id       end
  attribute :sdr_name     do |b| b.sdr&.display_name end

  attribute :missing_ready_fields do |b|
    b.missing_ready_fields
  end

  many :contacts,    resource: "ContactResource"
  many :pain_points, resource: "PainPointResource"

  attribute :audit_screenshots do |b|
    AuditScreenshotResource.new(b.audit_screenshots.includes(:blob).to_a).to_h
  end
end
