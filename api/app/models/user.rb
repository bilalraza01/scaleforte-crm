class User < ApplicationRecord
  # PRD §6.1 / FR-1.9 — no public signup. :registerable intentionally removed.
  # FR-1.7 7-day idle timeout enforced via :timeoutable + initializer.
  devise :invitable, :database_authenticatable,
         :recoverable, :rememberable, :validatable, :timeoutable,
         :jwt_authenticatable, jwt_revocation_strategy: JwtDenylist

  # Positional enum — only ever append values. Reordering shifts existing
  # role bytes silently and would mis-classify every user in the DB.
  enum role: {
    admin: 0, manager: 1, sdr: 2, onboarder: 3, accountant: 4
  }, _suffix: :role

  belongs_to :manager, class_name: "User", optional: true
  has_many :sdrs, class_name: "User", foreign_key: :manager_id, dependent: :nullify
  has_many :campaign_assignments, foreign_key: :sdr_id, dependent: :destroy
  has_many :campaigns, through: :campaign_assignments
  has_many :sourced_brands, class_name: "Brand", foreign_key: :sdr_id, dependent: :nullify
  has_many :category_assignments, dependent: :destroy
  has_many :assigned_categories,  through: :category_assignments, source: :category
  has_many :created_subcategories, class_name: "Subcategory",
           foreign_key: :created_by_user_id, dependent: :nullify

  validates :name, presence: true
  validate  :manager_must_be_a_manager
  validate  :sdrs_only_belong_to_managers

  scope :active,   -> { where(active: true) }
  scope :inactive, -> { where(active: false) }

  def display_name
    name.presence || email
  end

  # Devise hook — block sign-in for deactivated users (FR-1.3, FR-1.4).
  def active_for_authentication?
    super && active?
  end

  def inactive_message
    active? ? super : :account_deactivated
  end

  private

  def manager_must_be_a_manager
    return if manager.nil?
    errors.add(:manager, "must be a Manager") unless manager.manager_role?
  end

  def sdrs_only_belong_to_managers
    return unless sdr_role? && manager.nil?
    errors.add(:manager, "is required for SDR accounts")
  end
end
