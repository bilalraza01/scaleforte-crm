class Campaign < ApplicationRecord
  belongs_to :category
  has_many :campaign_assignments, dependent: :destroy
  has_many :sdrs, through: :campaign_assignments, source: :sdr
  has_many :brands, dependent: :restrict_with_error

  enum status: { draft: 0, active: 1, closed: 2 }, _suffix: :status

  validates :month, presence: true, inclusion: { in: 1..12 }
  validates :year,  presence: true, numericality: { greater_than: 2024, less_than: 2100 }
  validates :category_id, uniqueness: { scope: [:year, :month] }

  scope :for_month, ->(year, month) { where(year: year, month: month) }
  scope :recent,    -> { order(year: :desc, month: :desc) }

  def label
    "#{category.name} — #{Date::MONTHNAMES[month]} #{year}"
  end
end
