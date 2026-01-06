# Idempotent dev seeds (production seeding follows the runbook).
#
# Builds out:
#   - 1 admin (admin@scaleforte.local / Password123!)
#   - 2 managers (sara@, omar@)
#   - 10 SDRs, 5 per manager
#   - 6 categories
#   - 6 campaigns (one per category, current month)
#   - CampaignAssignments distributing SDRs across campaigns
#   - 8-12 brands per SDR with 1-4 contacts each, 1-3 pain points, status spread
#   - ContactEngagementSummary rows for ~70% of pushed brands so dashboards
#     show real reply / bounce numbers

return unless Rails.env.development?

require "faker"
Faker::Config.locale = "en"

puts "→ seeding dev data"

# --- Categories (PRD examples) ---------------------------------------------
CATEGORY_NAMES = [
  "Health & Household",
  "Pet Supplies",
  "Beauty & Personal Care",
  "Home & Kitchen",
  "Sports & Outdoors",
  "Grocery & Gourmet Food"
].freeze

categories = CATEGORY_NAMES.map do |name|
  Category.find_or_create_by!(name: name) do |c|
    c.amazon_url_pattern = "amazon.com/s?k=#{name.downcase.gsub(/[^a-z0-9]+/, '+')}"
    c.active = true
  end
end
puts "  ✓ #{categories.size} categories"

# --- Admin -----------------------------------------------------------------
admin = User.find_or_initialize_by(email: "admin@scaleforte.local")
if admin.new_record?
  admin.assign_attributes(
    name: "Osama Khan",
    role: :admin,
    password: "Password123!",
    password_confirmation: "Password123!",
    active: true
  )
  admin.skip_invitation = true
  admin.save!
end
puts "  ✓ admin: #{admin.email}"

# --- Managers --------------------------------------------------------------
manager_specs = [
  { email: "sara@scaleforte.local", name: "Sara Patel" },
  { email: "omar@scaleforte.local", name: "Omar Tariq" }
]

managers = manager_specs.map do |spec|
  m = User.find_or_initialize_by(email: spec[:email])
  if m.new_record?
    m.assign_attributes(
      name: spec[:name],
      role: :manager,
      password: "Password123!",
      password_confirmation: "Password123!",
      active: true
    )
    m.skip_invitation = true
    m.save!
  end
  m
end
puts "  ✓ #{managers.size} managers"

# --- SDRs (5 per manager) --------------------------------------------------
sdr_first_names = %w[Adil Waqar Hira Yousef Faiza Bilal Naila Imran Sania Tariq]
sdrs = managers.flat_map.with_index do |manager, m_idx|
  (0...5).map do |s_idx|
    fname = sdr_first_names[m_idx * 5 + s_idx]
    email = "#{fname.downcase}@scaleforte.local"
    u = User.find_or_initialize_by(email: email)
    if u.new_record?
      u.assign_attributes(
        name: "#{fname} #{Faker::Name.last_name}",
        role: :sdr,
        manager_id: manager.id,
        password: "Password123!",
        password_confirmation: "Password123!",
        active: true
      )
      u.skip_invitation = true
      u.save!
    end
    u
  end
end
puts "  ✓ #{sdrs.size} SDRs"

# --- Campaigns (current month) --------------------------------------------
this_month = Date.current
campaigns = categories.map do |cat|
  Campaign.find_or_create_by!(category_id: cat.id, year: this_month.year, month: this_month.month) do |c|
    c.status = :active
  end
end
puts "  ✓ #{campaigns.size} campaigns (#{Date::MONTHNAMES[this_month.month]} #{this_month.year})"

# --- CampaignAssignments — every SDR gets ~3 categories with 50-150 target -
sdrs.each do |sdr|
  campaigns.sample(3).each do |campaign|
    CampaignAssignment.find_or_create_by!(campaign_id: campaign.id, sdr_id: sdr.id) do |ca|
      ca.target_count = rand(50..150)
      ca.started_at   = 1.month.ago
    end
  end
end
puts "  ✓ campaign assignments"

# --- Brands ----------------------------------------------------------------
# We want a realistic spread: most pushed (so dashboards have engagement data),
# some approved/ready/in_progress, a few drafts and skipped.
STATUS_DISTRIBUTION = [
  [:pushed,      0.55],
  [:approved,    0.10],
  [:ready,       0.08],
  [:in_progress, 0.10],
  [:draft,       0.12],
  [:skipped,     0.05]
].freeze

