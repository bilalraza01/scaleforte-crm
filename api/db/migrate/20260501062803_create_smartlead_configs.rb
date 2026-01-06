class CreateSmartleadConfigs < ActiveRecord::Migration[7.1]
  def change
    create_table :smartlead_configs do |t|
      # encrypts :api_key + :webhook_secret via Active Record encryption.
      # Stored long because the encrypted ciphertext + metadata blow up size.
      t.text     :api_key
      t.text     :webhook_secret
      t.datetime :last_test_at
      t.boolean  :last_test_success

      # Per-category default Smartlead campaign id mapping (FR-2.6) lives on
      # categories.default_smartlead_campaign_id (already migrated).

      t.timestamps
    end
  end
end
