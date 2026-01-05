class CreateCampaignAssignments < ActiveRecord::Migration[7.1]
  def change
    create_table :campaign_assignments do |t|
      t.references :campaign, null: false, foreign_key: true
      t.references :sdr, null: false, foreign_key: { to_table: :users }
      t.integer  :target_count, null: false, default: 0
      t.datetime :started_at
      t.datetime :completed_at

      t.timestamps
    end

    add_index :campaign_assignments, [:campaign_id, :sdr_id], unique: true
  end
end
