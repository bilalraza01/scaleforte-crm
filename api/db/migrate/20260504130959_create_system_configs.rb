class CreateSystemConfigs < ActiveRecord::Migration[7.1]
  def change
    create_table :system_configs do |t|
      # Single-row singleton holding org-wide settings. Currently just the
      # SDR daily target (number of brands an SDR is expected to mark Ready
      # per day). 0 = no target.
      t.integer :daily_brand_target, null: false, default: 0
      t.timestamps
    end
  end
end
