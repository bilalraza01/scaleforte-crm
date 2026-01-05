class CreateCampaigns < ActiveRecord::Migration[7.1]
  def change
    create_table :campaigns do |t|
      t.references :category, null: false, foreign_key: true
      t.integer :month, null: false
      t.integer :year,  null: false
      t.integer :status, null: false, default: 0  # enum: draft=0, active=1, closed=2
      t.bigint  :smartlead_campaign_id

      t.timestamps
    end

    add_index :campaigns, [:category_id, :year, :month], unique: true
    add_index :campaigns, :status
  end
end
