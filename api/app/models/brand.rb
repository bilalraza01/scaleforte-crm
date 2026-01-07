class Brand < ApplicationRecord
  include AASM

  belongs_to :campaign
  belongs_to :sdr, class_name: "User", optional: true
  belongs_to :subcategory, optional: true

  has_many :contacts,    dependent: :destroy
  has_many :pain_points, dependent: :destroy
  has_many_attached :audit_screenshots

  has_paper_trail

  enum status: {
    draft:    0,
    ready:    2,
    approved: 3,
    pushed:   4,
    skipped:  5
  }, _suffix: :status
  # Integer 1 (formerly :in_progress) is intentionally skipped — the gap is
  # safe for AR enums. Merged into :draft via a data migration.

  validates :amazon_seller_id, presence: true,
            uniqueness: { case_sensitive: false, message: "already exists" }
  validates :skip_reason, presence: true, if: -> { skipped_status? }
  validate  :subcategory_must_match_campaign_category

  scope :for_sdr,         ->(user) { where(sdr_id: user.id) }
  scope :awaiting_review, -> { where(status: :ready) }

  # AASM state machine: draft -> ready -> approved -> pushed; * -> skipped.
  aasm column: :status, enum: true, whiny_persistence: true do
    state :draft, initial: true
    state :ready, :approved, :pushed, :skipped

    event :mark_ready do
      transitions from: :draft, to: :ready, guard: :ready_to_submit?,
                  after: -> { update_column(:marked_ready_at, Time.current) }
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
      transitions from: [:draft, :ready, :approved], to: :skipped
    end
  end

  # FR-3.6 + FR-5.4 — required to leave Draft for Ready.
  def ready_to_submit?
    brand_name.present? &&
      website.present? &&
      contacts.any? { |c| c.email.present? } &&
      audit_screenshots.attached? &&
      pain_points.any?
  end

  def missing_ready_fields
    missing = []
    missing << "brand_name" if brand_name.blank?
    missing << "website"    if website.blank?
    missing << "contact_with_email" if contacts.none? { |c| c.email.present? }
    missing << "audit_screenshot"   unless audit_screenshots.attached?
    missing << "pain_point"         if pain_points.none?
    missing
  end

  def primary_contact
    contacts.find_by(is_primary: true) || contacts.first
  end

  private

  def subcategory_must_match_campaign_category
    return if subcategory.nil? || campaign.nil?
    return if subcategory.category_id == campaign.category_id
    errors.add(:subcategory, "must belong to the campaign's category")
  end
end
