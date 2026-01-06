class CategoryAssignmentResource
  include Alba::Resource

  attributes :id, :category_id, :user_id

  attribute :category_name do |a| a.category.name end
  attribute :user_name     do |a| a.user.display_name end
end
