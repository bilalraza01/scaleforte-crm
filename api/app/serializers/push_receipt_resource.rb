class PushReceiptResource
  include Alba::Resource

  attributes :id, :smartlead_campaign_id, :status,
             :total_count, :success_count, :failure_count,
             :started_at, :finished_at, :created_at

  attribute :details do |r| r.details end
  attribute :user_id  do |r| r.user_id end
  attribute :user_name do |r| r.user&.display_name end
end
