class CreateEngagementEvents < ActiveRecord::Migration[7.1]
  def change
    create_table :engagement_events do |t|
      t.string   :smartlead_event_id, null: false
      t.bigint   :smartlead_lead_id
      t.bigint   :smartlead_campaign_id
      t.integer  :event_type, null: false
      t.datetime :occurred_at
      t.datetime :received_at, null: false
      t.datetime :processed_at

      t.references :contact, foreign_key: true, null: true

      t.string :reply_subject
      t.text   :reply_body

      t.jsonb   :raw_payload, default: {}, null: false
      t.boolean :unmatched, null: false, default: true

      t.timestamps
    end

    add_index :engagement_events, :smartlead_event_id, unique: true
    add_index :engagement_events, :smartlead_lead_id
    add_index :engagement_events, [:event_type, :occurred_at]
    add_index :engagement_events, :unmatched
  end
end
