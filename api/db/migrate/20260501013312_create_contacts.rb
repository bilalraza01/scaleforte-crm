class CreateContacts < ActiveRecord::Migration[7.1]
  def change
    create_table :contacts do |t|
      t.references :brand, null: false, foreign_key: true

      t.string  :name
      t.string  :designation
      t.string  :email, null: false
      t.string  :phone
      t.string  :personal_linkedin

      # FR-4.5: only one Primary contact per Brand. DB-enforced via partial
      # unique index so race conditions can't make two primaries.
      t.boolean :is_primary, null: false, default: false

      # Filled in by Phase 2 push job.
      t.bigint  :smartlead_lead_id

      t.timestamps
    end

    add_index :contacts, :email
    add_index :contacts, :smartlead_lead_id, unique: true, where: "smartlead_lead_id IS NOT NULL"
    add_index :contacts, :brand_id, unique: true, where: "is_primary = TRUE", name: "index_contacts_one_primary_per_brand"
  end
end
