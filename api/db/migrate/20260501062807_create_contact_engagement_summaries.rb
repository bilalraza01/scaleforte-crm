class CreateContactEngagementSummaries < ActiveRecord::Migration[7.1]
  def change
    create_table :contact_engagement_summaries do |t|
      t.references :contact, null: false, foreign_key: true, index: { unique: true }
      t.bigint   :smartlead_lead_id

      t.datetime :sent_at
      t.datetime :last_opened_at
      t.integer  :open_count, null: false, default: 0
      t.datetime :last_replied_at
      t.integer  :reply_count, null: false, default: 0
      t.datetime :last_clicked_at
      t.integer  :click_count, null: false, default: 0
      t.datetime :bounced_at
      t.datetime :unsubscribed_at

      t.integer  :current_status, null: false, default: 0
      t.integer  :reply_classification

      t.timestamps
    end

    add_index :contact_engagement_summaries, :smartlead_lead_id
    add_index :contact_engagement_summaries, :current_status
  end
end
