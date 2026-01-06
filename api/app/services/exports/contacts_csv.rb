require "csv"

# Renders the contacts of a brand collection as a Smartlead-shaped CSV — one
# row per contact, brand fields denormalised onto the row. Mirrors the JSON
# payload produced by Smartlead::PayloadBuilder so the API push and a manual
# CSV upload feed Smartlead with identical merge variables.
module Exports
  class ContactsCsv
    MAX_AUDIT_URLS = 5
    AUDIT_URL_HEADERS = (1..MAX_AUDIT_URLS).map { |i| "audit_url_#{i}" }.freeze

    HEADERS = (%w[
      email
      salutation
      first_name
      last_name
      phone_number
      company_name
      website
      linkedin_profile
      company_url
      brand_name
      amazon_seller_id
      amazon_listing
      asin
      revenue
      country
    ] + AUDIT_URL_HEADERS + %w[
      pain_point_1
      pain_point_2
      pain_point_3
      designation
      is_primary_contact
      sourced_by_sdr
      brand_status
      campaign
    ]).freeze

    def initialize(brands)
      @brands = brands
        .includes(:contacts, :pain_points, :sdr, :campaign,
                  audit_screenshots_attachments: :blob)
    end

    def to_csv
      CSV.generate do |csv|
        csv << HEADERS
        @brands.find_each do |brand|
          brand_fields  = brand_columns(brand)
          brand_contacts = brand.contacts.to_a
          brand_contacts.each do |contact|
            row = contact_columns(contact).merge(brand_fields)
            row["salutation"] = salutation_for(contact, brand_contacts)
            csv << row.values_at(*HEADERS)
          end
        end
      end
    end

    def filename
      "scaleforte-contacts-#{Date.current.iso8601}.csv"
    end

    private

    def brand_columns(brand)
      pp = brand.pain_points.ordered.to_a
      cols = {
        "company_name"     => brand.business_name.presence || brand.brand_name,
        "website"          => brand.website,
        "company_url"      => brand.company_linkedin_url,
        "brand_name"       => brand.brand_name,
        "amazon_seller_id" => brand.amazon_seller_id,
        "amazon_listing"   => brand.amazon_link,
        "asin"             => brand.asin,
        "revenue"          => brand.revenue&.to_s,
        "country"          => brand.country,
        "pain_point_1"     => pp[0]&.description,
        "pain_point_2"     => pp[1]&.description,
        "pain_point_3"     => pp[2]&.description,
        "sourced_by_sdr"   => brand.sdr&.display_name,
        "brand_status"     => brand.status,
        "campaign"         => brand.campaign&.label
      }
      audit_url_columns(brand).each { |k, v| cols[k] = v }
      cols
    end

    # Up to MAX_AUDIT_URLS columns: audit_url_1..5. Slots beyond what the
    # brand actually has stay blank so Smartlead's CSV importer treats them
    # as missing custom fields.
    def audit_url_columns(brand)
      attachments = brand.audit_screenshots.attached? ? brand.audit_screenshots.to_a : []
      AUDIT_URL_HEADERS.each_with_index.map do |header, i|
        [header, attachments[i] ? url_for_attachment(attachments[i]) : nil]
      end.to_h
    end

    def contact_columns(contact)
      first, last = split_name(contact.name)
      {
        "email"              => contact.email,
        "first_name"         => first,
        "last_name"          => last,
        "phone_number"       => format_phone(contact.phone),
        "linkedin_profile"   => contact.personal_linkedin,
        "designation"        => contact.designation,
        "is_primary_contact" => contact.is_primary
      }
    end

    # Phones are stored as strings, but a digit-only cell (e.g. "090078601")
    # gets auto-coerced to a number by Excel/Sheets, dropping the leading 0.
    # Prefixing with a tab forces spreadsheet apps to treat the cell as text;
    # Smartlead and other CSV importers strip whitespace on read so the
    # phone reaches them unchanged.
    def format_phone(raw)
      return nil if raw.blank?
      "\t#{raw}"
    end

    def split_name(name)
      return [nil, nil] if name.blank?
      parts = name.strip.split(/\s+/, 2)
      [parts[0], parts[1]]
    end

    # Falls back through the brand's contacts so a "Hi {{salutation}}" merge
    # always lands on a real name when one exists somewhere on the brand.
    # If nothing's named, "there" gives the email a friendly opener.
    def salutation_for(contact, brand_contacts)
      return contact.name if contact.name.present?
      primary = brand_contacts.find { |c| c.is_primary && c.name.present? }
      return primary.name if primary
      any_named = brand_contacts.find { |c| c.name.present? }
      return any_named.name if any_named
      "there"
    end

    # Direct R2 URL when public; Rails redirect URL otherwise (dev-only).
    def url_for_attachment(attachment)
      blob = attachment.blob
      return blob.url if blob.service.public?

      api_host = URI.parse(ENV.fetch("API_HOST", "http://localhost:3010"))
      Rails.application.routes.url_helpers.rails_blob_url(
        attachment,
        protocol: api_host.scheme,
        host:     api_host.host,
        port:     api_host.port
      )
    end
  end
end
