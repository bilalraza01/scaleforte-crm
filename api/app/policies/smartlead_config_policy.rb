class SmartleadConfigPolicy < ApplicationPolicy
  def show?    = user.admin_role?
  def update?  = user.admin_role?
  def test?    = user.admin_role?

  class Scope < Scope
    def resolve = user.admin_role? ? scope.all : scope.none
  end
end
