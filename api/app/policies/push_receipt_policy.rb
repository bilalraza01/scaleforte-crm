class PushReceiptPolicy < ApplicationPolicy
  def index?  = user.admin_role?
  def show?   = user.admin_role?
  def create? = user.admin_role?

  class Scope < Scope
    def resolve = user.admin_role? ? scope.all : scope.none
  end
end
