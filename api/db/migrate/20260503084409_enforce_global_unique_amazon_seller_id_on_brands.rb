class EnforceGlobalUniqueAmazonSellerIdOnBrands < ActiveRecord::Migration[7.1]
  def change
    remove_index :brands, name: "index_brands_on_campaign_id_and_amazon_seller_id"
    add_index :brands, :amazon_seller_id, unique: true
    # Keep the (campaign_id, amazon_seller_id) lookup path fast for filtered
    # queries even though it's no longer the uniqueness enforcer.
    add_index :brands, [:campaign_id, :amazon_seller_id]
  end
end
