class CategoryAssignment < ApplicationRecord
  belongs_to :category
  belongs_to :user
  belongs_to :assigned_by_user, class_name: "User", optional: true

  validates :user_id, uniqueness: { scope: :category_id }
end
