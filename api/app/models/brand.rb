class Brand < ApplicationRecord
  include AASM

  belongs_to :campaign
  belongs_to :sdr, class_name: "User", optional: true

  has_many :contacts, dependent: :destroy
  # has_many :pain_points, has_many_attached :audit_screenshots — Phase 1 Week 3.

  has_paper_trail

  enum status: {
    draft:       0,
    in_progress: 1,
    ready:       2,
    approved:    3,
    pushed:      4,
    skipped:     5
  }, _suffix: :status

  validates :amazon_seller_id, presence: true,
            uniqueness: { scope: :campaign_id, message: "already exists in this campaign" }
  validates :skip_reason, presence: true, if: -> { skipped_status? }

  scope :unclaimed,       -> { where(sdr_id: nil) }
  scope :for_sdr,         ->(user) { where(sdr_id: user.id) }
  scope :awaiting_review, -> { where(status: :ready) }

  # AASM state machine — PRD §18.2.
  aasm column: :status, enum: true, whiny_persistence: true do
    state :draft, initial: true
    state :in_progress, :ready, :approved, :pushed, :skipped

    event :start do
      transitions from: :draft, to: :in_progress
    end

    event :mark_ready do
      transitions from: [:draft, :in_progress], to: :ready, guard: :ready_to_submit?
    end

    event :approve do
      transitions from: :ready, to: :approved
    end

    event :send_back do
      transitions from: [:ready, :approved], to: :draft
    end

    event :push do
      transitions from: :approved, to: :pushed,
                  after: -> { update_column(:pushed_at, Time.current) }
    end

    event :skip do
      transitions from: [:draft, :in_progress, :ready, :approved], to: :skipped
    end
  end

  # FR-3.6 — required fields to leave Draft / In Progress for Ready.
  # Audit screenshot + pain-point requirements land in Phase 1 Week 3.
  def ready_to_submit?
    brand_name.present? &&
      website.present? &&
      contacts.any? { |c| c.email.present? }
  end

  def primary_contact
    contacts.find_by(is_primary: true) || contacts.first
  end
end
