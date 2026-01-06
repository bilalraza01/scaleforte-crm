class CreateCategoryAssignments < ActiveRecord::Migration[7.1]
  def change
    create_table :category_assignments do |t|
      t.references :category, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.references :assigned_by_user, foreign_key: { to_table: :users }
      t.timestamps
    end
    add_index :category_assignments, [:category_id, :user_id], unique: true
  end
end
