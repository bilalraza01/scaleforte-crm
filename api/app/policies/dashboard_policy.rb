class DashboardPolicy < Struct.new(:user, :record)
  def sdr?     = user.present?
  def manager? = user&.admin_role? || user&.manager_role?
  def admin?   = user&.admin_role?
end
