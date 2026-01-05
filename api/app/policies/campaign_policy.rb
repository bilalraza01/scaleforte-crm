class CampaignPolicy < ApplicationPolicy
  def index?   = user.present?
  def show?    = user.present?
  def create?  = user.admin_role?
  def update?  = user.admin_role?
  def destroy? = user.admin_role?
  def assign?  = user.admin_role?

  class Scope < Scope
    def resolve
      if user.admin_role?
        scope.all
      elsif user.manager_role?
        sdr_ids = User.where(manager_id: user.id).pluck(:id) << user.id
        scope.joins(:campaign_assignments).where(campaign_assignments: { sdr_id: sdr_ids }).distinct
      else
        scope.joins(:campaign_assignments).where(campaign_assignments: { sdr_id: user.id })
      end
    end
  end
end
