class EngagementEvent < ApplicationRecord
  belongs_to :contact, optional: true

  enum event_type: {
    sent:         0,
    opened:       1,
    clicked:      2,
    replied:      3,
    bounced:      4,
    unsubscribed: 5
  }, _suffix: :event

  validates :smartlead_event_id, presence: true, uniqueness: true

  scope :unmatched_events, -> { where(unmatched: true) }
  scope :replies,          -> { where(event_type: :replied) }
end
