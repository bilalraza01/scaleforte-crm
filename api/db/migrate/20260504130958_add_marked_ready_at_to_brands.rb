class AddMarkedReadyAtToBrands < ActiveRecord::Migration[7.1]
  def change
    add_column :brands, :marked_ready_at, :datetime
    # Indexed because the SDR daily-target query filters
    # `where(sdr_id: X, marked_ready_at: Time.current.all_day)`
    # and we want it sub-millisecond on the hot path.
    add_index :brands, [:sdr_id, :marked_ready_at]
  end
end
