class EngagementEventPolicy < ApplicationPolicy
  def index?    = user.admin_role? || user.manager_role?
  def show?     = user.admin_role? || user.manager_role?
  def classify? = user.admin_role?

  class Scope < Scope
    def resolve
      visible_brand_ids = BrandPolicy::Scope.new(user, Brand).resolve.select(:id)
      visible_contact_ids = Contact.where(brand_id: visible_brand_ids).select(:id)
      scope.where(contact_id: visible_contact_ids)
    end
  end
end
