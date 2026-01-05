class CreatePainPoints < ActiveRecord::Migration[7.1]
  def change
    create_table :pain_points do |t|
      t.references :brand, null: false, foreign_key: true
      t.integer :category, null: false
      t.text    :description
      t.integer :display_order, null: false, default: 0

      t.timestamps
    end

    add_index :pain_points, [:brand_id, :display_order]
  end
end
