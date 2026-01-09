class AddRevenueBucketToBrands < ActiveRecord::Migration[7.1]
  def change
    # Coarse revenue bucket as a string column. Replaces (in the UI) the
    # exact-decimal `revenue` field for new entries — keeping the existing
    # column for backward compatibility with historical data.
    #
    # Allowed values are documented in Brand::REVENUE_BUCKETS.
    add_column :brands, :revenue_bucket, :string
  end
end
