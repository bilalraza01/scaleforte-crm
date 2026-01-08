namespace :dashboards do
  # One-shot demo backfill: populates `marked_ready_at` for existing brands
  # and bulk-inserts synthetic :pushed brands so the per-SDR trend chart
  # and the period-table targets have meaningful data on day one.
  #
  # Idempotent — safe to re-run; existing already-stamped brands are
  # skipped, and synthetic brands carry a "BF" prefix on their seller_id
  # for easy identification + cleanup.
  #
  #   bin/rails dashboards:backfill_marked_ready
  desc "Distribute marked_ready_at timestamps across recent weekdays for chart demo data"
  task backfill_marked_ready: :environment do
    abort "Refusing to run outside development." unless Rails.env.development?

    require "faker"

    today    = Date.current
    weekdays = (0...180).map { |d| today - d }.select { |d| d.wday.between?(1, 5) }

    # Phase 1 — stamp existing :ready/:approved/:pushed brands that still
    # have a NULL marked_ready_at.
    eligible = Brand.where(status: [:ready, :approved, :pushed], marked_ready_at: nil)
    eligible.find_each do |b|
      day = weekdays.sample
      ts  = day.to_time + rand(9..17).hours + rand(60).minutes
      b.update_columns(marked_ready_at: ts)
    end
    puts "  ✓ stamped #{eligible.count} existing eligible brands"

    # Phase 2 — bulk-insert synthetic :pushed brands so the chart looks
    # like a healthy team. Volume varies per SDR (some hit target, some
    # don't) to give the chart visual variety.
    sdrs = User.sdr_role.active.to_a
    if sdrs.empty?
      puts "  (no active SDRs — skipping synthetic generation)"
      next
    end

    rows = []
    sdrs.each do |sdr|
      cat_ids      = sdr.assigned_categories.pluck(:id)
      next if cat_ids.empty?
      campaign_ids = Campaign.where(category_id: cat_ids).pluck(:id)
      next if campaign_ids.empty?

      base_rate = rand(10..28)  # per-SDR daily baseline brands marked Ready
      weekdays.each do |day|
        n = (base_rate * (0.6 + rand * 0.7)).round  # ±35% daily variance
        next if n < 1
        n.times do
          ts = day.to_time + rand(9..17).hours + rand(60).minutes
          rows << {
            campaign_id:      campaign_ids.sample,
            sdr_id:           sdr.id,
            amazon_seller_id: "BF#{SecureRandom.alphanumeric(13).upcase}",
            brand_name:       Faker::Company.name,
            business_name:    Faker::Company.name,
            status:           Brand.statuses[:pushed],
            marked_ready_at:  ts,
            pushed_at:        ts + rand(1..3).days,
            created_at:       ts - 1.hour,
            updated_at:       ts + 1.hour,
          }
        end
      end
    end

    # insert_all bypasses AASM, validations, and PaperTrail — exactly
    # what we want for synthetic demo rows.
    rows.each_slice(1000) { |batch| Brand.insert_all(batch) }
    puts "  ✓ inserted #{rows.size} synthetic :pushed brands across the past 6 months"
  end

  desc "Remove the synthetic brands created by `backfill_marked_ready` (BF-prefixed seller IDs)"
  task clear_backfill: :environment do
    abort "Refusing to run outside development." unless Rails.env.development?
    deleted = Brand.where("amazon_seller_id LIKE 'BF%'").delete_all
    puts "  ✓ deleted #{deleted} synthetic backfill brands"
  end
end
