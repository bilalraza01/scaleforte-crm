class BrandPolicy < ApplicationPolicy
  def index?   = user.present?
  def show?    = visible?
  def create?  = user.admin_role? || user.manager_role? || user.sdr_role?
  def update?  = visible?
  def destroy? = user.admin_role? || (user.manager_role? && manages_brand?)
  def export?  = user.admin_role?
  # Any authenticated user can probe whether a seller_id is already taken —
  # the response is restricted to (exists?, editable_by_me?, brand_id-if-editable)
  # so we don't leak ownership of brands the user can't see.
  def lookup?  = user.present?

  def mark_ready? = visible? && record.draft_status?
  def approve?    = user.admin_role? || (user.manager_role? && manages_brand?)
  def send_back?  = approve?
  def push?       = user.admin_role?
  def skip?       = visible?
  def reassign?   = user.admin_role? || (user.manager_role? && manages_brand?)
  # Class-level gate for the bulk endpoint — finer per-brand checks happen
  # inside the action so a manager can act over a mixed selection without
  # the whole call 403'ing.
  def bulk_reassign? = user.admin_role? || user.manager_role?

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
