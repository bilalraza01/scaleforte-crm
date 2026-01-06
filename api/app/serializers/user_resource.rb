class UserResource
  include Alba::Resource

  attributes :id, :email, :name, :role, :active

  attribute :manager_id do |user|
    user.manager_id
  end

  attribute :manager_name do |user|
    user.manager&.display_name
  end

  attribute :invitation_pending do |user|
    user.invitation_sent_at.present? && user.invitation_accepted_at.nil?
  end

  attribute :assigned_category_ids do |user|
    user.category_assignments.pluck(:category_id)
  end

  attribute :workspace_access do |user|
    user.workspace_access.to_a
  end
end
