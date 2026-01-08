class UserResource
  include Alba::Resource

  attributes :id, :email, :name, :role, :active

  attribute :manager_id do |user|
    user.manager_id
  end

  attribute :manager_name do |user|
    user.manager&.display_name
  end

  attribute :assigned_category_ids do |user|
    user.category_assignments.pluck(:category_id)
  end

  attribute :workspace_access do |user|
    user.workspace_access.to_a
  end
end
