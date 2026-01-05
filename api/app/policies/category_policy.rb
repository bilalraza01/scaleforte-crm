class CategoryPolicy < ApplicationPolicy
  def index?   = user.present?
  def show?    = user.present?
  def create?  = user.admin_role?
  def update?  = user.admin_role?
  def destroy? = user.admin_role?
  def archive? = user.admin_role?

  class Scope < Scope
    def resolve = scope.all
  end
end
