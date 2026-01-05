class Category < ApplicationRecord
  has_many :campaigns, dependent: :restrict_with_error

  validates :name, presence: true, uniqueness: true

  scope :active, -> { where(active: true) }

  def archive!
    update!(active: false)
  end
end
