class BrandPolicy < ApplicationPolicy
  def index?   = user.present?
  def show?    = visible?
  def create?  = user.admin_role? || user.manager_role? || user.sdr_role?
  def update?  = visible?
  def destroy? = user.admin_role? || (user.manager_role? && manages_brand?)

  def mark_ready? = visible? && (record.draft_status? || record.in_progress_status?)
  def approve?    = user.admin_role? || (user.manager_role? && manages_brand?)
  def send_back?  = approve?
  def push?       = user.admin_role?
  def skip?       = visible?
  def reassign?   = user.admin_role? || (user.manager_role? && manages_brand?)

  class Scope < Scope
    def resolve
      if user.admin_role?
        scope.all
      elsif user.manager_role?
        sdr_ids = User.where(manager_id: user.id).pluck(:id) << user.id
        scope.where(sdr_id: sdr_ids)
      else
        scope.where(sdr_id: user.id)
      end
    end
  end

  private

  def visible?
    user.admin_role? || record.sdr_id == user.id || manages_brand?
  end

  def manages_brand?
    user.manager_role? && record.sdr.present? && record.sdr.manager_id == user.id
  end
end
