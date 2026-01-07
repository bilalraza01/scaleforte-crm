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

# --- Onboarder + Accountant — single user per workspace so the new tier-1
# rail icons have someone to sign in as.
onboarder = User.find_or_initialize_by(email: "olivia@scaleforte.local")
if onboarder.new_record?
  onboarder.assign_attributes(
    name: "Olivia Onboarding", role: :onboarder, active: true,
    password: "Password123!", password_confirmation: "Password123!"
  )
  onboarder.skip_invitation = true
  onboarder.save!
end

accountant = User.find_or_initialize_by(email: "alex@scaleforte.local")
if accountant.new_record?
  accountant.assign_attributes(
    name: "Alex Accounts", role: :accountant, active: true,
    password: "Password123!", password_confirmation: "Password123!"
  )
  accountant.skip_invitation = true
  accountant.save!
end
puts "  ✓ onboarder + accountant"

# --- Workspace access ------------------------------------------------------
# Idempotent: re-seeding sets every user's workspace_access to the role's
# default. Admin overrides applied via the UI later won't be wiped because
# this only runs against the seed-created accounts.
([admin] + managers + sdrs + [onboarder, accountant]).each do |u|
  u.update_column(:workspace_access, WorkspaceDefaults.for(u.role))
end
puts "  ✓ workspace_access set for all seeded users"

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

# --- CategoryAssignments — each SDR works on the categories of the campaigns
# they were assigned to above. Coarser-grained scope: when admin/manager
# adds a brand to a category, every SDR with that category sees it.
sdrs.each do |sdr|
  cat_ids = sdr.campaign_assignments.joins(:campaign).pluck("campaigns.category_id").uniq
  cat_ids.each do |cat_id|
    CategoryAssignment.find_or_create_by!(user_id: sdr.id, category_id: cat_id) do |a|
      a.assigned_by_user = admin
    end
  end
end
puts "  ✓ category assignments"

# --- A handful of subcategories so the worklist filter has something to show.
seed_subs = {
  "Beauty & Personal Care" => %w[Skincare Haircare Fragrance],
  "Health & Household"     => %w[Vitamins Supplements OralCare],
  "Pet Supplies"           => %w[Dogs Cats SmallPets],
}
seed_subs.each do |cat_name, names|
  cat = categories.find { |c| c.name == cat_name }
  next unless cat
  names.each do |n|
    Subcategory.find_or_create_by!(category_id: cat.id, name: n) do |s|
      s.created_by_user = admin
    end
  end
end
puts "  ✓ subcategories"

# --- Brands ----------------------------------------------------------------
# We want a realistic spread: most pushed (so dashboards have engagement data),
# some approved/ready, a chunk of drafts (in_progress merged into draft), and
# a few skipped.
STATUS_DISTRIBUTION = [
  [:pushed,   0.55],
  [:approved, 0.10],
  [:ready,    0.08],
  [:draft,    0.22],
  [:skipped,  0.05]
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
screenshots_attached = 0
unnamed_contacts = 0

# 67-byte transparent 1×1 PNG. Stored on whatever Active Storage service is
# configured (R2 in dev when R2_BUCKET is set, local Disk otherwise) so the
# CSV export's audit_url_1..5 columns have real URLs to look at.
PIXEL_PNG = "\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\b\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82".b

sdrs.each do |sdr|
  assignments = CampaignAssignment.where(sdr_id: sdr.id).includes(:campaign).to_a
  next if assignments.empty?

  num_brands = rand(12..20)
  num_brands.times do
    assignment = assignments.sample
    campaign = assignment.campaign
    seller_id = "A#{Faker::Alphanumeric.alphanumeric(number: 12).upcase}"

    next if Brand.exists?(amazon_seller_id: seller_id)

    status = pick_status_with_distribution
    brand_name = Faker::Company.name.gsub(/\s+(LLC|Inc|Group|Ltd)\.?$/, "")
    business_name = "#{brand_name} #{['LLC', 'Inc', 'Co'].sample}"

    # 70% of brands get a subcategory (only when the campaign's category has
    # any seeded). Mirrors how SDRs use it in practice — most brands tagged,
    # some left at the category level.
    subcategory = nil
    if rand < 0.7
      subcategory = Subcategory.where(category_id: campaign.category_id).sample
    end

    brand = Brand.create!(
      campaign_id: campaign.id,
      sdr_id: sdr.id,
      subcategory_id: subcategory&.id,
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

    # 5% of brands get all-unnamed contacts so the salutation fallback's
    # "there" path actually lights up in the CSV export.
    all_unnamed = rand < 0.05

    # 1-4 contacts.
    num_contacts = rand(1..4)
    primary_index = rand(num_contacts)
    num_contacts.times do |i|
      contact_first = Faker::Name.first_name
      contact_last  = Faker::Name.last_name
      # Otherwise leave 10% of individual contacts nameless — exercises the
      # primary/any-named/there fallback chain on real-looking data.
      named = !all_unnamed && rand >= 0.1
      contact = brand.contacts.create!(
        name: named ? "#{contact_first} #{contact_last}" : nil,
        designation: ["CEO", "Founder", "Marketing Director", "Head of Ecommerce", "Brand Manager"].sample,
        email: named ?
          "#{contact_first.downcase}.#{contact_last.downcase}@#{brand_name.downcase.gsub(/[^a-z]+/, '')}.com" :
          "info+#{i}@#{brand_name.downcase.gsub(/[^a-z]+/, '')}.com",
        phone: rand < 0.4 ? Faker::PhoneNumber.cell_phone : nil,
        personal_linkedin: named && rand < 0.5 ? "https://linkedin.com/in/#{contact_first.downcase}-#{contact_last.downcase}" : nil,
        is_primary: i == primary_index
      )
      contacts_created += 1
      unnamed_contacts += 1 unless named

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
    if brand.status != "draft"
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

    # 30% of brands get audit screenshots — distribution favours 1-2, with a
    # few hitting the 5-image cap so the export's audit_url_1..5 columns are
    # all populated on at least some rows.
    if rand < 0.3
      n_shots = [1, 1, 1, 2, 2, 3, 5].sample
      n_shots.times do |i|
        brand.audit_screenshots.attach(
          io: StringIO.new(PIXEL_PNG.dup),
          filename: "audit-#{brand.id}-#{i + 1}.png",
          content_type: "image/png"
        )
        screenshots_attached += 1
      end
    end
  end
end

puts "  ✓ #{brands_created} brands · #{contacts_created} contacts (#{unnamed_contacts} unnamed) · #{pain_points_created} pain points"
puts "  ✓ #{screenshots_attached} audit screenshots attached"
puts "  ✓ #{engagement_seeded} engagement summaries (replies, opens, bounces)"

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
