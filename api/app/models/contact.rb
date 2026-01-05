class Contact < ApplicationRecord
  belongs_to :brand

  EMAIL_FORMAT = URI::MailTo::EMAIL_REGEXP

  validates :email, presence: true, format: { with: EMAIL_FORMAT, message: "is not a valid email" }

  before_save :unset_other_primaries, if: :is_primary?

  scope :primary, -> { where(is_primary: true) }

  private

  # Only one Primary per Brand. DB also enforces via partial unique index;
  # this AR hook keeps the in-memory state consistent.
  def unset_other_primaries
    Contact.where(brand_id: brand_id).where.not(id: id).update_all(is_primary: false)
  end
end
