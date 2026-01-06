class SmartleadConfig < ApplicationRecord
  encrypts :api_key
  encrypts :webhook_secret

  validates :api_key, presence: true, on: :update

  # Singleton — there is only one Smartlead account for the agency (PRD §15).
  def self.current
    first || create!(api_key: nil)
  end

  def masked_api_key
    return nil if api_key.blank?
    "sk_#{"•" * 8}#{api_key.last(4)}"
  end

  def configured?
    api_key.present?
  end
end
