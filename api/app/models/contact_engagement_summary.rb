class ContactEngagementSummary < ApplicationRecord
  belongs_to :contact

  enum current_status: {
    not_sent:     0,
    sent:         1,
    opened:       2,
    replied:      3,
    bounced:      4,
    unsubscribed: 5
  }, _suffix: :status

  enum reply_classification: {
    positive:            0,
    negative:            1,
    ooo:                 2,
    info_request:        3,
    unsubscribe_request: 4
  }, _suffix: :classification
end
