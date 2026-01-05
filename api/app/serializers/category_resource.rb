class CategoryResource
  include Alba::Resource

  attributes :id, :name, :amazon_url_pattern, :active, :default_smartlead_campaign_id

  attribute :campaigns_count do |c|
    c.campaigns.size
  end
end