PAIN_POINT_TEMPLATES = {
  listing_copy: [
    "Title is generic — no benefit-focused bullets.",
    "Bullet points read as feature dump; weak hook.",
    "A+ content missing, blocks brand storytelling."
  ],
  images: [
    "Hero image low-res, no lifestyle imagery.",
    "Only 3 images — under Amazon's 7-image best practice.",
    "Infographics absent; whitespace dominates main image."
  ],
  reviews: [
    "Only 12 reviews in 6 months — review velocity low.",
    "Average rating 3.7; recent 1-stars complain about packaging.",
    "Vine campaign never run."
  ],
  ppc: [
    "No Sponsored Brands campaigns running.",
    "PPC ACoS at 65% — bidding strategy weak.",
    "DSP not enabled."
  ],
  inventory: [
    "Stock-out 4 times this quarter (lost Buy Box).",
    "FBA fees high relative to comp set."
  ],
  pricing: [
    "Priced 12% above category median, no premium positioning.",
    "Coupons / Lightning deals never used."
  ]
}.freeze

def pick_status_with_distribution
  r = rand
  cum = 0.0
  STATUS_DISTRIBUTION.each do |status, weight|
    cum += weight
    return status if r <= cum
  end
  :draft
end

brands_created = 0
contacts_created = 0
pain_points_created = 0
engagement_seeded = 0

sdrs.each do |sdr|
  assignments = CampaignAssignment.where(sdr_id: sdr.id).includes(:campaign).to_a
  next if assignments.empty?

  num_brands = rand(8..12)
  num_brands.times do
    assignment = assignments.sample
    campaign = assignment.campaign
    seller_id = "A#{Faker::Alphanumeric.alphanumeric(number: 12).upcase}"

    next if Brand.exists?(campaign_id: campaign.id, amazon_seller_id: seller_id)

    status = pick_status_with_distribution
    brand_name = Faker::Company.name.gsub(/\s+(LLC|Inc|Group|Ltd)\.?$/, "")
    business_name = "#{brand_name} #{['LLC', 'Inc', 'Co'].sample}"

    brand = Brand.create!(
      campaign_id: campaign.id,
      sdr_id: sdr.id,
      amazon_seller_id: seller_id,
      brand_name: brand_name,
      business_name: business_name,
      revenue: rand(10_000..2_500_000),
      country: ["US", "UK", "CA", "AU"].sample,
      website: "https://#{brand_name.downcase.gsub(/[^a-z0-9]+/, '')}.com",
      asin: "B0#{Faker::Alphanumeric.alphanumeric(number: 8).upcase}",
      amazon_link: "https://amazon.com/dp/B0#{Faker::Alphanumeric.alphanumeric(number: 8).upcase}",
      facebook_url: rand < 0.6 ? "https://facebook.com/#{brand_name.downcase.gsub(/[^a-z]+/, '')}" : nil,
      instagram_url: rand < 0.7 ? "https://instagram.com/#{brand_name.downcase.gsub(/[^a-z]+/, '')}" : nil,
      company_linkedin_url: rand < 0.5 ? "https://linkedin.com/company/#{brand_name.downcase.gsub(/[^a-z]+/, '')}" : nil,
      status: status,
      skip_reason: status == :skipped ? ["out of business", "no email findable", "duplicate"].sample : nil,
      pushed_at: [:pushed].include?(status) ? rand(30.days.ago..Time.current) : nil,
      created_at: rand(60.days.ago..1.day.ago)
    )
    brands_created += 1

    # 1-4 contacts.
    num_contacts = rand(1..4)
    primary_index = rand(num_contacts)
    num_contacts.times do |i|
      contact_first = Faker::Name.first_name
      contact_last  = Faker::Name.last_name
      contact = brand.contacts.create!(
        name: "#{contact_first} #{contact_last}",
        designation: ["CEO", "Founder", "Marketing Director", "Head of Ecommerce", "Brand Manager"].sample,
        email: "#{contact_first.downcase}.#{contact_last.downcase}@#{brand_name.downcase.gsub(/[^a-z]+/, '')}.com",
        phone: rand < 0.4 ? Faker::PhoneNumber.cell_phone : nil,
        personal_linkedin: rand < 0.5 ? "https://linkedin.com/in/#{contact_first.downcase}-#{contact_last.downcase}" : nil,
        is_primary: i == primary_index
      )
      contacts_created += 1

      # Engagement summary for ~70% of pushed-brand primary contacts.
      next unless brand.status == "pushed" && contact.is_primary && rand < 0.7

      sent_at = rand(20.days.ago..2.days.ago)
      summary = ContactEngagementSummary.create!(
        contact_id: contact.id,
        smartlead_lead_id: rand(10000..99999),
        sent_at: sent_at,
        current_status: :sent
      )
      # Roll a state evolution.
      roll = rand
      case
      when roll < 0.05  # bounce
        summary.update!(bounced_at: sent_at + rand(1..30).minutes, current_status: :bounced)
      when roll < 0.10  # unsubscribe
        summary.update!(unsubscribed_at: sent_at + rand(1..3).hours, current_status: :unsubscribed)
      when roll < 0.40  # opened only
        summary.update!(last_opened_at: sent_at + rand(1..48).hours, open_count: rand(1..3), current_status: :opened)
      when roll < 0.50  # opened + replied
        opened_at = sent_at + rand(1..24).hours
        replied_at = opened_at + rand(1..24).hours
        summary.update!(
          last_opened_at: opened_at, open_count: rand(1..3),
          last_replied_at: replied_at, reply_count: 1,
          current_status: :replied,
          reply_classification: [:positive, :info_request, :ooo, :negative].sample
        )
      end
      engagement_seeded += 1
    end

    # 1-3 pain points (only if not draft).
    next if brand.status == "draft"
    num_pp = rand(1..3)
    sampled_categories = PAIN_POINT_TEMPLATES.keys.sample(num_pp)
    sampled_categories.each_with_index do |cat, idx|
      brand.pain_points.create!(
        category: cat,
        description: PAIN_POINT_TEMPLATES[cat].sample,
        display_order: idx
      )
      pain_points_created += 1
    end
  end
