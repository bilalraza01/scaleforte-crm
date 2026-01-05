# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.1].define(version: 2026_05_01_013455) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "audit_logs", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "brands", force: :cascade do |t|
    t.bigint "campaign_id", null: false
    t.bigint "sdr_id"
    t.string "amazon_seller_id", null: false
    t.string "brand_name"
    t.string "business_name"
    t.decimal "revenue", precision: 12, scale: 2
    t.string "country"
    t.string "website"
    t.string "asin"
    t.string "amazon_link"
    t.string "facebook_url"
    t.string "instagram_url"
    t.string "company_linkedin_url"
    t.integer "status", default: 0, null: false
    t.string "skip_reason"
    t.datetime "pushed_at"
    t.bigint "smartlead_pushed_campaign_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["campaign_id", "amazon_seller_id"], name: "index_brands_on_campaign_id_and_amazon_seller_id", unique: true
    t.index ["campaign_id"], name: "index_brands_on_campaign_id"
    t.index ["sdr_id", "status"], name: "index_brands_on_sdr_id_and_status"
    t.index ["sdr_id"], name: "index_brands_on_sdr_id"
    t.index ["status"], name: "index_brands_on_status"
  end

  create_table "campaign_assignments", force: :cascade do |t|
    t.bigint "campaign_id", null: false
    t.bigint "sdr_id", null: false
    t.integer "target_count", default: 0, null: false
    t.datetime "started_at"
    t.datetime "completed_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["campaign_id", "sdr_id"], name: "index_campaign_assignments_on_campaign_id_and_sdr_id", unique: true
    t.index ["campaign_id"], name: "index_campaign_assignments_on_campaign_id"
    t.index ["sdr_id"], name: "index_campaign_assignments_on_sdr_id"
  end

  create_table "campaigns", force: :cascade do |t|
    t.bigint "category_id", null: false
    t.integer "month", null: false
    t.integer "year", null: false
    t.integer "status", default: 0, null: false
    t.bigint "smartlead_campaign_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["category_id", "year", "month"], name: "index_campaigns_on_category_id_and_year_and_month", unique: true
    t.index ["category_id"], name: "index_campaigns_on_category_id"
    t.index ["status"], name: "index_campaigns_on_status"
  end

  create_table "categories", force: :cascade do |t|
    t.string "name", null: false
    t.string "amazon_url_pattern"
    t.boolean "active", default: true, null: false
    t.bigint "default_smartlead_campaign_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["active"], name: "index_categories_on_active"
    t.index ["name"], name: "index_categories_on_name", unique: true
  end

  create_table "contacts", force: :cascade do |t|
    t.bigint "brand_id", null: false
    t.string "name"
    t.string "designation"
    t.string "email", null: false
    t.string "phone"
    t.string "personal_linkedin"
    t.boolean "is_primary", default: false, null: false
    t.bigint "smartlead_lead_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["brand_id"], name: "index_contacts_on_brand_id"
    t.index ["brand_id"], name: "index_contacts_one_primary_per_brand", unique: true, where: "(is_primary = true)"
    t.index ["email"], name: "index_contacts_on_email"
    t.index ["smartlead_lead_id"], name: "index_contacts_on_smartlead_lead_id", unique: true, where: "(smartlead_lead_id IS NOT NULL)"
  end

  create_table "jwt_denylists", force: :cascade do |t|
    t.string "jti", null: false
    t.datetime "exp", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["jti"], name: "index_jwt_denylists_on_jti", unique: true
  end

  create_table "users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.string "name", default: "", null: false
    t.integer "role", default: 2, null: false
    t.bigint "manager_id"
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "invitation_token"
    t.datetime "invitation_created_at"
    t.datetime "invitation_sent_at"
    t.datetime "invitation_accepted_at"
    t.integer "invitation_limit"
    t.string "invited_by_type"
    t.bigint "invited_by_id"
    t.integer "invitations_count", default: 0
    t.index ["active"], name: "index_users_on_active"
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["invitation_token"], name: "index_users_on_invitation_token", unique: true
    t.index ["invited_by_id"], name: "index_users_on_invited_by_id"
    t.index ["invited_by_type", "invited_by_id"], name: "index_users_on_invited_by"
    t.index ["manager_id"], name: "index_users_on_manager_id"
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
    t.index ["role"], name: "index_users_on_role"
  end

  create_table "versions", force: :cascade do |t|
    t.string "whodunnit"
    t.datetime "created_at"
    t.bigint "item_id", null: false
    t.string "item_type", null: false
    t.string "event", null: false
    t.text "object"
    t.text "object_changes"
    t.index ["item_type", "item_id"], name: "index_versions_on_item_type_and_item_id"
  end

  add_foreign_key "brands", "campaigns"
  add_foreign_key "brands", "users", column: "sdr_id"
  add_foreign_key "campaign_assignments", "campaigns"
  add_foreign_key "campaign_assignments", "users", column: "sdr_id"
  add_foreign_key "campaigns", "categories"
  add_foreign_key "contacts", "brands"
  add_foreign_key "users", "users", column: "manager_id"
end
