class SubcategoryResource
  include Alba::Resource

  attributes :id, :category_id, :name

  attribute :created_by_user_id do |s| s.created_by_user_id end
  attribute :created_by_name    do |s| s.created_by_user&.display_name end
end
