class SystemConfig < ApplicationRecord
  # Org-wide singleton for now — extend with more settings as the OS grows.
  # Always read via SystemConfig.current; never `.find` or `.first` directly,
  # so the row is auto-created on first read in a fresh environment.
  validates :daily_brand_target, numericality: { greater_than_or_equal_to: 0 }

  def self.current
    first_or_create!
  end
end
