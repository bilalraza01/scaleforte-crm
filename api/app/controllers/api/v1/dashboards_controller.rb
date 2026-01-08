module Api
  module V1
    class DashboardsController < ApplicationController
      def sdr
        authorize :dashboard, :sdr?, policy_class: DashboardPolicy
        user_id = current_user.id

        my_brands = Brand.where(sdr_id: user_id)
        today = Time.current.beginning_of_day
        month_start = Time.current.beginning_of_month

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
          recent_replies: recent_replies.map { |e| reply_card(e) }
        }
      end

      def manager
        authorize :dashboard, :manager?, policy_class: DashboardPolicy
        team_user_ids = User.where(manager_id: current_user.id).pluck(:id)
        daily_target  = SystemConfig.current.daily_brand_target

        per_sdr = User.where(id: team_user_ids).map do |sdr|
          brands  = Brand.where(sdr_id: sdr.id)
          periods = marked_ready_periods_for(brands, daily_target)
          { id: sdr.id,
            name: sdr.display_name,
            ready: brands.ready_status.count,
            marked_ready_today:      periods[:today],
            marked_ready_yesterday:  periods[:yesterday],
            marked_ready_last_week:  periods[:last_week],
            marked_ready_last_month: periods[:last_month] }
        end

        awaiting_review_count = Brand.ready_status.where(sdr_id: team_user_ids).count
        team_marked_today     = Brand.where(sdr_id: team_user_ids, marked_ready_at: Time.current.all_day).count
        last_month_wd         = working_days_in_month(Date.current.last_month)

        render json: {
          team_size: team_user_ids.size,
          awaiting_review_count: awaiting_review_count,
          daily_brand_target: daily_target,
          team_marked_ready_today: team_marked_today,
          period_targets: {
            day:   daily_target,
            week:  daily_target * 5,
            month: daily_target * last_month_wd
          },
          per_sdr: per_sdr
        }
      end

      def admin
        authorize :dashboard, :admin?, policy_class: DashboardPolicy
        month_start  = Time.current.beginning_of_month
        daily_target = SystemConfig.current.daily_brand_target

        per_category = Category.includes(:campaigns).map do |cat|
          campaign_ids = cat.campaigns.pluck(:id)
          brands = Brand.where(campaign_id: campaign_ids)
          { id: cat.id, name: cat.name,
            brands_count: brands.count,
            pushed_count: brands.pushed_status.count }
        end

        per_sdr = User.sdr_role.active.map do |sdr|
          brands  = Brand.where(sdr_id: sdr.id)
          periods = marked_ready_periods_for(brands, daily_target)
          { id: sdr.id, name: sdr.display_name,
            marked_ready_today:      periods[:today],
            marked_ready_yesterday:  periods[:yesterday],
            marked_ready_last_week:  periods[:last_week],
            marked_ready_last_month: periods[:last_month] }
        end

        weekly_volume = Brand.where("created_at >= ?", 12.weeks.ago)
          .group("date_trunc('week', created_at)")
          .count
          .transform_keys { |t| t.to_date.iso8601 }

        agency_marked_today = Brand.where(marked_ready_at: Time.current.all_day).count
        last_month_wd       = working_days_in_month(Date.current.last_month)

        render json: {
          totals: {
            brands_processed: Brand.count,
            ready:            Brand.ready_status.count,
            approved:         Brand.approved_status.count,
            pushed:           Brand.pushed_status.count
          },
          today: {
            marked_ready: agency_marked_today,
            daily_target: daily_target,
            sdr_count:    User.sdr_role.active.count,
          },
          period_targets: {
            day:   daily_target,
            week:  daily_target * 5,
            month: daily_target * last_month_wd
          },
          per_category: per_category,
          per_sdr:      per_sdr,
          weekly_volume: weekly_volume
        }
      end

      # GET /api/v1/dashboards/marked_ready_timeseries
      # Per-SDR daily "marked Ready" counts for the chart on the admin /
      # manager dashboards. Period: 7d | 30d | 6m. Optional sdr_ids[]
      # narrows the result; when missing, returns every active SDR a
      # manager/admin can see.
      def marked_ready_timeseries
        # `manager?` permits admin OR manager — both can use the chart.
        authorize :dashboard, :manager?, policy_class: DashboardPolicy

        period = params[:period].to_s.presence || "7d"
        days_back = case period when "30d" then 29 when "6m" then 180 else 6 end
        range_start = days_back.days.ago.to_date
        range_end   = Date.current

        scope_user_ids = team_or_agency_sdr_ids
        requested_ids  = Array(params[:sdr_ids]).map(&:to_i).reject(&:zero?)
        sdr_ids        = requested_ids.any? ? (requested_ids & scope_user_ids) : scope_user_ids

        rows = Brand.where(sdr_id: sdr_ids)
                    .where(marked_ready_at: range_start.beginning_of_day..range_end.end_of_day)
                    .group(:sdr_id, Arel.sql("date_trunc('day', marked_ready_at)::date"))
                    .count

        days  = (range_start..range_end).to_a
        names = User.where(id: sdr_ids).pluck(:id, :name).to_h

        by_sdr = sdr_ids.map do |id|
          counts = days.map { |d| rows[[id, d]] || 0 }
          { id: id, name: names[id] || "Unknown", counts: counts }
        end

        render json: {
          period: period,
          days:   days.map(&:iso8601),
          by_sdr: by_sdr
        }
      end

      private

      # Admin sees every active SDR; Manager sees just their team.
      def team_or_agency_sdr_ids
        if current_user.admin_role?
          User.sdr_role.active.pluck(:id)
        elsif current_user.manager_role?
          User.where(manager_id: current_user.id).sdr_role.active.pluck(:id)
        else
          []
        end
      end

      # ---- Working-day helpers ------------------------------------------
      # We treat Mon–Fri as working days. Holidays aren't tracked yet.

      def working_day?(date)
        date.wday.between?(1, 5)
      end

      def previous_working_day(from = Date.current)
        d = from - 1
        d -= 1 until working_day?(d)
        d
      end

      def last_n_working_days(n, ending_on: Date.current.yesterday)
        days, d = [], ending_on
        while days.size < n
          days.unshift(d) if working_day?(d)
          d -= 1
        end
        days
      end

      def working_days_in_month(any_date_in_month)
        (any_date_in_month.beginning_of_month..any_date_in_month.end_of_month)
          .count { |d| working_day?(d) }
      end

      # Per-SDR daily-target buckets for the dashboard table. All counts
      # are based on Brand#marked_ready_at (set when the AASM mark_ready
      # event fires).
      def marked_ready_periods_for(scope, target)
        today        = Date.current
        yesterday    = previous_working_day(today)
        week_days    = last_n_working_days(5, ending_on: yesterday)
        last_month   = today.last_month
        lm_wd_count  = working_days_in_month(last_month)

        m = scope.where.not(marked_ready_at: nil)
        {
          today:      m.where(marked_ready_at: today.all_day).count,
          yesterday:  m.where(marked_ready_at: yesterday.all_day).count,
          last_week:  m.where(marked_ready_at: week_days.first.beginning_of_day..yesterday.end_of_day).count,
          last_month: m.where(marked_ready_at: last_month.beginning_of_month.beginning_of_day..last_month.end_of_month.end_of_day).count,
          targets: {
            day:   target,
            week:  target * 5,
            month: target * lm_wd_count
          }
        }
      end

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
