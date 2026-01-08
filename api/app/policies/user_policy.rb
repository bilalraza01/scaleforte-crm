class UserPolicy < ApplicationPolicy
  # PRD §10 permissions matrix:
  #   Admin   → full CRUD over any user
  #   Manager → CRUD only over SDRs they manage + self
  #   SDR     → may only view/edit themselves

  def index?
    user.admin_role? || user.manager_role?
  end

  def show?
    user.admin_role? || record == user || manages?(record)
  end

  # Admin can create any role; Manager can only create SDRs (enforced by
  # the controller stripping :role from non-admin params and forcing
  # role=sdr + manager_id=self for manager-initiated creates).
  def create?
    user.admin_role? || user.manager_role?
  end

  def update?
    user.admin_role? || record == user || manages?(record)
  end

  def destroy?
    user.admin_role? || manages?(record)
  end

  def deactivate?
    destroy?
  end

  def reset_password?
    user.admin_role? || record == user || manages?(record)
  end

  def invite?
    user.admin_role? || user.manager_role?
  end

  class Scope < Scope
    def resolve
      if user.admin_role?
        scope.all
      elsif user.manager_role?
        scope.where(id: user.id).or(scope.where(manager_id: user.id))
      else
        scope.where(id: user.id)
      end
    end
  end

  private

  def manages?(other)
    user.manager_role? && other.is_a?(User) && other.manager_id == user.id
  end
end
