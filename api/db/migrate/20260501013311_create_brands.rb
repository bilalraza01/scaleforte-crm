class CreateBrands < ActiveRecord::Migration[7.1]
  def change
    create_table :brands do |t|
      t.references :campaign, null: false, foreign_key: true
      t.references :sdr, foreign_key: { to_table: :users }   # nullable until claimed (FR-3.3)

      t.string  :amazon_seller_id, null: false
      t.string  :brand_name
      t.string  :business_name
      t.decimal :revenue, precision: 12, scale: 2
      t.string  :country
      t.string  :website
      t.string  :asin
      t.string  :amazon_link
      t.string  :facebook_url
      t.string  :instagram_url
      t.string  :company_linkedin_url

      # AASM (PRD §18.2): draft -> in_progress -> ready -> approved -> pushed; * -> skipped
      t.integer :status, null: false, default: 0
      t.string  :skip_reason

      t.datetime :pushed_at
      t.bigint   :smartlead_pushed_campaign_id

      t.timestamps
    end

    # FR-3.8: hard-block on duplicate (campaign, amazon_seller_id).
    add_index :brands, [:campaign_id, :amazon_seller_id], unique: true
    add_index :brands, :status
    add_index :brands, [:sdr_id, :status]
  end
end
