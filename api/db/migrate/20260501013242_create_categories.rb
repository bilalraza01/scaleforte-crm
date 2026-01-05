class CreateCategories < ActiveRecord::Migration[7.1]
  def change
    create_table :categories do |t|
      t.string  :name, null: false
      t.string  :amazon_url_pattern
      t.boolean :active, null: false, default: true
      t.bigint  :default_smartlead_campaign_id

      t.timestamps
    end
    add_index :categories, :name, unique: true
    add_index :categories, :active
  end
end
