class ContactPolicy < ApplicationPolicy
  delegate :brand, to: :record

  def show?    = brand_visible?
  def create?  = brand_editable?
  def update?  = brand_editable?
  def destroy? = brand_editable?

  class Scope < Scope
    def resolve
      visible_brand_ids = BrandPolicy::Scope.new(user, Brand).resolve.select(:id)
      scope.where(brand_id: visible_brand_ids)
    end
  end

  private

  def brand_visible?
    BrandPolicy.new(user, brand).show?
  end

  def brand_editable?
    BrandPolicy.new(user, brand).update?
  end
end
