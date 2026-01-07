# Coarse gate that decides whether a user can ENTER a top-level workspace
# (Acquisition, Onboarding, Retention, Invoicing, Settings). The fine-grained
# permissions inside each workspace stay on their existing per-resource
# policies (BrandPolicy, UserPolicy, etc.) — this policy is only consulted
# by the FE when rendering the workspace rail.
class WorkspacePolicy < ApplicationPolicy
  WORKSPACES = WorkspaceDefaults::ALL

  # `record` is the workspace key as a string or symbol.
  def show?
    return false unless WORKSPACES.include?(record.to_s)
    user.admin_role? || user.workspace_access.to_a.include?(record.to_s)
  end
  alias_method :access?, :show?

  class Scope < Scope
    def resolve
      WORKSPACES.select { |key| WorkspacePolicy.new(user, key).show? }
    end
  end
end
