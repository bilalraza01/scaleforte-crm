class IntegrationHealthPolicy < Struct.new(:user, :record)
  def show?
    user&.admin_role?
  end
end
