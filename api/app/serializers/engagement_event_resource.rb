class EngagementEventResource
  include Alba::Resource

  attributes :id, :event_type, :occurred_at, :received_at,
             :reply_subject, :reply_body, :unmatched

  attribute :contact_id do |e| e.contact_id end
  attribute :brand_id   do |e| e.contact&.brand_id end
  attribute :brand_name do |e| e.contact&.brand&.brand_name end
  attribute :sdr_name   do |e| e.contact&.brand&.sdr&.display_name end
  attribute :category_name do |e| e.contact&.brand&.campaign&.category&.name end
end
