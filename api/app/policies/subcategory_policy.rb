class SubcategoryPolicy < ApplicationPolicy
  def index?  = user.present?
  def show?   = user.present?
  # SDRs can add a subcategory to any of their assigned categories.
  # Admin/Manager can add anywhere.
  def create?
    return false if user.nil?
    return true if user.admin_role? || user.manager_role?
    user.sdr_role? && user.assigned_categories.exists?(id: record.category_id)
  end
  def update?  = user.admin_role?
  def destroy? = user.admin_role?

  class Scope < Scope
    def resolve = scope.all
  end
end
