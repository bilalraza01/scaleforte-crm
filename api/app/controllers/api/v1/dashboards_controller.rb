module Api
  module V1
    class DashboardsController < ApplicationController
      def sdr
        authorize :dashboard, :sdr?, policy_class: DashboardPolicy
        user_id = current_user.id

        my_brands = Brand.where(sdr_id: user_id)
        today = Time.current.beginning_of_day
        month_start = Time.current.beginning_of_month

        engagement = engagement_stats_for_brands(my_brands)
        recent_replies = EngagementEvent.replies
          .joins(contact: :brand).where(brands: { sdr_id: user_id })
          .order(occurred_at: :desc).limit(10)

        render json: {
          today: {
            completed:   my_brands.where("updated_at >= ?", today).where.not(status: :draft).count,
            ready:       my_brands.ready_status.where("updated_at >= ?", today).count
          },
          month_to_date: {
            completed:   my_brands.where("updated_at >= ?", month_start).where.not(status: :draft).count,
            target:      current_user.campaign_assignments.where("started_at >= ?", month_start).sum(:target_count)
          },
          status_counts: my_brands.group(:status).count,
          engagement:    engagement,
          recent_replies: recent_replies.map { |e| reply_card(e) }
        }
      end

      def manager
        authorize :dashboard, :manager?, policy_class: DashboardPolicy
        team_user_ids = User.where(manager_id: current_user.id).pluck(:id)

        per_sdr = User.where(id: team_user_ids).map do |sdr|
          brands = Brand.where(sdr_id: sdr.id)
          { id: sdr.id,
            name: sdr.display_name,
            mtd_completed: brands.where("updated_at >= ?", Time.current.beginning_of_month).where.not(status: :draft).count,
            drafts: brands.draft_status.count,
            ready: brands.ready_status.count,
            approved_or_pushed: brands.where(status: [:approved, :pushed]).count,
            engagement: engagement_stats_for_brands(brands)
          }
        end

        awaiting_review_count = Brand.ready_status.where(sdr_id: team_user_ids).count

        render json: {
          team_size: team_user_ids.size,
          awaiting_review_count: awaiting_review_count,
          per_sdr: per_sdr
        }
      end

      def admin
        authorize :dashboard, :admin?, policy_class: DashboardPolicy
        month_start = Time.current.beginning_of_month

        per_category = Category.includes(:campaigns).map do |cat|
          campaign_ids = cat.campaigns.pluck(:id)
          brands = Brand.where(campaign_id: campaign_ids)
          { id: cat.id, name: cat.name,
            brands_count: brands.count,
            pushed_count: brands.pushed_status.count,
            engagement:   engagement_stats_for_brands(brands) }
        end

        per_sdr = User.sdr_role.active.map do |sdr|
          brands = Brand.where(sdr_id: sdr.id)
          { id: sdr.id, name: sdr.display_name,
            mtd_completed: brands.where("updated_at >= ?", month_start).where.not(status: :draft).count,
            engagement:    engagement_stats_for_brands(brands) }
        end

        weekly_volume = Brand.where("created_at >= ?", 12.weeks.ago)
          .group("date_trunc('week', created_at)")
          .count
          .transform_keys { |t| t.to_date.iso8601 }

        render json: {
          totals: {
            brands_processed: Brand.count,
            ready:            Brand.ready_status.count,
            approved:         Brand.approved_status.count,
            pushed:           Brand.pushed_status.count,
            replied:          ContactEngagementSummary.where.not(last_replied_at: nil).count,
            bounced:          ContactEngagementSummary.where.not(bounced_at: nil).count
          },
          per_category: per_category,
          per_sdr:      per_sdr,
          weekly_volume: weekly_volume
        }
      end

      private

      # All engagement aggregates roll up to ContactEngagementSummary (kept in
      # sync by ProcessEngagementEventJob) — keeps this dashboard query fast.
      def engagement_stats_for_brands(brand_scope)
        contact_ids = Contact.where(brand_id: brand_scope.select(:id))
        summaries   = ContactEngagementSummary.where(contact_id: contact_ids)
        sent     = summaries.where.not(sent_at: nil).count
        replied  = summaries.where.not(last_replied_at: nil).count
        bounced  = summaries.where.not(bounced_at: nil).count

        {
          sent: sent,
          replied: replied,
          bounced: bounced,
          reply_rate:  pct(replied, sent),
          bounce_rate: pct(bounced, sent)
        }
      end

      def pct(num, denom)
        return 0.0 if denom.to_i.zero?
        ((num.to_f / denom) * 100).round(2)
      end

      def reply_card(event)
        contact = event.contact
        brand   = contact&.brand
        {
          id: event.id,
          occurred_at: event.occurred_at,
          subject: event.reply_subject,
          preview: event.reply_body.to_s.truncate(160),
          brand_name: brand&.brand_name
        }
      end
    end
  end
end
