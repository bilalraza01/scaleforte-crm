class CreatePushReceipts < ActiveRecord::Migration[7.1]
  def change
    create_table :push_receipts do |t|
      t.references :user, foreign_key: true, null: false
      t.bigint   :smartlead_campaign_id, null: false
      t.integer  :status,        null: false, default: 0
      t.integer  :total_count,   null: false, default: 0
      t.integer  :success_count, null: false, default: 0
      t.integer  :failure_count, null: false, default: 0
      t.datetime :started_at
      t.datetime :finished_at
      t.jsonb    :details, default: {}, null: false

      t.timestamps
    end

    add_index :push_receipts, :status
    add_index :push_receipts, :created_at
  end
end
