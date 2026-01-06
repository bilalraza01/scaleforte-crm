class CategoryAssignmentPolicy < ApplicationPolicy
  def index?  = user.admin_role? || user.manager_role?
  def create?
    return false if user.nil?
    return true if user.admin_role?
    return false unless user.manager_role?
    # Manager can only assign categories to SDRs they manage.
    target_user = record.is_a?(CategoryAssignment) ? record.user : record_target_user
    target_user.present? && target_user.manager_id == user.id
  end
  def destroy? = create?

  class Scope < Scope
    def resolve = scope.all
  end

  private

  # Used at create-time when `record` is a User (not a CategoryAssignment).
  def record_target_user
    record.is_a?(User) ? record : nil
  end
end
