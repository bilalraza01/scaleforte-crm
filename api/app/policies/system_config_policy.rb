class SystemConfigPolicy < ApplicationPolicy
  # Anyone authenticated can read so SDRs see their org's daily target;
  # only admins can change it.
  def show?   = user.present?
  def update? = user.admin_role?

  class Scope < Scope
    def resolve = scope.all
  end
end
