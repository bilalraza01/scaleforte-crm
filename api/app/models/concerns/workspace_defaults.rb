# Default workspace_access for each role. Used when creating a user without
# an explicit workspace_access list, and by seeds. Admin always gets all
# workspaces — admin's WorkspacePolicy short-circuits regardless of column.
module WorkspaceDefaults
  ALL = %w[acquisition onboarding retention invoicing settings].freeze

  DEFAULTS = {
    "admin"      => ALL,
    "manager"    => %w[acquisition settings],
    "sdr"        => %w[acquisition],
    "onboarder"  => %w[onboarding],
    "accountant" => %w[invoicing],
  }.freeze

  def self.for(role)
    DEFAULTS.fetch(role.to_s, [])
  end
end
