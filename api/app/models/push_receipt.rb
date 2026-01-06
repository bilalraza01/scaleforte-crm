class PushReceipt < ApplicationRecord
  belongs_to :user

  enum status: { queued: 0, running: 1, succeeded: 2, failed: 3 }, _suffix: :status

  scope :recent, -> { order(created_at: :desc) }

  def add_success!(brand_id, smartlead_lead_id:)
    self.success_count += 1
    self.details["successes"] ||= []
    self.details["successes"] << { brand_id: brand_id, smartlead_lead_id: smartlead_lead_id }
    save!
  end

  def add_failure!(brand_id, error:)
    self.failure_count += 1
    self.details["failures"] ||= []
    self.details["failures"] << { brand_id: brand_id, error: error }
    save!
  end
end
