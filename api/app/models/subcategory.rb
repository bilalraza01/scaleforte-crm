class Subcategory < ApplicationRecord
  belongs_to :category
  belongs_to :created_by_user, class_name: "User", optional: true
  has_many :brands, dependent: :nullify

  validates :name, presence: true, uniqueness: { scope: :category_id, case_sensitive: false }

  scope :ordered, -> { order(:name) }
end
