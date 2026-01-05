class PainPoint < ApplicationRecord
  belongs_to :brand

  # PRD §18.3 — initial set. Adding new categories is a migration / enum bump.
  enum category: {
    listing_copy: 0,
    images:       1,
    reviews:      2,
    ppc:          3,
    inventory:    4,
    pricing:      5,
    other:        6
  }, _suffix: :category

  validates :category, presence: true
  validates :description, length: { maximum: 500 }

  scope :ordered, -> { order(:display_order, :id) }
end
