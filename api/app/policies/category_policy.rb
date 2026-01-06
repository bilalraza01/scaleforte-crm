class CategoryPolicy < ApplicationPolicy
  def index?   = user.present?
  def show?    = user.present?
  # Admin + Manager can both create / edit categories per product brief.
  def create?  = user.admin_role? || user.manager_role?
  def update?  = user.admin_role? || user.manager_role?
  def destroy? = user.admin_role?
  def archive? = user.admin_role?

  class Scope < Scope
    def resolve = scope.all
  end
end
