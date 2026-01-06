class AddSubcategoryToBrands < ActiveRecord::Migration[7.1]
  def change
    # Nullable: existing brands have no subcategory yet, and the field is
    # optional even on new brands until the SDR picks one.
    add_reference :brands, :subcategory, null: true, foreign_key: true
  end
end