end

puts "  ✓ #{brands_created} brands · #{contacts_created} contacts · #{pain_points_created} pain points"
puts "  ✓ #{engagement_seeded} engagement summaries (replies, opens, bounces)"

# --- Unclaimed brands per campaign so SDRs have something to "Start Next" --
unclaimed_created = 0
campaigns.each do |campaign|
  rand(15..30).times do
    seller_id = "A#{Faker::Alphanumeric.alphanumeric(number: 12).upcase}"
    next if Brand.exists?(campaign_id: campaign.id, amazon_seller_id: seller_id)
    brand_name = Faker::Company.name.gsub(/\s+(LLC|Inc|Group|Ltd)\.?$/, "")
    Brand.create!(
      campaign_id: campaign.id,
      sdr_id: nil,                      # unclaimed
      amazon_seller_id: seller_id,
      brand_name: brand_name,
      asin: "B0#{Faker::Alphanumeric.alphanumeric(number: 8).upcase}",
      amazon_link: "https://amazon.com/dp/B0#{Faker::Alphanumeric.alphanumeric(number: 8).upcase}",
      status: :draft,
      created_at: rand(14.days.ago..Time.current)
    )
    unclaimed_created += 1
  end
end
puts "  ✓ #{unclaimed_created} unclaimed brands across #{campaigns.size} campaigns (Start Next Brand)"

# --- A handful of sample replied EngagementEvents so the Replies inbox has
#     something to look at. -----------------------------------------------
replied_summaries = ContactEngagementSummary.where(current_status: :replied).limit(20)
event_id_seed = (EngagementEvent.maximum(:id) || 0) + 1
replied_summaries.each_with_index do |summary, i|
  contact = summary.contact
  brand = contact.brand
  EngagementEvent.find_or_create_by!(smartlead_event_id: "seed_evt_#{event_id_seed + i}") do |e|
    e.smartlead_lead_id = summary.smartlead_lead_id
    e.smartlead_campaign_id = brand.campaign_id
    e.event_type = :replied
    e.occurred_at = summary.last_replied_at
    e.received_at = summary.last_replied_at + 30.seconds
    e.processed_at = summary.last_replied_at + 1.minute
    e.contact = contact
    e.unmatched = false
    e.reply_subject = "Re: Quick question about #{brand.brand_name}'s Amazon listings"
    e.reply_body = [
      "Thanks for the audit — we've actually been thinking about this.\n\nCan you send me a calendar link?",
      "Not interested, please remove from your list.",
      "I'm out of office until next week. Please follow up then.",
      "Could you share more about pricing before we move forward?"
    ].sample
    e.raw_payload = { lead_email: contact.email, mocked: true }
  end
end
puts "  ✓ #{replied_summaries.size} reply events"

puts "→ done"
puts ""
puts "Sign in:"
puts "  admin   → admin@scaleforte.local"
puts "  manager → sara@scaleforte.local, omar@scaleforte.local"
puts "  sdrs    → adil@, waqar@, hira@, yousef@, faiza@, bilal@, naila@, imran@, sania@, tariq@ @scaleforte.local"
puts "Password (all): Password123!"
