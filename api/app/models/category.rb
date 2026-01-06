class Category < ApplicationRecord
  has_many :campaigns,            dependent: :restrict_with_error
  has_many :subcategories,        dependent: :destroy
  has_many :category_assignments, dependent: :destroy
  has_many :assigned_users,       through: :category_assignments, source: :user

  validates :name, presence: true, uniqueness: true

  scope :active, -> { where(active: true) }

  def archive!
    update!(active: false)
  end
end
