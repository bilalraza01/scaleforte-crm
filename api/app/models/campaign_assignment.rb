class CampaignAssignment < ApplicationRecord
  belongs_to :campaign
  belongs_to :sdr, class_name: "User"

  validates :sdr, uniqueness: { scope: :campaign_id }
  validates :target_count, numericality: { greater_than_or_equal_to: 0 }
  validate  :sdr_must_have_sdr_role

  private

  def sdr_must_have_sdr_role
    return if sdr.nil?
    errors.add(:sdr, "must be a user with role :sdr") unless sdr.sdr_role?
  end
end
