class CampaignResource
  include Alba::Resource

  attributes :id, :month, :year, :status, :smartlead_campaign_id

  attribute :category_id do |c|
    c.category_id
  end

  attribute :category_name do |c|
    c.category&.name
  end

  attribute :label do |c|
    c.label
  end

  attribute :assignments_count do |c|
    c.campaign_assignments.size
  end

  attribute :brands_count do |c|
    c.brands.size
  end
end
