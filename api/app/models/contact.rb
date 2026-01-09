class Contact < ApplicationRecord
  belongs_to :brand

  EMAIL_FORMAT = URI::MailTo::EMAIL_REGEXP

  validates :email, presence: true, format: { with: EMAIL_FORMAT, message: "is not a valid email" }

  before_validation :compose_name_from_parts
  before_save :unset_other_primaries, if: :is_primary?

  scope :primary, -> { where(is_primary: true) }

  def display_name
    return name if name.present?
    [first_name, last_name].compact.join(" ").presence
  end

  private

  # Only one Primary per Brand. DB also enforces via partial unique index;
  # this AR hook keeps the in-memory state consistent.
  def unset_other_primaries
    Contact.where(brand_id: brand_id).where.not(id: id).update_all(is_primary: false)
  end

  # FE collects First name + Last name (per "Changes to be made in the CRM" #9).
  # Keep the legacy `name` column populated so existing readers don't break,
  # and so the Smartlead push still has a full-name fallback merge var.
  def compose_name_from_parts
    composed = [first_name, last_name].compact_blank.join(" ").presence
    self.name = composed if composed.present?
  end
end
