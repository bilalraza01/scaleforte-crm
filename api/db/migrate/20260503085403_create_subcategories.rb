class CreateSubcategories < ActiveRecord::Migration[7.1]
  def change
    create_table :subcategories do |t|
      t.references :category, null: false, foreign_key: true
      t.string :name, null: false
      t.references :created_by_user, foreign_key: { to_table: :users }
      t.timestamps
    end
    add_index :subcategories, [:category_id, :name], unique: true
  end
end
